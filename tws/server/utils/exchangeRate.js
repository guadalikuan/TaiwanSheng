/**
 * 汇率计算服务
 * 计算新台币（TWD）到TOT的汇率
 */

import { getLatestPrice } from './marketDataService.js';

// TWD/USD汇率（可以从外部API获取，这里先使用固定值或环境变量）
const TWD_USD_RATE = parseFloat(process.env.TWD_USD_RATE) || 0.032; // 默认约1 TWD = 0.032 USD
const TWD_USD_API_URL = process.env.TWD_USD_API_URL || ''; // 可选的外部API

// 汇率缓存
let cachedRate = {
  totPriceUsd: null,
  twdUsdRate: TWD_USD_RATE,
  twdToTotRate: null,
  timestamp: null
};

const CACHE_DURATION = 60000; // 缓存60秒

/**
 * 从外部API获取TWD/USD汇率
 * @returns {Promise<number>} TWD/USD汇率
 */
async function fetchTwdUsdRate() {
  if (TWD_USD_API_URL) {
    try {
      const response = await fetch(TWD_USD_API_URL, {
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(5000) // 5秒超时
      });
      
      if (response.ok) {
        const data = await response.json();
        // 根据API返回格式解析汇率
        // 这里假设API返回格式为 { rate: 0.032 } 或类似格式
        if (data.rate) {
          return parseFloat(data.rate);
        }
      }
    } catch (error) {
      console.warn('[ExchangeRate] 获取TWD/USD汇率失败，使用默认值:', error.message);
    }
  }
  
  // 使用默认值或环境变量
  return TWD_USD_RATE;
}

/**
 * 获取当前TOT价格（USD）
 * @returns {Promise<number|null>} TOT价格（USD）
 */
async function getTotPriceUsd() {
  try {
    const priceData = await getLatestPrice();
    if (priceData && priceData.price) {
      return parseFloat(priceData.price);
    }
    return null;
  } catch (error) {
    console.error('[ExchangeRate] 获取TOT价格失败:', error);
    return null;
  }
}

/**
 * 计算TWD到TOT的汇率
 * @param {number} totPriceUsd - TOT价格（USD）
 * @param {number} twdUsdRate - TWD/USD汇率
 * @returns {number|null} TWD到TOT的汇率（1 TWD = X TOT）
 */
function calculateTwdToTotRate(totPriceUsd, twdUsdRate) {
  if (!totPriceUsd || totPriceUsd <= 0 || !twdUsdRate || twdUsdRate <= 0) {
    return null;
  }
  
  // 1 TWD = twdUsdRate USD
  // 1 TOT = totPriceUsd USD
  // 所以 1 TWD = (twdUsdRate / totPriceUsd) TOT
  return twdUsdRate / totPriceUsd;
}

/**
 * 获取当前汇率（带缓存）
 * @returns {Promise<Object>} 汇率信息
 */
export async function getExchangeRate() {
  const now = Date.now();
  
  // 检查缓存是否有效
  if (cachedRate.timestamp && (now - cachedRate.timestamp) < CACHE_DURATION) {
    return {
      totPriceUsd: cachedRate.totPriceUsd,
      twdUsdRate: cachedRate.twdUsdRate,
      twdToTotRate: cachedRate.twdToTotRate,
      timestamp: cachedRate.timestamp,
      cached: true
    };
  }
  
  // 获取最新数据
  try {
    const [totPriceUsd, twdUsdRate] = await Promise.all([
      getTotPriceUsd(),
      fetchTwdUsdRate()
    ]);
    
    const twdToTotRate = calculateTwdToTotRate(totPriceUsd, twdUsdRate);
    
    // 更新缓存
    cachedRate = {
      totPriceUsd,
      twdUsdRate,
      twdToTotRate,
      timestamp: now
    };
    
    return {
      totPriceUsd,
      twdUsdRate,
      twdToTotRate,
      timestamp: now,
      cached: false
    };
  } catch (error) {
    console.error('[ExchangeRate] 获取汇率失败:', error);
    
    // 如果获取失败，返回缓存数据（如果有）
    if (cachedRate.twdToTotRate) {
      return {
        ...cachedRate,
        cached: true,
        error: error.message
      };
    }
    
    // 如果连缓存都没有，返回null
    return {
      totPriceUsd: null,
      twdUsdRate: twdUsdRate,
      twdToTotRate: null,
      timestamp: now,
      cached: false,
      error: error.message
    };
  }
}

/**
 * 将TWD金额转换为TOT数量
 * @param {number} twdAmount - 新台币金额
 * @returns {Promise<Object>} 转换结果
 */
export async function convertTwdToTot(twdAmount) {
  if (!twdAmount || twdAmount <= 0) {
    return {
      success: false,
      error: '无效的金额'
    };
  }
  
  try {
    const rateData = await getExchangeRate();
    
    if (!rateData.twdToTotRate) {
      return {
        success: false,
        error: '无法获取汇率，请稍后重试',
        rateData
      };
    }
    
    const totAmount = twdAmount * rateData.twdToTotRate;
    
    return {
      success: true,
      twdAmount,
      totAmount,
      rate: rateData.twdToTotRate,
      totPriceUsd: rateData.totPriceUsd,
      twdUsdRate: rateData.twdUsdRate,
      timestamp: rateData.timestamp
    };
  } catch (error) {
    console.error('[ExchangeRate] 转换失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 将TOT数量转换为TWD金额
 * @param {number} totAmount - TOT数量
 * @returns {Promise<Object>} 转换结果
 */
export async function convertTotToTwd(totAmount) {
  if (!totAmount || totAmount <= 0) {
    return {
      success: false,
      error: '无效的数量'
    };
  }
  
  try {
    const rateData = await getExchangeRate();
    
    if (!rateData.twdToTotRate) {
      return {
        success: false,
        error: '无法获取汇率，请稍后重试',
        rateData
      };
    }
    
    const twdAmount = totAmount / rateData.twdToTotRate;
    
    return {
      success: true,
      totAmount,
      twdAmount,
      rate: rateData.twdToTotRate,
      totPriceUsd: rateData.totPriceUsd,
      twdUsdRate: rateData.twdUsdRate,
      timestamp: rateData.timestamp
    };
  } catch (error) {
    console.error('[ExchangeRate] 转换失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  getExchangeRate,
  convertTwdToTot,
  convertTotToTwd
};

