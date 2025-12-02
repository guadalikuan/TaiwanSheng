import { ethers } from 'ethers';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 合约ABI（简化版，实际应从编译后的artifacts读取）
const TWS_ASSET_ABI = [
  "function mintBunker(address to, uint256 id, uint256 shares, string memory sectorCode)",
  "function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, string[] memory sectorCodes)",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function getBunkerInfo(uint256 id) view returns (tuple(string sectorCode, uint256 totalShares, uint256 pricePerShare, bool isRedeemed, uint256 mintedAt))",
  "event BunkerMinted(uint256 indexed id, string sectorCode, uint256 shares, address indexed to)",
  "event DoomsdayTriggered(uint256 timestamp)",
  "event UnificationAchieved(uint256 timestamp)"
];

/**
 * 区块链服务类
 */
class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.contractAddress = process.env.CONTRACT_ADDRESS || '';
    this.rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org';
    this.privateKey = process.env.PRIVATE_KEY || '';
    
    this.initialize();
  }

  /**
   * 初始化区块链连接
   */
  initialize() {
    try {
      // 创建provider
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
      
      // 如果有私钥，创建signer
      if (this.privateKey) {
        this.signer = new ethers.Wallet(this.privateKey, this.provider);
      }
      
      // 如果有合约地址，创建合约实例
      if (this.contractAddress) {
        const signerOrProvider = this.signer || this.provider;
        this.contract = new ethers.Contract(
          this.contractAddress,
          TWS_ASSET_ABI,
          signerOrProvider
        );
      }
      
      console.log('✅ 区块链服务初始化成功');
      if (this.contractAddress) {
        console.log('   合约地址:', this.contractAddress);
      }
    } catch (error) {
      console.error('❌ 区块链服务初始化失败:', error);
    }
  }

  /**
   * 检查连接状态
   */
  async checkConnection() {
    try {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }
      const blockNumber = await this.provider.getBlockNumber();
      return { connected: true, blockNumber };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  /**
   * 铸造资产到链上
   * @param {Object} assetData - 资产数据
   * @param {string} toAddress - 接收地址
   * @returns {Promise<Object>} 交易结果
   */
  async mintAsset(assetData, toAddress) {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('Contract or signer not initialized');
      }

      const { sanitized, raw } = assetData;
      
      // 生成Token ID（使用资产ID的hash）
      const tokenId = ethers.id(sanitized.id).slice(0, 10); // 取前10个字符作为ID
      const tokenIdBigInt = BigInt('0x' + tokenId);
      
      // 份额数量（转换为wei单位）
      const shares = BigInt(sanitized.financials?.totalTokens || 0);
      
      // 调用合约mint函数
      const tx = await this.contract.mintBunker(
        toAddress,
        tokenIdBigInt,
        shares,
        sanitized.locationTag || sanitized.codeName
      );
      
      console.log('📝 交易已提交:', tx.hash);
      
      // 等待交易确认
      const receipt = await tx.wait();
      
      console.log('✅ 资产已上链!');
      console.log('   交易哈希:', receipt.hash);
      console.log('   Token ID:', tokenIdBigInt.toString());
      
      return {
        success: true,
        txHash: receipt.hash,
        tokenId: tokenIdBigInt.toString(),
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('❌ 资产上链失败:', error);
      throw error;
    }
  }

  /**
   * 批量铸造资产
   * @param {Array} assetsData - 资产数据数组
   * @param {string} toAddress - 接收地址
   * @returns {Promise<Object>} 交易结果
   */
  async mintBatchAssets(assetsData, toAddress) {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('Contract or signer not initialized');
      }

      const ids = [];
      const amounts = [];
      const sectorCodes = [];

      for (const assetData of assetsData) {
        const { sanitized } = assetData;
        const tokenId = ethers.id(sanitized.id).slice(0, 10);
        const tokenIdBigInt = BigInt('0x' + tokenId);
        const shares = BigInt(sanitized.financials?.totalTokens || 0);
        
        ids.push(tokenIdBigInt);
        amounts.push(shares);
        sectorCodes.push(sanitized.locationTag || sanitized.codeName);
      }

      const tx = await this.contract.mintBatch(
        toAddress,
        ids,
        amounts,
        sectorCodes
      );

      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        count: assetsData.length
      };
    } catch (error) {
      console.error('❌ 批量上链失败:', error);
      throw error;
    }
  }

  /**
   * 查询资产信息
   * @param {string} tokenId - Token ID
   * @returns {Promise<Object>} 资产信息
   */
  async getAssetInfo(tokenId) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const info = await this.contract.getBunkerInfo(tokenId);
      
      return {
        sectorCode: info.sectorCode,
        totalShares: info.totalShares.toString(),
        pricePerShare: info.pricePerShare.toString(),
        isRedeemed: info.isRedeemed,
        mintedAt: new Date(Number(info.mintedAt) * 1000).toISOString()
      };
    } catch (error) {
      console.error('❌ 查询资产信息失败:', error);
      throw error;
    }
  }

  /**
   * 查询地址余额
   * @param {string} address - 钱包地址
   * @param {string} tokenId - Token ID
   * @returns {Promise<string>} 余额
   */
  async getBalance(address, tokenId) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const balance = await this.contract.balanceOf(address, tokenId);
      return balance.toString();
    } catch (error) {
      console.error('❌ 查询余额失败:', error);
      throw error;
    }
  }

  /**
   * 监听链上事件
   * @param {Function} callback - 回调函数
   */
  async listenToEvents(callback) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      // 监听BunkerMinted事件
      this.contract.on('BunkerMinted', (id, sectorCode, shares, to, event) => {
        callback({
          type: 'BunkerMinted',
          id: id.toString(),
          sectorCode,
          shares: shares.toString(),
          to,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber
        });
      });

      // 监听统一事件
      this.contract.on('UnificationAchieved', (timestamp, event) => {
        callback({
          type: 'UnificationAchieved',
          timestamp: new Date(Number(timestamp) * 1000).toISOString(),
          txHash: event.transactionHash,
          blockNumber: event.blockNumber
        });
      });

      console.log('👂 开始监听链上事件...');
    } catch (error) {
      console.error('❌ 监听事件失败:', error);
      throw error;
    }
  }

  /**
   * 停止监听事件
   */
  stopListening() {
    if (this.contract) {
      this.contract.removeAllListeners();
      console.log('🛑 已停止监听链上事件');
    }
  }
}

// 创建单例
const blockchainService = new BlockchainService();

export default blockchainService;

// 导出便捷函数
export const mintAsset = (assetData, toAddress) => 
  blockchainService.mintAsset(assetData, toAddress);

export const getAssetInfo = (tokenId) => 
  blockchainService.getAssetInfo(tokenId);

export const getBalance = (address, tokenId) => 
  blockchainService.getBalance(address, tokenId);

