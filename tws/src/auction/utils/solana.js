// Solana 工具函数

import { PublicKey } from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  getAccount, 
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';

/**
 * 获取 TWSCoin Mint 地址
 */
export const getTwsTokenMint = () => {
  const mintAddress = import.meta.env.VITE_TWS_TOKEN_MINT;
  if (!mintAddress) {
    throw new Error('VITE_TWS_TOKEN_MINT 环境变量未设置');
  }
  return new PublicKey(mintAddress);
};

/**
 * 获取 TWSCoin decimals
 */
export const getTwsTokenDecimals = () => {
  return parseInt(import.meta.env.VITE_TWS_TOKEN_DECIMALS || '9', 10);
};

/**
 * 计算最小出价（当前价格 + 10%）
 */
export const calculateMinBid = (currentPrice) => {
  return Math.ceil(currentPrice * 1.1);
};

/**
 * 计算分账金额（基于 Token 数量，不是 lamports）
 * @param {bigint} totalAmount 总金额（Token 数量，已考虑 decimals）
 * @returns {{fee: bigint, payout: bigint}} { fee: TWS 抽水 5%, payout: 上家获得 95% }
 */
export const calculateSplit = (totalAmount) => {
  const fee = totalAmount * BigInt(5) / BigInt(100); // 5% 给 TWS 财库
  const payout = totalAmount - fee; // 95% 退还给上一任持有者
  return { fee, payout };
};

/**
 * 将 Token 数量转换为链上数量（考虑 decimals）
 * @param {number} amount Token 数量（用户看到的数量，如 1000 TWS）
 * @returns {bigint} 链上数量（考虑 decimals 后的实际数量）
 */
export const toTokenAmount = (amount) => {
  const decimals = getTwsTokenDecimals();
  return BigInt(Math.floor(amount * Math.pow(10, decimals)));
};

/**
 * 将链上数量转换为 Token 数量（考虑 decimals）
 * @param {bigint} amount 链上数量
 * @returns {number} Token 数量（用户看到的数量）
 */
export const fromTokenAmount = (amount) => {
  const decimals = getTwsTokenDecimals();
  return Number(amount) / Math.pow(10, decimals);
};

/**
 * 格式化地址（显示前4位和后4位）
 */
export const formatAddress = (address, length = 4) => {
  if (!address || address.length < length * 2) return address;
  return `${address.slice(0, length)}...${address.slice(-length)}`;
};

/**
 * 获取 TWS 财库地址
 */
export const getTreasuryAddress = () => {
  return import.meta.env.VITE_TWS_TREASURY_ADDRESS || '8V77HPB5pWN5tRTPdVncCqYTQCaqyCpWyvHP7eCpdFpB';
};

/**
 * 同步获取用户的 Associated Token Account 地址
 */
export const getUserTokenAccountSync = (userPublicKey, mint) => {
  return getAssociatedTokenAddressSync(mint, userPublicKey);
};

/**
 * 同步获取财库的 Token Account 地址
 */
export const getTreasuryTokenAccountSync = (treasuryPublicKey, mint) => {
  const customAccount = import.meta.env.VITE_TWS_TREASURY_TOKEN_ACCOUNT;
  if (customAccount) {
    return new PublicKey(customAccount);
  }
  return getAssociatedTokenAddressSync(mint, treasuryPublicKey);
};

/**
 * 创建 Associated Token Account 指令（如果不存在）
 */
export const createTokenAccountIfNeeded = async (connection, payer, owner, mint) => {
  const tokenAccount = getUserTokenAccountSync(owner, mint);
  
  try {
    const accountInfo = await connection.getAccountInfo(tokenAccount);
    if (accountInfo) {
      return null; // 账户已存在
    }
  } catch (error) {
    // 账户不存在，继续创建
  }
  
  return createAssociatedTokenAccountInstruction(
    payer,        // 支付账户
    tokenAccount, // Token Account 地址
    owner,        // 拥有者
    mint          // Mint 地址
  );
};

