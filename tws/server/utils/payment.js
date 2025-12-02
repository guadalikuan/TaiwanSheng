import { ethers } from 'ethers';

/**
 * USDT支付服务
 * 支持BSC链上的USDT (BEP-20)
 */

// USDT合约地址（BSC主网）
const USDT_CONTRACT_ADDRESS_BSC = '0x55d398326f99059fF775485246999027B3197955';
// USDT合约地址（BSC测试网）
const USDT_CONTRACT_ADDRESS_TESTNET = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd';

// USDT ABI（简化版，只包含必要函数）
const USDT_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

/**
 * 获取USDT合约地址
 */
const getUSDTAddress = () => {
  const chainId = parseInt(process.env.CHAIN_ID || '56');
  return chainId === 56 
    ? USDT_CONTRACT_ADDRESS_BSC 
    : USDT_CONTRACT_ADDRESS_TESTNET;
};

/**
 * 创建USDT合约实例
 */
const getUSDTContract = (providerOrSigner) => {
  const address = getUSDTAddress();
  return new ethers.Contract(address, USDT_ABI, providerOrSigner);
};

/**
 * 验证USDT转账
 * @param {string} txHash - 交易哈希
 * @param {string} fromAddress - 发送地址
 * @param {string} toAddress - 接收地址
 * @param {string} expectedAmount - 预期金额（USDT，带小数）
 * @returns {Promise<Object>} 验证结果
 */
export const verifyUSDTTransfer = async (txHash, fromAddress, toAddress, expectedAmount) => {
  try {
    const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // 获取交易收据
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      throw new Error('Transaction not found');
    }
    
    // 检查交易状态
    if (receipt.status !== 1) {
      throw new Error('Transaction failed');
    }
    
    // 获取USDT合约实例
    const usdtContract = getUSDTContract(provider);
    
    // 解析Transfer事件
    const transferEvent = usdtContract.interface.parseLog({
      topics: receipt.logs[0].topics,
      data: receipt.logs[0].data
    });
    
    if (transferEvent.name !== 'Transfer') {
      throw new Error('Not a USDT transfer');
    }
    
    const { from, to, value } = transferEvent.args;
    
    // 验证地址和金额
    const expectedAmountWei = ethers.parseUnits(expectedAmount, 18); // USDT有18位小数
    
    if (from.toLowerCase() !== fromAddress.toLowerCase()) {
      throw new Error('From address mismatch');
    }
    
    if (to.toLowerCase() !== toAddress.toLowerCase()) {
      throw new Error('To address mismatch');
    }
    
    if (value.toString() !== expectedAmountWei.toString()) {
      throw new Error('Amount mismatch');
    }
    
    return {
      success: true,
      txHash,
      from: from,
      to: to,
      amount: ethers.formatUnits(value, 18),
      blockNumber: receipt.blockNumber,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('验证USDT转账失败:', error);
    throw error;
  }
};

/**
 * 查询USDT余额
 * @param {string} address - 钱包地址
 * @returns {Promise<string>} 余额（USDT）
 */
export const getUSDTBalance = async (address) => {
  try {
    const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const usdtContract = getUSDTContract(provider);
    
    const balance = await usdtContract.balanceOf(address);
    return ethers.formatUnits(balance, 18);
  } catch (error) {
    console.error('查询USDT余额失败:', error);
    throw error;
  }
};

/**
 * 创建支付订单
 * @param {Object} orderData - 订单数据
 * @returns {Object} 订单信息
 */
export const createPaymentOrder = (orderData) => {
  const {
    userId,
    assetId,
    amount, // USDT金额
    description
  } = orderData;
  
  const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  return {
    orderId,
    userId,
    assetId,
    amount,
    description,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30分钟过期
  };
};

/**
 * 验证支付回调
 * @param {Object} callbackData - 回调数据
 * @returns {Promise<Object>} 验证结果
 */
export const verifyPaymentCallback = async (callbackData) => {
  const { txHash, orderId, fromAddress, toAddress, amount } = callbackData;
  
  try {
    const result = await verifyUSDTTransfer(txHash, fromAddress, toAddress, amount);
    
    return {
      success: true,
      orderId,
      ...result
    };
  } catch (error) {
    return {
      success: false,
      orderId,
      error: error.message
    };
  }
};

