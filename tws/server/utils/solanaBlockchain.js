// #region agent log
fetch('http://127.0.0.1:7243/ingest/4a4faaed-19c7-42a1-9aa5-d33580d7c144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'utils/solanaBlockchain.js:1',message:'开始导入Solana依赖',data:{moduleResolvePaths:process.env.NODE_PATH||'default',__dirname:import.meta.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
// #endregion
import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/4a4faaed-19c7-42a1-9aa5-d33580d7c144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'utils/solanaBlockchain.js:2',message:'@solana/web3.js导入成功',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion
import { getAssociatedTokenAddress, createTransferInstruction, getAccount } from '@solana/spl-token';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/4a4faaed-19c7-42a1-9aa5-d33580d7c144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'utils/solanaBlockchain.js:3',message:'@solana/spl-token导入成功',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
// #endregion
import anchor from '@coral-xyz/anchor';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/4a4faaed-19c7-42a1-9aa5-d33580d7c144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'utils/solanaBlockchain.js:4',message:'@coral-xyz/anchor导入成功',data:{anchorVersion:anchor?.Program?.version||'loaded'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
// #endregion
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

import config from '../solana.config.js';

// TaiOneToken 铸造地址
const TaiOneToken_MINT = new PublicKey('ZRGboZN3K6JZYhGe8PHDcazwKuqhgp2tTG7h8G5fKGk');
// 向后兼容
const TWSCoin_MINT = TaiOneToken_MINT;

/**
 * Solana 区块链服务类
 */
class SolanaBlockchainService {
  constructor() {
    this.connection = null;
    this.program = null;
    this.programId = null;
    this.wallet = null;
    // 使用统一配置
    this.cluster = config.CLUSTER;
    this.rpcUrl = config.getRpcUrl();
    
    this.initialize();
  }

  /**
   * 初始化 Solana 连接
   */
  async initialize() {
    try {
      // 创建连接
      // 优先使用配置中的 RPC URL，如果为空则使用 clusterApiUrl 或其他默认值
      // 注意: server端 config.getRpcUrl() 已经处理了 process.env.SOLANA_RPC_URL 的读取
      this.connection = new Connection(this.rpcUrl, 'confirmed');
      console.log(`✅ Solana 连接已建立: ${this.cluster}`);
      console.log(`   RPC 端点: ${this.rpcUrl}`);

      // 加载程序 ID
      const deploymentFile = join(__dirname, '../../deployments/solana-' + this.cluster + '.json');
      if (existsSync(deploymentFile)) {
        const deployment = JSON.parse(readFileSync(deploymentFile, 'utf-8'));
        this.programId = new PublicKey(deployment.programId);
        console.log('📦 程序 ID:', this.programId.toString());
      } else {
        console.warn('⚠️  部署信息文件不存在，请先部署程序');
      }

      // 加载 IDL 和程序
      if (this.programId) {
        await this.loadProgram();
      }

      // 加载钱包（如果有私钥）
      if (process.env.SOLANA_PRIVATE_KEY) {
        const privateKey = JSON.parse(process.env.SOLANA_PRIVATE_KEY);
        this.wallet = Keypair.fromSecretKey(Buffer.from(privateKey));
        console.log('💰 钱包已加载:', this.wallet.publicKey.toString());
      }
    } catch (error) {
      console.error('❌ Solana 服务初始化失败:', error);
    }
  }

  /**
   * 加载程序
   */
  async loadProgram() {
    try {
      const idlPath = join(__dirname, '../../target/idl/tws_asset.json');
      if (!existsSync(idlPath)) {
        console.warn('⚠️  IDL 文件不存在，请先构建程序');
        return;
      }

      const idl = JSON.parse(readFileSync(idlPath, 'utf-8'));
      
      if (!this.wallet) {
        console.warn('⚠️  钱包未配置，无法创建程序实例');
        return;
      }

      const provider = new anchor.AnchorProvider(
        this.connection,
        new anchor.Wallet(this.wallet),
        { commitment: 'confirmed' }
      );
      anchor.setProvider(provider);

      this.program = new anchor.Program(idl, this.programId, provider);
      console.log('✅ 程序已加载');
    } catch (error) {
      console.error('❌ 加载程序失败:', error);
    }
  }

  /**
   * 检查连接状态
   */
  async checkConnection() {
    try {
      if (!this.connection) {
        throw new Error('Connection not initialized');
      }
      const slot = await this.connection.getSlot();
      return { connected: true, slot };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  /**
   * 初始化地堡资产账户
   */
  async initializeBunker(bunkerId, sectorCode, totalShares, authority) {
    try {
      if (!this.program) {
        throw new Error('Program not loaded');
      }

      // 计算 PDA
      const [bunkerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('bunker'), Buffer.from(bunkerId.toString().padStart(8, '0'))],
        this.programId
      );

      const tx = await this.program.methods
        .initializeBunker(
          new anchor.BN(bunkerId),
          sectorCode,
          new anchor.BN(totalShares)
        )
        .accounts({
          bunker: bunkerPda,
          twscoinMint: TWSCoin_MINT,
          authority: new PublicKey(authority),
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      return {
        success: true,
        txHash: tx,
        bunkerAddress: bunkerPda.toString(),
      };
    } catch (error) {
      console.error('❌ 初始化地堡失败:', error);
      throw error;
    }
  }

  /**
   * 铸造资产份额
   */
  async mintBunkerShares(bunkerId, amount, userAddress) {
    try {
      if (!this.program) {
        throw new Error('Program not loaded');
      }

      const userPubkey = new PublicKey(userAddress);
      
      // 计算 PDA
      const [bunkerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('bunker'), Buffer.from(bunkerId.toString().padStart(8, '0'))],
        this.programId
      );

      // 获取关联代币账户地址
      const userTokenAccount = await getAssociatedTokenAddress(
        TaiOneToken_MINT,
        userPubkey
      );

      const bunkerTokenAccount = await getAssociatedTokenAddress(
        TaiOneToken_MINT,
        bunkerPda,
        true // allowOwnerOffCurve
      );

      const tx = await this.program.methods
        .mintBunkerShares(new anchor.BN(amount))
        .accounts({
          bunker: bunkerPda,
          twscoinMint: TWSCoin_MINT,
          userTokenAccount: userTokenAccount,
          bunkerTokenAccount: bunkerTokenAccount,
          userAuthority: userPubkey,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .rpc();

      return {
        success: true,
        txHash: tx,
      };
    } catch (error) {
      console.error('❌ 铸造份额失败:', error);
      throw error;
    }
  }

  /**
   * 触发统一事件
   */
  async triggerUnification(bunkerId, authority) {
    try {
      if (!this.program) {
        throw new Error('Program not loaded');
      }

      const [bunkerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('bunker'), Buffer.from(bunkerId.toString().padStart(8, '0'))],
        this.programId
      );

      const tx = await this.program.methods
        .triggerUnification()
        .accounts({
          bunker: bunkerPda,
          authority: new PublicKey(authority),
        })
        .rpc();

      return {
        success: true,
        txHash: tx,
      };
    } catch (error) {
      console.error('❌ 触发统一事件失败:', error);
      throw error;
    }
  }

  /**
   * 赎回资产
   */
  async redeemProperty(bunkerId, amount, userAddress) {
    try {
      if (!this.program) {
        throw new Error('Program not loaded');
      }

      const userPubkey = new PublicKey(userAddress);
      
      const [bunkerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('bunker'), Buffer.from(bunkerId.toString().padStart(8, '0'))],
        this.programId
      );

      const userTokenAccount = await getAssociatedTokenAddress(
        TaiOneToken_MINT,
        userPubkey
      );

      const bunkerTokenAccount = await getAssociatedTokenAddress(
        TaiOneToken_MINT,
        bunkerPda,
        true
      );

      const tx = await this.program.methods
        .redeemProperty(new anchor.BN(amount))
        .accounts({
          bunker: bunkerPda,
          twscoinMint: TWSCoin_MINT,
          userTokenAccount: userTokenAccount,
          bunkerTokenAccount: bunkerTokenAccount,
          userAuthority: userPubkey,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .rpc();

      return {
        success: true,
        txHash: tx,
      };
    } catch (error) {
      console.error('❌ 赎回资产失败:', error);
      throw error;
    }
  }

  /**
   * 查询地堡信息
   */
  async getBunkerInfo(bunkerId) {
    try {
      if (!this.program) {
        throw new Error('Program not loaded');
      }

      const [bunkerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('bunker'), Buffer.from(bunkerId.toString().padStart(8, '0'))],
        this.programId
      );

      const bunkerAccount = await this.program.account.bunker.fetch(bunkerPda);
      
      return {
        authority: bunkerAccount.authority.toString(),
        bunkerId: bunkerAccount.bunkerId.toString(),
        sectorCode: bunkerAccount.sectorCode,
        totalShares: bunkerAccount.totalShares.toString(),
        mintedShares: bunkerAccount.mintedShares.toString(),
        pricePerShare: bunkerAccount.pricePerShare.toString(),
        isRedeemed: bunkerAccount.isRedeemed,
        unificationAchieved: bunkerAccount.unificationAchieved,
        mintedAt: new Date(Number(bunkerAccount.mintedAt) * 1000).toISOString(),
        twscoinMint: bunkerAccount.twscoinMint.toString(),
      };
    } catch (error) {
      console.error('❌ 查询地堡信息失败:', error);
      throw error;
    }
  }

  /**
   * 查询用户 TWSCoin 余额
   */
  async getTWSCoinBalance(userAddress) {
    try {
      if (!this.connection) {
        throw new Error('Connection not initialized');
      }

      const userPubkey = new PublicKey(userAddress);
      const tokenAccount = await getAssociatedTokenAddress(
        TaiOneToken_MINT,
        userPubkey
      );

      try {
        const account = await getAccount(this.connection, tokenAccount);
        return {
          balance: account.amount.toString(),
          decimals: account.mint.toString() === TWSCoin_MINT.toString() ? 9 : 0,
        };
      } catch (error) {
        // 账户不存在，返回 0
        return { balance: '0', decimals: 9 };
      }
    } catch (error) {
      console.error('❌ 查询余额失败:', error);
      throw error;
    }
  }

  /**
   * 投资项目（构建TWSCoin转账交易）
   * @param {string} projectId - 项目ID
   * @param {number} amount - 投资金额（TWSCoin，单位：最小单位，需要乘以10^6）
   * @param {string} investorAddress - 投资者钱包地址
   * @param {string} projectTreasuryAddress - 项目收款地址（PDA）
   * @returns {Promise<Transaction>} 构建好的交易对象（需要用户签名）
   */
  async buildInvestmentTransaction(projectId, amount, investorAddress, projectTreasuryAddress = null) {
    try {
      if (!this.connection) {
        throw new Error('Connection not initialized');
      }

      const investorPubkey = new PublicKey(investorAddress);
      
      // 生成项目收款地址（PDA）
      let treasuryPubkey;
      if (projectTreasuryAddress) {
        treasuryPubkey = new PublicKey(projectTreasuryAddress);
      } else {
        // 如果没有提供，生成基于项目ID的PDA
        const [projectPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('tech_project'), Buffer.from(projectId)],
          this.programId || anchor.web3.SystemProgram.programId
        );
        treasuryPubkey = projectPda;
      }

      // 获取投资者的TWSCoin关联代币账户
      const investorTokenAccount = await getAssociatedTokenAddress(
        TaiOneToken_MINT,
        investorPubkey
      );

      // 获取项目收款账户（如果不存在需要创建）
      const treasuryTokenAccount = await getAssociatedTokenAddress(
        TaiOneToken_MINT,
        treasuryPubkey
      );

      // 构建转账交易
      const transaction = new Transaction();

      // 检查收款账户是否存在，如果不存在需要创建
      try {
        await getAccount(this.connection, treasuryTokenAccount);
      } catch (error) {
        // 账户不存在，需要创建（这里简化处理，实际应该由项目创建者预先创建）
        console.warn('⚠️  项目收款账户不存在，需要先创建');
      }

      // 添加转账指令
      const amountRaw = BigInt(Math.floor(amount * Math.pow(10, 6))); // TaiOneToken有6位小数
      const transferInstruction = createTransferInstruction(
        investorTokenAccount, // 发送方
        treasuryTokenAccount, // 接收方
        investorPubkey, // 授权账户
        amountRaw, // 金额（转换为最小单位）
        [],
        TWSCoin_MINT
      );

      transaction.add(transferInstruction);

      // 设置交易费用支付者
      transaction.feePayer = investorPubkey;

      // 获取最近的区块哈希
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;

      return {
        transaction,
        treasuryAddress: treasuryPubkey.toString(),
        treasuryTokenAccount: treasuryTokenAccount.toString()
      };
    } catch (error) {
      console.error('❌ 构建投资交易失败:', error);
      throw error;
    }
  }

  /**
   * 生成项目收款地址（PDA）
   * @param {string} projectId - 项目ID
   * @returns {Promise<{address: string, tokenAccount: string}>} 项目收款地址和代币账户地址
   */
  async generateProjectTreasury(projectId) {
    try {
      // 生成基于项目ID的PDA
      const [projectPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('tech_project'), Buffer.from(projectId)],
        this.programId || anchor.web3.SystemProgram.programId
      );

      // 获取关联代币账户地址
      const tokenAccount = await getAssociatedTokenAddress(
        TaiOneToken_MINT,
        projectPda
      );

      return {
        address: projectPda.toString(),
        tokenAccount: tokenAccount.toString()
      };
    } catch (error) {
      console.error('❌ 生成项目收款地址失败:', error);
      throw error;
    }
  }

  /**
   * 初始化拍卖资产
   */
  async initializeAuction(assetId, startPrice, tauntMessage, authority, treasury) {
    try {
      if (!this.program) {
        throw new Error('Program not loaded');
      }

      // 计算 PDA
      const [auctionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('auction'), Buffer.from(assetId.toString().padStart(8, '0'))],
        this.programId
      );

      const tx = await this.program.methods
        .initializeAuction(
          new anchor.BN(assetId),
          new anchor.BN(startPrice),
          tauntMessage
        )
        .accounts({
          auction: auctionPda,
          twscoinMint: TWSCoin_MINT,
          treasury: new PublicKey(treasury),
          authority: new PublicKey(authority),
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      return {
        success: true,
        txHash: tx,
        auctionAddress: auctionPda.toString(),
      };
    } catch (error) {
      console.error('❌ 初始化拍卖失败:', error);
      throw error;
    }
  }

  /**
   * 夺取资产（10%溢价机制）
   * @param {number} assetId - 资产ID
   * @param {string} bidMessage - 出价留言
   * @param {string} userAddress - 用户钱包地址
   * @param {string} treasuryAddress - TWS财库地址（可选，默认使用TWSCoin铸造地址）
   */
  async seizeAsset(assetId, bidMessage, userAddress, treasuryAddress = null) {
    try {
      if (!this.program) {
        throw new Error('Program not loaded');
      }

      const userPubkey = new PublicKey(userAddress);
      // TaiOne财库地址就是TaiOneToken的铸造地址
      const treasuryPubkey = treasuryAddress ? new PublicKey(treasuryAddress) : TaiOneToken_MINT;
      
      // 计算 PDA
      const [auctionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('auction'), Buffer.from(assetId.toString().padStart(8, '0'))],
        this.programId
      );

      // 获取拍卖信息以确定当前价格和旧房主
      const auctionAccount = await this.program.account.auctionAsset.fetch(auctionPda);
      const oldOwner = auctionAccount.owner;
      const currentPrice = auctionAccount.price;

      // 计算最低出价（当前价格 * 1.1）
      const minRequired = BigInt(currentPrice.toString()) * BigInt(110) / BigInt(100);

      // 获取关联代币账户地址
      const userTokenAccount = await getAssociatedTokenAddress(
        TaiOneToken_MINT,
        userPubkey
      );

      const oldOwnerTokenAccount = await getAssociatedTokenAddress(
        TaiOneToken_MINT,
        oldOwner
      );

      const treasuryTokenAccount = await getAssociatedTokenAddress(
        TaiOneToken_MINT,
        treasuryPubkey
      );

      const tx = await this.program.methods
        .seizeAsset(bidMessage)
        .accounts({
          auction: auctionPda,
          twscoinMint: TWSCoin_MINT,
          oldOwnerTokenAccount: oldOwnerTokenAccount,
          treasuryTokenAccount: treasuryTokenAccount,
          newOwnerTokenAccount: userTokenAccount,
          newOwner: userPubkey,
          oldOwner: oldOwner,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .rpc();

      return {
        success: true,
        txHash: tx,
        newPrice: minRequired.toString(),
      };
    } catch (error) {
      console.error('❌ 夺取资产失败:', error);
      throw error;
    }
  }

  /**
   * 查询拍卖资产信息
   */
  async getAuctionInfo(assetId) {
    try {
      if (!this.program) {
        throw new Error('Program not loaded');
      }

      const [auctionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('auction'), Buffer.from(assetId.toString().padStart(8, '0'))],
        this.programId
      );

      const auctionAccount = await this.program.account.auctionAsset.fetch(auctionPda);
      
      // 计算最低出价
      const currentPrice = BigInt(auctionAccount.price.toString());
      const minRequired = currentPrice * BigInt(110) / BigInt(100);
      
      return {
        owner: auctionAccount.owner.toString(),
        price: auctionAccount.price.toString(),
        minRequired: minRequired.toString(),
        tauntMessage: auctionAccount.tauntMessage,
        assetId: auctionAccount.assetId.toString(),
        createdAt: new Date(Number(auctionAccount.createdAt) * 1000).toISOString(),
        lastSeizedAt: new Date(Number(auctionAccount.lastSeizedAt) * 1000).toISOString(),
        twscoinMint: auctionAccount.twscoinMint.toString(),
        treasury: auctionAccount.treasury.toString(),
      };
    } catch (error) {
      console.error('❌ 查询拍卖信息失败:', error);
      throw error;
    }
  }
  /**
   * 分发预测市场奖励
   * @param {Array<{wallet: string, amount: number, betId: string}>} distributions
   * @returns {Promise<Array<{wallet: string, success: boolean, txHash: string, error: string}>>}
   */
  async distributePredictionRewards(distributions) {
    if (!this.wallet) {
      throw new Error("Treasury wallet not loaded");
    }

    const results = [];
    
    // 获取财库的 TWS 代币账户
    const sourceTokenAccount = await getAssociatedTokenAddress(
      TWSCoin_MINT,
      this.wallet.publicKey
    );

    console.log(`开始分发奖励，共 ${distributions.length} 笔...`);

    for (const dist of distributions) {
      try {
        const recipientPubkey = new PublicKey(dist.wallet);
        
        // 获取接收者的 TWS 代币账户
        const destinationTokenAccount = await getAssociatedTokenAddress(
          TaiOneToken_MINT,
          recipientPubkey
        );

        // 构建转账交易
        const transaction = new Transaction();
        
        // 注意：这里假设用户参与过预测，因此已经有代币账户。
        // 如果没有，转账会失败。为了简化流程，我们不在此处自动创建账户（因为需要支付 SOL）。
        
        // 转换金额为最小单位 (9位小数)
        const rawAmount = Math.floor(dist.amount * 1_000_000_000);

        transaction.add(
          createTransferInstruction(
            sourceTokenAccount,
            destinationTokenAccount,
            this.wallet.publicKey,
            rawAmount,
            []
          )
        );

        // 发送交易
        const signature = await this.connection.sendTransaction(transaction, [this.wallet]);
        
        // 等待确认
        await this.connection.confirmTransaction(signature);
        
        console.log(`✅ 已分发 ${dist.amount} TWS 到 ${dist.wallet}, Tx: ${signature}`);
        
        results.push({
          wallet: dist.wallet,
          success: true,
          txHash: signature,
          amount: dist.amount
        });
        
      } catch (error) {
        console.error(`❌ 分发失败 ${dist.wallet}:`, error);
        results.push({
          wallet: dist.wallet,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

// 创建单例
const solanaBlockchainService = new SolanaBlockchainService();

// 导出别名以匹配 prediction.js 的引用
export const solanaBlockchain = solanaBlockchainService;

export default solanaBlockchainService;

// 导出便捷函数
export const distributePredictionRewards = (distributions) =>
  solanaBlockchainService.distributePredictionRewards(distributions);

export const initializeBunker = (bunkerId, sectorCode, totalShares, authority) =>
  solanaBlockchainService.initializeBunker(bunkerId, sectorCode, totalShares, authority);

export const mintBunkerShares = (bunkerId, amount, userAddress) =>
  solanaBlockchainService.mintBunkerShares(bunkerId, amount, userAddress);

export const triggerUnification = (bunkerId, authority) =>
  solanaBlockchainService.triggerUnification(bunkerId, authority);

export const redeemProperty = (bunkerId, amount, userAddress) =>
  solanaBlockchainService.redeemProperty(bunkerId, amount, userAddress);

export const getBunkerInfo = (bunkerId) =>
  solanaBlockchainService.getBunkerInfo(bunkerId);

export const getTWSCoinBalance = (userAddress) =>
  solanaBlockchainService.getTWSCoinBalance(userAddress);

export const initializeAuction = (assetId, startPrice, tauntMessage, authority, treasury) =>
  solanaBlockchainService.initializeAuction(assetId, startPrice, tauntMessage, authority, treasury);

export const seizeAsset = (assetId, bidMessage, userAddress, treasuryAddress) =>
  solanaBlockchainService.seizeAsset(assetId, bidMessage, userAddress, treasuryAddress);

export const getAuctionInfo = (assetId) =>
  solanaBlockchainService.getAuctionInfo(assetId);

export const buildInvestmentTransaction = (projectId, amount, investorAddress, projectTreasuryAddress) =>
  solanaBlockchainService.buildInvestmentTransaction(projectId, amount, investorAddress, projectTreasuryAddress);

export const generateProjectTreasury = (projectId) =>
  solanaBlockchainService.generateProjectTreasury(projectId);

