import { ethers } from 'ethers';

/**
 * 生成 BIP39 助记符（12 词）
 * @returns {string} 助记符
 */
export const generateMnemonic = () => {
  return ethers.Wallet.createRandom().mnemonic.phrase;
};

/**
 * 验证助记符
 * @param {string} mnemonic - 助记符
 * @returns {boolean} 是否有效
 */
export const validateMnemonic = (mnemonic) => {
  try {
    return ethers.Mnemonic.isValidMnemonic(mnemonic);
  } catch (error) {
    return false;
  }
};

/**
 * 从助记符获取钱包地址
 * @param {string} mnemonic - 助记符
 * @returns {string} 钱包地址
 */
export const getAddressFromMnemonic = (mnemonic) => {
  try {
    const wallet = ethers.Wallet.fromPhrase(mnemonic);
    return wallet.address;
  } catch (error) {
    throw new Error('Invalid mnemonic');
  }
};

/**
 * 从助记符获取钱包对象
 * @param {string} mnemonic - 助记符
 * @returns {ethers.Wallet} 钱包对象
 */
export const getWalletFromMnemonic = (mnemonic) => {
  try {
    return ethers.Wallet.fromPhrase(mnemonic);
  } catch (error) {
    throw new Error('Invalid mnemonic');
  }
};

/**
 * 验证地址格式
 * @param {string} address - 钱包地址
 * @returns {boolean} 是否有效
 */
export const isValidAddress = (address) => {
  try {
    return ethers.isAddress(address);
  } catch (error) {
    return false;
  }
};

/**
 * 格式化地址（显示前6后4）
 * @param {string} address - 钱包地址
 * @returns {string} 格式化后的地址
 */
export const formatAddress = (address) => {
  if (!address) return '';
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * 投资科技项目（Solana）
 * @param {string} projectId - 项目ID
 * @param {number} amount - 投资金额（TaiOneToken）
 * @param {string} investorAddress - 投资者钱包地址
 * @param {Function} sendTransaction - Solana钱包发送交易函数
 * @param {Connection} connection - Solana连接对象
 * @returns {Promise<string>} 交易签名
 */
export const investInTechProject = async (projectId, amount, investorAddress, sendTransaction, connection) => {
  try {
    // 调用后端API获取交易对象
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    const token = localStorage.getItem('tws_token');
    
    const response = await fetch(`${API_BASE_URL}/api/tech-project/${projectId}/build-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ amount, investorAddress })
    });

    const result = await response.json();
    
    if (!result.success || !result.transaction) {
      throw new Error(result.message || 'Failed to build transaction');
    }

    // 反序列化交易
    const { Transaction } = await import('@solana/web3.js');
    const transaction = Transaction.from(Buffer.from(result.transaction, 'base64'));

    // 使用钱包发送交易（会自动签名）
    const signature = await sendTransaction(transaction, connection);

    // 等待确认
    await connection.confirmTransaction(signature, 'confirmed');

    return signature;
  } catch (error) {
    console.error('Error investing in tech project:', error);
    throw error;
  }
};

