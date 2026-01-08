/**
 * 代币列表和元数据管理
 * 包含热门代币列表、代币搜索、自定义代币验证等功能
 */

import { TaiOneToken_MINT } from './twscoin.js';
import { SOL_MINT } from './jupiterSwap.js';

// 热门代币列表
export const POPULAR_TOKENS = [
  {
    address: SOL_MINT,
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    tags: ['popular', 'native']
  },
  {
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    tags: ['popular', 'stablecoin']
  },
  {
    address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png',
    tags: ['popular', 'stablecoin']
  },
  {
    address: TaiOneToken_MINT,
    symbol: 'TOT',
    name: 'TaiOneToken',
    decimals: 6,
    logoURI: 'https://via.placeholder.com/32?text=TOT',
    tags: ['popular', 'native']
  },
  {
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    symbol: 'BONK',
    name: 'Bonk',
    decimals: 5,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png',
    tags: ['popular']
  },
  {
    address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    symbol: 'RAY',
    name: 'Raydium',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png',
    tags: ['popular']
  },
  {
    address: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',
    symbol: 'ETH',
    name: 'Ethereum (Wormhole)',
    decimals: 8,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs/logo.png',
    tags: ['popular']
  },
];

/**
 * 获取热门代币列表
 * @returns {Array} 热门代币数组
 */
export const getPopularTokens = () => {
  return POPULAR_TOKENS;
};

/**
 * 通过地址搜索代币
 * @param {string} address - 代币 mint 地址
 * @returns {Object|null} 代币信息，如果未找到返回 null
 */
export const searchTokenByAddress = (address) => {
  if (!address) return null;
  
  const normalizedAddress = address.trim();
  return POPULAR_TOKENS.find(token => 
    token.address.toLowerCase() === normalizedAddress.toLowerCase()
  ) || null;
};

/**
 * 通过符号搜索代币
 * @param {string} symbol - 代币符号
 * @returns {Array} 匹配的代币数组
 */
export const searchTokenBySymbol = (symbol) => {
  if (!symbol) return [];
  
  const normalizedSymbol = symbol.trim().toUpperCase();
  return POPULAR_TOKENS.filter(token => 
    token.symbol.toUpperCase().includes(normalizedSymbol) ||
    token.name.toUpperCase().includes(normalizedSymbol)
  );
};

/**
 * 验证代币地址格式
 * @param {string} address - 代币地址
 * @returns {boolean} 是否为有效的 Solana 地址格式
 */
export const isValidTokenAddress = (address) => {
  if (!address || typeof address !== 'string') return false;
  
  // Solana 地址通常是 base58 编码，长度为 32-44 个字符
  const trimmed = address.trim();
  if (trimmed.length < 32 || trimmed.length > 44) return false;
  
  // 基本格式检查（只包含 base58 字符）
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(trimmed);
};

/**
 * 创建自定义代币对象
 * @param {string} address - 代币 mint 地址
 * @param {number} decimals - 小数位数（默认 6）
 * @returns {Object} 代币对象
 */
export const createCustomToken = (address, decimals = 6) => {
  if (!isValidTokenAddress(address)) {
    throw new Error('无效的代币地址格式');
  }

  return {
    address: address.trim(),
    symbol: address.slice(0, 4).toUpperCase(),
    name: `Custom Token (${address.slice(0, 8)}...)`,
    decimals: decimals,
    logoURI: 'https://via.placeholder.com/32?text=?',
    tags: ['custom']
  };
};

/**
 * 获取代币元数据（尝试从热门列表获取，否则创建自定义代币）
 * @param {string} address - 代币地址
 * @param {number} decimals - 小数位数（如果未找到，使用此值）
 * @returns {Object} 代币元数据
 */
export const getTokenMetadata = async (address, decimals = 6) => {
  // 先从热门列表查找
  const popularToken = searchTokenByAddress(address);
  if (popularToken) {
    return popularToken;
  }

  // 如果地址有效，创建自定义代币对象
  if (isValidTokenAddress(address)) {
    return createCustomToken(address, decimals);
  }

  throw new Error('无效的代币地址');
};

