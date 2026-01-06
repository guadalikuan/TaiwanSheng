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

