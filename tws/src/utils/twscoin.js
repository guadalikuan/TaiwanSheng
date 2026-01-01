/**
 * TWSCoin 相关常量
 */

// TWSCoin 铸造地址（也是 TWS 财库地址）
// 优先使用环境变量 VITE_TWS_COIN_MINT
// 如果未设置，根据环境自动切换（生产环境需手动配置，开发环境使用默认测试币）
const DEFAULT_DEVNET_MINT = 'ZRGboZN3K6JZYhGe8PHDcazwKuqhgp2tTG7h8G5fKGk';
const DEFAULT_MAINNET_MINT = 'ZRGboZN3K6JZYhGe8PHDcazwKuqhgp2tTG7h8G5fKGk';

export const TWSCoin_MINT = import.meta.env.VITE_TWS_COIN_MINT || (
  import.meta.env.MODE === 'production' 
    ? DEFAULT_MAINNET_MINT 
    : DEFAULT_DEVNET_MINT
);

// TWS Coin Decimals
export const TWS_DECIMALS = 6;

// 调试日志，帮助开发者确认当前使用的 Mint 地址和环境
console.log(`[TWSCoin] Environment: ${import.meta.env.MODE}`);
console.log(`[TWSCoin] Active Mint Address: ${TWSCoin_MINT}`);
console.log(`[TWSCoin] Decimals: ${TWS_DECIMALS}`);

/**
 * 格式化 TWSCoin 余额
 * @param {string|number} balance - 余额（最小单位）
 * @param {number} decimals - 小数位数，默认 6
 * @returns {string} 格式化后的余额
 */
export const formatTWSCoinBalance = (balance, decimals = TWS_DECIMALS) => {
  if (!balance) return '0.00';
  const balanceBigInt = BigInt(balance.toString());
  return (Number(balanceBigInt) / Math.pow(10, decimals)).toFixed(2);
};

/**
 * 将 TWSCoin 转换为最小单位
 * @param {number} amount - 数量
 * @param {number} decimals - 小数位数，默认 9
 * @returns {string} 最小单位数量
 */
export const toTWSCoinUnits = (amount, decimals = 9) => {
  return (amount * Math.pow(10, decimals)).toString();
};

/**
 * 计算最低出价（当前价格 + 10%）
 * @param {string|number} currentPrice - 当前价格（最小单位）
 * @param {number} decimals - 小数位数，默认 9
 * @returns {string} 最低出价（格式化后的字符串）
 */
export const calculateMinBid = (currentPrice, decimals = 9) => {
  if (!currentPrice) return '0.00';
  const priceBigInt = BigInt(currentPrice.toString());
  const minRequired = priceBigInt * BigInt(110) / BigInt(100);
  return (Number(minRequired) / Math.pow(10, decimals)).toFixed(2);
};

/**
 * 计算最低出价（原始单位）
 * @param {string|number} currentPrice - 当前价格（最小单位）
 * @returns {string} 最低出价（最小单位）
 */
export const calculateMinBidRaw = (currentPrice) => {
  if (!currentPrice) return '0';
  const priceBigInt = BigInt(currentPrice.toString());
  const minRequired = priceBigInt * BigInt(110) / BigInt(100);
  return minRequired.toString();
};



