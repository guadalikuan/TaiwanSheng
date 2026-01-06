import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';

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
 * 加密私钥或助记符
 * @param {string} data - 要加密的数据（私钥或助记符）
 * @param {string} password - 加密密码
 * @returns {string} 加密后的数据
 */
export const encryptPrivateKey = (data, password) => {
  return CryptoJS.AES.encrypt(data, password).toString();
};

/**
 * 解密私钥或助记符
 * @param {string} encryptedData - 加密的数据
 * @param {string} password - 解密密码
 * @returns {string} 解密后的数据
 */
export const decryptPrivateKey = (encryptedData, password) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, password);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    throw new Error('Decryption failed');
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

