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

// 加载统一配置
const config = require('../../solana.config.js');

// TWSCoin 铸造地址
const TWSCoin_MINT = new PublicKey('ZRGboZN3K6JZYhGe8PHDcazwKuqhgp2tTG7h8G5fKGk');

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
      this.connection = new Connection(this.rpcUrl, 'confirmed');
      console.log(`✅ Solana 连接已建立: ${this.cluster}`);

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
        TWSCoin_MINT,
        userPubkey
      );

      const bunkerTokenAccount = await getAssociatedTokenAddress(
        TWSCoin_MINT,
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
        TWSCoin_MINT,
        userPubkey
      );

      const bunkerTokenAccount = await getAssociatedTokenAddress(
        TWSCoin_MINT,
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
        TWSCoin_MINT,
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
      // TWS财库地址就是TWSCoin的铸造地址
      const treasuryPubkey = treasuryAddress ? new PublicKey(treasuryAddress) : TWSCoin_MINT;
      
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
        TWSCoin_MINT,
        userPubkey
      );

      const oldOwnerTokenAccount = await getAssociatedTokenAddress(
        TWSCoin_MINT,
        oldOwner
      );

      const treasuryTokenAccount = await getAssociatedTokenAddress(
        TWSCoin_MINT,
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
}

// 创建单例
const solanaBlockchainService = new SolanaBlockchainService();

export default solanaBlockchainService;

// 导出便捷函数
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

