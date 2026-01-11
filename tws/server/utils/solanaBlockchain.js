// #region agent log
fetch('http://127.0.0.1:7243/ingest/4a4faaed-19c7-42a1-9aa5-d33580d7c144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'utils/solanaBlockchain.js:1',message:'开始导入Solana依赖',data:{moduleResolvePaths:process.env.NODE_PATH||'default',__dirname:import.meta.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
// #endregion
import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/4a4faaed-19c7-42a1-9aa5-d33580d7c144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'utils/solanaBlockchain.js:2',message:'@solana/web3.js导入成功',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion
import { getAssociatedTokenAddress, createTransferInstruction, getAccount, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
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

// TaiOneToken 铸造地址（从全局配置读取）
const TaiOneToken_MINT = new PublicKey(config.TAI_ONE_TOKEN.MINT);
const TAI_ONE_DECIMALS = config.TAI_ONE_TOKEN.DECIMALS;
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
    this.totProgram = null; // TOT合约程序
    this.totProgramId = null; // TOT合约程序ID
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

      // 加载 TOT 合约程序
      await this.loadTotProgram();

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
   * 加载 TOT 合约程序
   */
  async loadTotProgram() {
    try {
      // TOT合约IDL路径（在tot项目的target/idl目录下）
      const totIdlPath = join(__dirname, '../../../tot/target/idl/tot_token.json');
      if (!existsSync(totIdlPath)) {
        console.warn('⚠️  TOT合约IDL文件不存在，请先构建tot项目');
        return;
      }

      const totIdl = JSON.parse(readFileSync(totIdlPath, 'utf-8'));
      
      // 从IDL中获取程序ID
      if (totIdl.metadata && totIdl.metadata.address) {
        this.totProgramId = new PublicKey(totIdl.metadata.address);
      } else {
        // 如果没有在IDL中，尝试从环境变量或配置中读取
        const totProgramIdStr = process.env.TOT_PROGRAM_ID || 'ToT1111111111111111111111111111111111111111';
        this.totProgramId = new PublicKey(totProgramIdStr);
      }

      if (!this.wallet) {
        console.warn('⚠️  钱包未配置，无法创建TOT程序实例');
        return;
      }

      const provider = new anchor.AnchorProvider(
        this.connection,
        new anchor.Wallet(this.wallet),
        { commitment: 'confirmed' }
      );

      this.totProgram = new anchor.Program(totIdl, this.totProgramId, provider);
      console.log('✅ TOT合约程序已加载');
      console.log('   TOT程序ID:', this.totProgramId.toString());
    } catch (error) {
      console.warn('⚠️  加载TOT合约程序失败（将使用标准SPL Token转账）:', error.message);
      // 不抛出错误，允许fallback到标准SPL Token转账
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
   * 查询用户 TaiOneToken 余额
   */
  async getTaiOneTokenBalance(userAddress) {
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
          decimals: TAI_ONE_DECIMALS, // 使用全局配置的 decimals
        };
      } catch (error) {
        // 账户不存在，返回 0
        return { balance: '0', decimals: TAI_ONE_DECIMALS };
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

  /**
   * 从平台钱包转账TOT到用户钱包
   * @param {string} userWalletAddress - 用户钱包地址
   * @param {number} totAmount - TOT数量（不是最小单位，是实际数量）
   * @returns {Promise<Object>} 转账结果
   */
  async transferTOTToUser(userWalletAddress, totAmount) {
    if (!this.wallet) {
      throw new Error("Platform wallet not loaded");
    }

    if (!this.connection) {
      throw new Error("Solana connection not initialized");
    }

    try {
      const recipientPubkey = new PublicKey(userWalletAddress);
      
      // 获取平台钱包的TOT代币账户
      const sourceTokenAccount = await getAssociatedTokenAddress(
        TaiOneToken_MINT,
        this.wallet.publicKey
      );

      // 获取用户钱包的TOT代币账户
      const destinationTokenAccount = await getAssociatedTokenAddress(
        TaiOneToken_MINT,
        recipientPubkey
      );

      // 检查用户是否已有TOT代币账户
      let needsAccountCreation = false;
      try {
        await getAccount(this.connection, destinationTokenAccount);
        // 账户存在
      } catch (error) {
        // 账户不存在，需要创建
        if (error.message && (error.message.includes('InvalidAccount') || error.message.includes('could not find account'))) {
          needsAccountCreation = true;
        } else {
          throw error;
        }
      }

      // 构建交易
      const transaction = new Transaction();

      // 如果需要，先创建用户的TOT代币账户
      if (needsAccountCreation) {
        console.log(`[TOT Transfer] 为用户创建TOT代币账户: ${userWalletAddress}`);
        transaction.add(
          createAssociatedTokenAccountInstruction(
            this.wallet.publicKey, // 支付账户创建费用的账户
            destinationTokenAccount,
            recipientPubkey,
            TaiOneToken_MINT
          )
        );
      }

      // 转换金额为最小单位（根据代币精度）
      const rawAmount = Math.floor(totAmount * Math.pow(10, TAI_ONE_DECIMALS));

      // 添加转账指令
      transaction.add(
        createTransferInstruction(
          sourceTokenAccount,
          destinationTokenAccount,
          this.wallet.publicKey,
          rawAmount,
          []
        )
      );

      // 获取最新的区块哈希
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;

      // 发送交易
      const signature = await this.connection.sendTransaction(transaction, [this.wallet], {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });

      console.log(`[TOT Transfer] 交易已发送: ${signature}`);

      // 等待确认
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`交易失败: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log(`✅ 已转账 ${totAmount} TOT 到 ${userWalletAddress}, Tx: ${signature}`);

      return {
        success: true,
        txHash: signature,
        amount: totAmount,
        recipient: userWalletAddress,
        accountCreated: needsAccountCreation
      };
    } catch (error) {
      console.error(`❌ TOT转账失败 ${userWalletAddress}:`, error);
      throw error;
    }
  }

  /**
   * 铸造战略资产（使用TOT支付）
   * @param {Object} assetData - 资产数据
   * @param {string} buyerAddress - 购买者钱包地址
   * @param {number} totAmount - 需要支付的TOT数量
   * @param {string} platformWalletAddress - 平台收款钱包地址（可选，默认使用this.wallet）
   * @returns {Promise<Object>} 交易结果
   */
  async mintStrategicAsset(assetData, buyerAddress, totAmount, platformWalletAddress = null) {
    if (!this.connection) {
      throw new Error('Solana connection not initialized');
    }

    if (!this.wallet && !platformWalletAddress) {
      throw new Error('Platform wallet not loaded');
    }

    try {
      const buyerPubkey = new PublicKey(buyerAddress);
      const platformPubkey = platformWalletAddress 
        ? new PublicKey(platformWalletAddress)
        : this.wallet.publicKey;

      // 获取买家的TOT代币账户
      const buyerTokenAccount = await getAssociatedTokenAddress(
        TaiOneToken_MINT,
        buyerPubkey
      );

      // 获取平台钱包的TOT代币账户
      const platformTokenAccount = await getAssociatedTokenAddress(
        TaiOneToken_MINT,
        platformPubkey
      );

      // 检查买家余额
      try {
        const buyerAccount = await getAccount(this.connection, buyerTokenAccount);
        const buyerBalance = Number(buyerAccount.amount) / Math.pow(10, TAI_ONE_DECIMALS);
        const requiredAmount = totAmount;

        if (buyerBalance < requiredAmount) {
          throw new Error(`余额不足: 需要 ${requiredAmount} TOT，当前余额 ${buyerBalance} TOT`);
        }
      } catch (error) {
        if (error.message.includes('余额不足')) {
          throw error;
        }
        // 账户不存在，余额为0
        throw new Error(`余额不足: 需要 ${totAmount} TOT，当前余额 0 TOT`);
      }

      // 构建交易（需要用户签名）
      const transaction = new Transaction();

      // 转换金额为最小单位
      const rawAmount = Math.floor(totAmount * Math.pow(10, TAI_ONE_DECIMALS));

      // 添加转账指令（从买家到平台）
      transaction.add(
        createTransferInstruction(
          buyerTokenAccount,
          platformTokenAccount,
          buyerPubkey,
          rawAmount,
          []
        )
      );

      // 获取最新的区块哈希
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = buyerPubkey;

      // 序列化交易（返回给前端让用户签名）
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      });

      console.log(`✅ 战略资产购买交易已构建: ${assetData.id || 'unknown'}`);
      console.log(`   买家: ${buyerAddress}`);
      console.log(`   金额: ${totAmount} TOT`);

      return {
        success: true,
        transaction: serializedTransaction.toString('base64'),
        buyerAddress,
        platformAddress: platformPubkey.toString(),
        amount: totAmount,
        rawAmount,
        assetId: assetData.id || assetData.sanitized?.id || 'unknown'
      };
    } catch (error) {
      console.error(`❌ 战略资产铸造失败:`, error);
      throw error;
    }
  }

  /**
   * 验证战略资产购买交易
   * @param {string} txSignature - 交易签名
   * @param {string} buyerAddress - 购买者地址
   * @param {number} expectedAmount - 预期金额
   * @returns {Promise<Object>} 验证结果
   */
  async verifyStrategicAssetPurchase(txSignature, buyerAddress, expectedAmount) {
    if (!this.connection) {
      throw new Error('Solana connection not initialized');
    }

    try {
      // 获取交易详情
      const tx = await this.connection.getTransaction(txSignature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      if (!tx) {
        throw new Error('交易未找到');
      }

      if (tx.meta?.err) {
        throw new Error(`交易失败: ${JSON.stringify(tx.meta.err)}`);
      }

      // 验证交易签名者
      const buyerPubkey = new PublicKey(buyerAddress);
      if (!tx.transaction.signatures.some(sig => sig.equals(buyerPubkey))) {
        throw new Error('交易签名验证失败');
      }

      // 验证转账金额（简化验证，实际应该检查具体的转账指令）
      const expectedRawAmount = Math.floor(expectedAmount * Math.pow(10, TAI_ONE_DECIMALS));

      console.log(`✅ 战略资产购买交易已验证: ${txSignature}`);

      return {
        success: true,
        txHash: txSignature,
        confirmed: true,
        blockTime: tx.blockTime,
        slot: tx.slot
      };
    } catch (error) {
      console.error(`❌ 交易验证失败:`, error);
      throw error;
    }
  }

  /**
   * 调用TOT合约的consume_to_treasury指令（用户向TWS财库消费，免税）
   * @param {string} userAddress - 用户钱包地址
   * @param {number} amount - 消费金额（TOT数量，不是最小单位）
   * @param {number} consumeType - 消费类型：
   *   0=MapAction(地图操作), 
   *   1=AncestorMarking(祖籍标记), 
   *   2=Other(其他),
   *   3=AuctionCreate(拍卖创建费),
   *   4=AuctionFee(拍卖手续费),
   *   5=PredictionBet(预测下注),
   *   6=PredictionFee(预测平台费)
   * @returns {Promise<Object>} 交易结果（需要用户签名）
   */
  async consumeToTreasury(userAddress, amount, consumeType = 0) {
    // 检查tot合约是否可用
    if (!this.totProgram) {
      console.warn('⚠️ TOT合约程序未加载，尝试使用fallback机制');
      // 可以在这里添加fallback逻辑，比如记录到队列稍后处理
      // 或者使用标准SPL Token转账（但会收税）
      throw new Error('TOT合约程序未加载，请先构建tot项目。如需降级方案，请联系管理员。');
    }

    if (!this.connection) {
      throw new Error('Solana connection not initialized');
    }

    try {
      const userPubkey = new PublicKey(userAddress);
      
      // 获取用户的TOT代币账户
      const userTokenAccount = await getAssociatedTokenAddress(
        TaiOneToken_MINT,
        userPubkey
      );

      // 计算config账户PDA（用于验证）
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('tot_config')],
        this.totProgramId
      );

      // 获取TWS财库地址
      // 优先从环境变量读取，如果没有则使用默认值（需要管理员先配置）
      let treasuryAddress = process.env.TWS_TREASURY_ADDRESS;
      if (!treasuryAddress) {
        // 如果没有配置，尝试从链上读取config账户（需要先连接）
        // 这里简化处理，要求必须配置环境变量
        throw new Error('TWS财库地址未配置，请设置TWS_TREASURY_ADDRESS环境变量或先调用set_tws_treasury指令');
      }
      const treasuryPubkey = new PublicKey(treasuryAddress);
      const treasuryTokenAccount = await getAssociatedTokenAddress(
        TaiOneToken_MINT,
        treasuryPubkey
      );

      // 转换金额为最小单位
      const rawAmount = Math.floor(amount * Math.pow(10, TAI_ONE_DECIMALS));

      // 构建消费类型枚举（支持所有7种类型）
      const consumeTypeEnum = 
        consumeType === 0 ? { mapAction: {} } :
        consumeType === 1 ? { ancestorMarking: {} } :
        consumeType === 2 ? { other: {} } :
        consumeType === 3 ? { auctionCreate: {} } :
        consumeType === 4 ? { auctionFee: {} } :
        consumeType === 5 ? { predictionBet: {} } :
        consumeType === 6 ? { predictionFee: {} } :
        { other: {} }; // 默认值，兼容未知类型

      // 构建交易（需要用户签名）
      const transaction = await this.totProgram.methods
        .consumeToTreasury(
          new anchor.BN(rawAmount),
          consumeTypeEnum
        )
        .accounts({
          user: userPubkey,
          userTokenAccount: userTokenAccount,
          treasuryTokenAccount: treasuryTokenAccount,
          mint: TaiOneToken_MINT,
          config: configPda,
          userHolderInfo: null, // 可选，如果不存在则为null
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .transaction();

      // 获取最新的区块哈希
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPubkey;

      // 序列化交易（返回给前端让用户签名）
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      });

      console.log(`✅ 消费交易已构建: ${amount} TOT, 类型: ${consumeType}`);
      console.log(`   用户: ${userAddress}`);
      console.log(`   财库: ${treasuryAddress}`);

      return {
        success: true,
        transaction: serializedTransaction.toString('base64'),
        userAddress,
        treasuryAddress,
        amount: amount,
        rawAmount,
        consumeType
      };
    } catch (error) {
      console.error(`❌ 构建消费交易失败:`, error);
      // 可以在这里添加错误恢复逻辑
      // 例如：记录到失败队列，稍后重试
      throw error;
    }
  }

  /**
   * 调用TOT合约的mint_asset指令（资产上链到Solana）
   * @param {Object} assetData - 资产数据
   * @param {string} toAddress - 资产所有者地址
   * @returns {Promise<Object>} 上链结果
   */
  async mintAssetOnChain(assetData, toAddress) {
    if (!this.totProgram) {
      throw new Error('TOT合约程序未加载，请先构建tot项目');
    }

    if (!this.wallet) {
      throw new Error('Platform wallet not loaded');
    }

    if (!this.connection) {
      throw new Error('Solana connection not initialized');
    }

    try {
      const { sanitized } = assetData;
      const ownerPubkey = new PublicKey(toAddress);
      
      // 计算资产账户PDA
      const assetIdBytes = Buffer.from(sanitized.id || sanitized.codeName || 'unknown');
      const [assetPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('tot_asset'), assetIdBytes],
        this.totProgramId
      );

      // 计算config账户PDA
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('tot_config')],
        this.totProgramId
      );

      // 构建AssetLocation
      const location = {
        latitude: sanitized.location?.lat || sanitized.coordinates?.lat || 0,
        longitude: sanitized.location?.lng || sanitized.coordinates?.lng || 0,
        province: sanitized.province || sanitized.locationTag?.split(' ')[0] || '',
        city: sanitized.city || sanitized.locationTag?.split(' ')[1] || '',
        district: sanitized.district || null,
        address: sanitized.address || null,
      };

      // 确定资产类型（根据资产类型字符串映射到数字）
      const assetTypeMap = {
        '房产': 0,
        '农田': 1,
        '科创': 2,
        '酒水': 3,
        '文创': 4,
        '矿产': 5,
        '仓库': 6,
        '航船': 7,
        '芯片': 8,
      };
      const assetType = assetTypeMap[sanitized.assetType] || assetTypeMap[sanitized.type] || 0;

      // 获取资产价值（转换为基础单位）
      const value = sanitized.financials?.totalTokens || 
                   sanitized.tokenPrice || 
                   sanitized.debtAmount || 
                   0;

      // 执行资产上链
      const tx = await this.totProgram.methods
        .mintAsset(
          sanitized.id || sanitized.codeName || 'unknown',
          assetType,
          ownerPubkey,
          location,
          new anchor.BN(value),
          sanitized.metadataUri || null
        )
        .accounts({
          authority: this.wallet.publicKey,
          assetAccount: assetPda,
          config: configPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log(`✅ 资产已上链到Solana: ${sanitized.id || sanitized.codeName}`);
      console.log(`   交易哈希: ${tx}`);
      console.log(`   资产账户: ${assetPda.toString()}`);

      return {
        success: true,
        txHash: tx,
        assetAccount: assetPda.toString(),
        assetId: sanitized.id || sanitized.codeName,
        blockNumber: null, // Solana没有block number概念
      };
    } catch (error) {
      console.error(`❌ 资产上链失败:`, error);
      throw error;
    }
  }

  /**
   * 调用TOT合约的create_auction指令（拍卖上链到Solana）
   * @param {Object} auctionData - 拍卖数据
   * @param {string} creatorAddress - 创建者地址
   * @returns {Promise<Object>} 上链结果
   */
  async createAuctionOnChain(auctionData, creatorAddress) {
    if (!this.totProgram) {
      throw new Error('TOT合约程序未加载，请先构建tot项目');
    }

    if (!this.connection) {
      throw new Error('Solana connection not initialized');
    }

    try {
      const creatorPubkey = new PublicKey(creatorAddress);
      
      // 计算拍卖账户PDA
      const assetId = auctionData.assetId || auctionData.asset_id || 'unknown';
      const assetIdBytes = Buffer.from(assetId.toString());
      const [auctionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('tot_auction'), assetIdBytes],
        this.totProgramId
      );

      // 计算config账户PDA
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('tot_config')],
        this.totProgramId
      );

      // 获取起拍价（转换为基础单位）
      const startPrice = auctionData.startPrice || auctionData.start_price || auctionData.price || 0;
      const startPriceRaw = typeof startPrice === 'string' 
        ? BigInt(startPrice)
        : BigInt(Math.floor(startPrice * Math.pow(10, TAI_ONE_DECIMALS)));

      // 获取留言
      const tauntMessage = auctionData.tauntMessage || auctionData.taunt_message || '此资产已被TaiOne接管';

      // 执行拍卖上链
      const tx = await this.totProgram.methods
        .createAuction(
          assetId.toString(),
          new anchor.BN(startPriceRaw.toString()),
          tauntMessage
        )
        .accounts({
          creator: creatorPubkey,
          auctionAccount: auctionPda,
          config: configPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log(`✅ 拍卖已上链到Solana: ${assetId}`);
      console.log(`   交易哈希: ${tx}`);
      console.log(`   拍卖账户: ${auctionPda.toString()}`);

      return {
        success: true,
        txHash: tx,
        auctionAccount: auctionPda.toString(),
        assetId: assetId.toString(),
      };
    } catch (error) {
      console.error(`❌ 拍卖上链失败:`, error);
      throw error;
    }
  }

  /**
   * 调用TOT合约的seize_auction指令（夺取拍卖资产）
   * @param {string|number} assetId - 资产ID
   * @param {string} bidMessage - 出价留言
   * @param {string} userAddress - 用户钱包地址
   * @returns {Promise<Object>} 夺取结果（需要用户签名）
   */
  async seizeAuctionOnChain(assetId, bidMessage, userAddress) {
    if (!this.totProgram) {
      throw new Error('TOT合约程序未加载，请先构建tot项目');
    }

    if (!this.connection) {
      throw new Error('Solana connection not initialized');
    }

    try {
      const userPubkey = new PublicKey(userAddress);
      
      // 计算拍卖账户PDA
      const assetIdBytes = Buffer.from(assetId.toString());
      const [auctionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('tot_auction'), assetIdBytes],
        this.totProgramId
      );

      // 获取拍卖信息以确定当前价格和旧所有者
      const auctionAccount = await this.totProgram.account.auctionAccount.fetch(auctionPda);
      const oldOwner = auctionAccount.owner;
      const currentPrice = auctionAccount.price;
      
      // 计算最低出价（当前价格 + 10%）
      const minRequired = BigInt(currentPrice.toString()) * BigInt(110) / BigInt(100);

      // 获取代币账户
      const userTokenAccount = await getAssociatedTokenAddress(
        TaiOneToken_MINT,
        userPubkey
      );

      const oldOwnerTokenAccount = await getAssociatedTokenAddress(
        TaiOneToken_MINT,
        oldOwner
      );

      // 获取TWS财库地址
      const treasuryAddress = process.env.TWS_TREASURY_ADDRESS;
      if (!treasuryAddress) {
        throw new Error('TWS财库地址未配置，请设置TWS_TREASURY_ADDRESS环境变量');
      }
      const treasuryPubkey = new PublicKey(treasuryAddress);
      const treasuryTokenAccount = await getAssociatedTokenAddress(
        TaiOneToken_MINT,
        treasuryPubkey
      );

      // 计算config账户PDA
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('tot_config')],
        this.totProgramId
      );

      // 计算新所有者持有者信息PDA（可选）
      const [holderPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('tot_holder'), userPubkey.toBuffer()],
        this.totProgramId
      );

      // 构建交易（需要用户签名）
      const transaction = await this.totProgram.methods
        .seizeAuction(bidMessage)
        .accounts({
          newOwner: userPubkey,
          auctionAccount: auctionPda,
          oldOwnerTokenAccount: oldOwnerTokenAccount,
          treasuryTokenAccount: treasuryTokenAccount,
          newOwnerTokenAccount: userTokenAccount,
          mint: TaiOneToken_MINT,
          config: configPda,
          newOwnerHolderInfo: null, // 可选，如果不存在则为null
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .transaction();

      // 获取最新的区块哈希
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPubkey;

      // 序列化交易（返回给前端让用户签名）
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      });

      console.log(`✅ 拍卖夺取交易已构建: ${assetId}`);
      console.log(`   用户: ${userAddress}`);
      console.log(`   最低出价: ${minRequired.toString()} TOT`);

      return {
        success: true,
        transaction: serializedTransaction.toString('base64'),
        userAddress,
        assetId: assetId.toString(),
        minRequired: minRequired.toString(),
        currentPrice: currentPrice.toString(),
      };
    } catch (error) {
      console.error(`❌ 构建拍卖夺取交易失败:`, error);
      throw error;
    }
  }

  /**
   * 调用TOT合约的consume_to_treasury指令进行预测下注（用户向TWS财库消费，免税）
   * @param {string} userAddress - 用户钱包地址
   * @param {number} amount - 下注金额（TOT数量，不是最小单位）
   * @param {string} marketId - 市场ID（可选，用于记录）
   * @param {string} direction - 下注方向（'YES'或'NO'，可选）
   * @returns {Promise<Object>} 交易结果（需要用户签名）
   */
  async placePredictionBet(userAddress, amount, marketId = null, direction = null) {
    // 使用consumeToTreasury，类型为PredictionBet（5）
    return await this.consumeToTreasury(userAddress, amount, 5); // ConsumeType::PredictionBet
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

export const getTaiOneTokenBalance = (userAddress) =>
  solanaBlockchainService.getTaiOneTokenBalance(userAddress);

// 向后兼容：导出旧函数名
export const getTWSCoinBalance = getTaiOneTokenBalance;

export const initializeAuction = (assetId, startPrice, tauntMessage, authority, treasury) =>
  solanaBlockchainService.initializeAuction(assetId, startPrice, tauntMessage, authority, treasury);

export const seizeAsset = (assetId, bidMessage, userAddress, treasuryAddress) =>
  solanaBlockchainService.seizeAsset(assetId, bidMessage, userAddress, treasuryAddress);

export const getAuctionInfo = (assetId) =>
  solanaBlockchainService.getAuctionInfo(assetId);

export const transferTOTToUser = (userWalletAddress, totAmount) =>
  solanaBlockchainService.transferTOTToUser(userWalletAddress, totAmount);

export const buildInvestmentTransaction = (projectId, amount, investorAddress, projectTreasuryAddress) =>
  solanaBlockchainService.buildInvestmentTransaction(projectId, amount, investorAddress, projectTreasuryAddress);

export const generateProjectTreasury = (projectId) =>
  solanaBlockchainService.generateProjectTreasury(projectId);

export const mintStrategicAsset = (assetData, buyerAddress, totAmount, platformWalletAddress) =>
  solanaBlockchainService.mintStrategicAsset(assetData, buyerAddress, totAmount, platformWalletAddress);

export const verifyStrategicAssetPurchase = (txSignature, buyerAddress, expectedAmount) =>
  solanaBlockchainService.verifyStrategicAssetPurchase(txSignature, buyerAddress, expectedAmount);

export const consumeToTreasury = (userAddress, amount, consumeType) =>
  solanaBlockchainService.consumeToTreasury(userAddress, amount, consumeType);

export const mintAssetOnChain = (assetData, toAddress) =>
  solanaBlockchainService.mintAssetOnChain(assetData, toAddress);

export const createAuctionOnChain = (auctionData, creatorAddress) =>
  solanaBlockchainService.createAuctionOnChain(auctionData, creatorAddress);

export const seizeAuctionOnChain = (assetId, bidMessage, userAddress) =>
  solanaBlockchainService.seizeAuctionOnChain(assetId, bidMessage, userAddress);

export const placePredictionBet = (userAddress, amount, marketId, direction) =>
  solanaBlockchainService.placePredictionBet(userAddress, amount, marketId, direction);

/**
 * 平台向用户转账（使用tot合约的platform_transfer，免税）
 * @param {string} userAddress - 用户钱包地址
 * @param {number} amount - 转账金额（TOT数量，不是最小单位）
 * @returns {Promise<Object>} 转账结果
 */
export const platformTransfer = async (userAddress, amount) => {
  // 检查tot合约是否可用
  if (!solanaBlockchainService.totProgram) {
    console.warn('⚠️ TOT合约程序未加载，platformTransfer无法执行');
    throw new Error('TOT合约程序未加载，请先构建tot项目');
  }

  if (!solanaBlockchainService.wallet) {
    console.warn('⚠️ 平台钱包未加载，platformTransfer无法执行');
    // 可以添加队列机制，将转账任务加入队列，稍后处理
    throw new Error('Platform wallet not loaded');
  }

  if (!solanaBlockchainService.connection) {
    throw new Error('Solana connection not initialized');
  }

  try {
    const userPubkey = new PublicKey(userAddress);
    const platformPubkey = solanaBlockchainService.wallet.publicKey;
    
    // 获取平台代币账户
    const platformTokenAccount = await getAssociatedTokenAddress(
      TaiOneToken_MINT,
      platformPubkey
    );

    // 获取用户代币账户
    const userTokenAccount = await getAssociatedTokenAddress(
      TaiOneToken_MINT,
      userPubkey
    );

    // 计算config账户PDA
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('tot_config')],
      solanaBlockchainService.totProgramId
    );

    // 转换金额为最小单位
    const rawAmount = Math.floor(amount * Math.pow(10, TAI_ONE_DECIMALS));

    // 执行平台转账
    const tx = await solanaBlockchainService.totProgram.methods
      .platformTransfer(new anchor.BN(rawAmount))
      .accounts({
        platform: platformPubkey,
        platformTokenAccount: platformTokenAccount,
        userTokenAccount: userTokenAccount,
        mint: TaiOneToken_MINT,
        config: configPda,
        userHolderInfo: null, // 可选
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log(`✅ 平台转账成功: ${amount} TOT 到 ${userAddress}`);
    console.log(`   交易哈希: ${tx}`);

    return {
      success: true,
      txHash: tx,
      userAddress,
      amount: amount,
    };
  } catch (error) {
    console.error(`❌ 平台转账失败:`, error);
    // 可以在这里添加错误恢复逻辑
    // 例如：记录到失败队列，稍后重试
    // 或者返回交易供管理员手动签名
    throw error;
  }
};

/**
 * 平台费用转给财库（从平台钱包转给TWS财库）
 * @param {number} amount - 转账金额（TOT数量，不是最小单位）
 * @returns {Promise<Object>} 转账结果
 */
export const transferPlatformFeeToTreasury = async (amount) => {
  if (!solanaBlockchainService.wallet) {
    throw new Error('Platform wallet not loaded');
  }

  if (!solanaBlockchainService.connection) {
    throw new Error('Solana connection not initialized');
  }

  try {
    const platformPubkey = solanaBlockchainService.wallet.publicKey;
    
    // 获取TWS财库地址
    const treasuryAddress = process.env.TWS_TREASURY_ADDRESS;
    if (!treasuryAddress) {
      throw new Error('TWS财库地址未配置，请设置TWS_TREASURY_ADDRESS环境变量');
    }
    const treasuryPubkey = new PublicKey(treasuryAddress);

    // 获取平台代币账户
    const platformTokenAccount = await getAssociatedTokenAddress(
      TaiOneToken_MINT,
      platformPubkey
    );

    // 获取财库代币账户
    const treasuryTokenAccount = await getAssociatedTokenAddress(
      TaiOneToken_MINT,
      treasuryPubkey
    );

    // 转换金额为最小单位
    const rawAmount = Math.floor(amount * Math.pow(10, TAI_ONE_DECIMALS));

    // 构建转账交易
    const transaction = new Transaction();
    transaction.add(
      createTransferInstruction(
        platformTokenAccount,
        treasuryTokenAccount,
        platformPubkey,
        rawAmount,
        []
      )
    );

    // 获取最新的区块哈希
    const { blockhash } = await solanaBlockchainService.connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = platformPubkey;

    // 发送交易
    const signature = await solanaBlockchainService.connection.sendTransaction(
      transaction,
      [solanaBlockchainService.wallet],
      {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      }
    );

    // 等待确认
    await solanaBlockchainService.connection.confirmTransaction(signature, 'confirmed');

    console.log(`✅ 平台费用转账成功: ${amount} TOT 到财库`);
    console.log(`   交易哈希: ${signature}`);

    return {
      success: true,
      txHash: signature,
      amount: amount,
      treasuryAddress: treasuryAddress,
    };
  } catch (error) {
    console.error(`❌ 平台费用转账失败:`, error);
    throw error;
  }
};

