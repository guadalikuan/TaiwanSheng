/**
 * 市场数据服务
 * 从 Solana RPC (Helius) 获取交易历史，聚合生成 K 线数据并缓存到 RocksDB
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import config from '../solana.config.js';
import { put, get, getAll, NAMESPACES } from './rocksdb.js';
import { pushUpdate } from './sseManager.js';

// TaiOneToken 配置
const TOKEN_MINT = new PublicKey(config.TAI_ONE_TOKEN.MINT);
const TOKEN_DECIMALS = config.TAI_ONE_TOKEN.DECIMALS;

// Solana 连接
let connection = null;
let lastProcessedSignature = null;
let priceUpdateInterval = null;
let klineUpdateInterval = null;

/**
 * 初始化市场数据服务
 */
export const initializeMarketDataService = async () => {
  try {
    const rpcUrl = config.getRpcUrl();
    connection = new Connection(rpcUrl, 'confirmed');
    console.log(`[MarketData] 初始化市场数据服务，RPC: ${rpcUrl}`);

    // 加载最后处理的交易签名
    const lastSig = await get(NAMESPACES.MARKET_TRANSACTIONS, 'lastSignature');
    if (lastSig) {
      lastProcessedSignature = lastSig;
      console.log(`[MarketData] 最后处理的交易签名: ${lastSig}`);
    }

    // 初始化价格缓存（如果不存在）
    const cachedPrice = await get(NAMESPACES.MARKET_PRICE, 'latest');
    if (!cachedPrice) {
      await updatePriceFromJupiter();
    }

    console.log('✅ 市场数据服务初始化完成');
  } catch (error) {
    console.error('❌ 市场数据服务初始化失败:', error);
  }
};

/**
 * 从 Jupiter API 获取实时价格
 */
export const updatePriceFromJupiter = async () => {
  try {
    const tokenAddress = TOKEN_MINT.toString();
    
    // 添加超时控制（20秒）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20秒超时
    
    try {
      const response = await fetch(`https://price.jup.ag/v3/price?ids=${tokenAddress}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TWS-MarketData/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.data && data.data[tokenAddress]) {
        const tokenData = data.data[tokenAddress];
        const price = parseFloat(tokenData.price) || 0;
        const previousPrice = tokenData.previousPrice ? parseFloat(tokenData.previousPrice) : null;
        const priceChange24h = previousPrice 
          ? ((price - previousPrice) / previousPrice) * 100
          : 0;

        const priceData = {
          price,
          previousPrice,
          priceChange24h,
          timestamp: Date.now(),
          source: 'jupiter'
        };

        // 获取旧价格，检查是否需要推送
        const oldPriceData = await get(NAMESPACES.MARKET_PRICE, 'latest');
        
        // 更新缓存
        await put(NAMESPACES.MARKET_PRICE, 'latest', priceData);

        // 如果价格变化超过0.1%，推送更新
        if (!oldPriceData || Math.abs((price - oldPriceData.price) / oldPriceData.price) > 0.001) {
          pushUpdate('market', 'update', {
            type: 'price',
            ...priceData
          });
        }

        return priceData;
      }

      return null;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // 如果是超时错误，提供更友好的错误信息
      if (fetchError.name === 'AbortError' || fetchError.code === 'UND_ERR_CONNECT_TIMEOUT') {
        console.warn('[MarketData] Jupiter API 请求超时，使用缓存数据');
        // 尝试返回缓存的价格数据
        const cachedPrice = await get(NAMESPACES.MARKET_PRICE, 'latest');
        if (cachedPrice) {
          return cachedPrice;
        }
        throw new Error('Jupiter API 请求超时且无缓存数据');
      }
      
      throw fetchError;
    }
  } catch (error) {
    // 只在开发环境或严重错误时记录详细日志
    if (process.env.NODE_ENV === 'development' || error.message?.includes('无缓存数据')) {
      console.error('[MarketData] 获取Jupiter价格失败:', error.message || error);
    } else {
      console.warn('[MarketData] 获取Jupiter价格失败，使用缓存数据');
    }
    
    // 尝试返回缓存的价格数据
    try {
      const cachedPrice = await get(NAMESPACES.MARKET_PRICE, 'latest');
      if (cachedPrice) {
        return cachedPrice;
      }
    } catch (cacheError) {
      // 忽略缓存读取错误
    }
    
    return null;
  }
};

/**
 * 获取代币关联账户地址
 */
const getTokenAccountAddress = async (ownerAddress) => {
  try {
    const ownerPubkey = new PublicKey(ownerAddress);
    const tokenAccount = await getAssociatedTokenAddress(TOKEN_MINT, ownerPubkey);
    return tokenAccount.toString();
  } catch (error) {
    console.error('[MarketData] 获取关联账户失败:', error);
    return null;
  }
};

/**
 * 从 Helius RPC 获取交易历史
 * 注意：由于代币地址本身不是账户，我们需要查找相关的交易池或使用其他方法
 * 这里先实现一个基础版本，后续可以根据实际情况优化
 */
export const fetchTokenTransactions = async (limit = 100, before = null) => {
  try {
    if (!connection) {
      await initializeMarketDataService();
    }

    // 方法1: 尝试从代币的关联账户获取交易（如果有已知的池地址）
    // 方法2: 使用Jupiter API获取价格（主要数据源）
    // 方法3: 从链上事件日志中查找（需要更复杂的解析）

    // 目前先返回空数组，后续可以根据实际需求实现
    // 如果找到了交易池地址，可以使用以下代码：
    /*
    const poolAddress = new PublicKey('POOL_ADDRESS_HERE');
    const signatures = await connection.getSignaturesForAddress(
      poolAddress,
      {
        limit,
        before: before || undefined
      }
    );
    return signatures;
    */

    return [];
  } catch (error) {
    console.error('[MarketData] 获取交易历史失败:', error);
    return [];
  }
};

/**
 * 从交易中解析价格信息
 * 这需要根据实际的交易格式来解析
 */
export const parseTransactionForPrice = async (txSignature) => {
  try {
    if (!connection) {
      await initializeMarketDataService();
    }

    const tx = await connection.getParsedTransaction(txSignature, {
      maxSupportedTransactionVersion: 0
    });

    if (!tx || tx.meta?.err) {
      return null;
    }

    // 解析交易中的价格信息
    // 这需要根据实际的DEX（如Raydium、Orca）的交易格式来解析
    // 目前返回null，后续实现具体解析逻辑

    return null;
  } catch (error) {
    console.error('[MarketData] 解析交易失败:', error);
    return null;
  }
};

/**
 * 聚合生成 K 线数据
 */
export const aggregateKlineData = (transactions, interval = '1H') => {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  // 按时间间隔分组
  const grouped = {};
  
  transactions.forEach(tx => {
    if (!tx.timestamp || !tx.price) return;

    const date = new Date(tx.timestamp);
    let timeKey;

    switch (interval) {
      case '1m':
        timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
        break;
      case '5m':
        const minute5 = Math.floor(date.getMinutes() / 5) * 5;
        timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}-${String(minute5).padStart(2, '0')}`;
        break;
      case '15m':
        const minute15 = Math.floor(date.getMinutes() / 15) * 15;
        timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}-${String(minute15).padStart(2, '0')}`;
        break;
      case '1H':
        timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}`;
        break;
      case '4H':
        const hour4 = Math.floor(date.getHours() / 4) * 4;
        timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(hour4).padStart(2, '0')}`;
        break;
      case '1D':
        timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        break;
      default:
        timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}`;
    }

    if (!grouped[timeKey]) {
      grouped[timeKey] = [];
    }
    grouped[timeKey].push(tx);
  });

  // 生成 K 线数据
  const klineData = Object.keys(grouped)
    .sort()
    .map(timeKey => {
      const txs = grouped[timeKey].sort((a, b) => a.timestamp - b.timestamp);
      const prices = txs.map(tx => tx.price).filter(p => p > 0);
      const volumes = txs.map(tx => tx.volume || 0);

      if (prices.length === 0) return null;

      return {
        timestamp: txs[0].timestamp,
        open: prices[0],
        close: prices[prices.length - 1],
        high: Math.max(...prices),
        low: Math.min(...prices),
        volume: volumes.reduce((sum, v) => sum + v, 0)
      };
    })
    .filter(item => item !== null);

  return klineData;
};

/**
 * 保存 K 线数据到缓存
 */
export const saveKlineToCache = async (interval, klineData) => {
  try {
    for (const candle of klineData) {
      const key = `${interval}:${candle.timestamp}`;
      await put(NAMESPACES.MARKET_DATA, key, candle);
    }
    console.log(`[MarketData] 保存了 ${klineData.length} 条K线数据 (${interval})`);
  } catch (error) {
    console.error('[MarketData] 保存K线数据失败:', error);
  }
};

/**
 * 从缓存读取 K 线数据
 */
export const getKlineFromCache = async (interval, timeFrom, timeTo) => {
  try {
    const allData = await getAll(NAMESPACES.MARKET_DATA);
    const prefix = `${interval}:`;
    
    const klineData = allData
      .filter(item => item.key.startsWith(prefix))
      .map(item => item.value)
      .filter(candle => {
        const ts = candle.timestamp;
        return ts >= timeFrom && ts <= timeTo;
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    return klineData;
  } catch (error) {
    console.error('[MarketData] 读取K线数据失败:', error);
    return [];
  }
};

/**
 * 获取最新价格
 */
export const getLatestPrice = async () => {
  try {
    const priceData = await get(NAMESPACES.MARKET_PRICE, 'latest');
    if (priceData) {
      return priceData;
    }
    
    // 如果缓存中没有，从Jupiter获取
    return await updatePriceFromJupiter();
  } catch (error) {
    console.error('[MarketData] 获取最新价格失败:', error);
    return null;
  }
};

/**
 * 获取市场统计信息
 */
export const getMarketStats = async () => {
  try {
    const stats = await get(NAMESPACES.MARKET_STATS, 'latest');
    if (stats) {
      return stats;
    }

    // 如果没有缓存，计算24h统计
    const priceData = await getLatestPrice();
    const klineData = await getKlineFromCache('1H', Date.now() - 24 * 3600 * 1000, Date.now());

    const volume24h = klineData.reduce((sum, candle) => sum + (candle.volume || 0), 0);
    const priceChange24h = priceData?.priceChange24h || 0;

    const statsData = {
      volume24h,
      priceChange24h,
      currentPrice: priceData?.price || 0,
      timestamp: Date.now()
    };

    await put(NAMESPACES.MARKET_STATS, 'latest', statsData);
    
    // 推送市场统计更新
    pushUpdate('market', 'update', {
      type: 'stats',
      ...statsData
    });
    
    return statsData;
  } catch (error) {
    console.error('[MarketData] 获取市场统计失败:', error);
    return null;
  }
};

/**
 * 增量更新（只拉取新交易）
 */
export const incrementalUpdate = async () => {
  try {
    // 由于目前没有交易池地址，暂时跳过交易历史获取
    // 主要更新价格数据
    await updatePriceFromJupiter();
    
    // 更新市场统计
    await getMarketStats();
  } catch (error) {
    console.error('[MarketData] 增量更新失败:', error);
  }
};

/**
 * 启动价格更新任务
 */
export const startPriceUpdateTask = () => {
  if (priceUpdateInterval) return;

  priceUpdateInterval = setInterval(async () => {
    await updatePriceFromJupiter();
  }, 10000); // 每10秒更新一次

  console.log('✅ 价格更新任务已启动 (10秒间隔)');
};

/**
 * 停止价格更新任务
 */
export const stopPriceUpdateTask = () => {
  if (priceUpdateInterval) {
    clearInterval(priceUpdateInterval);
    priceUpdateInterval = null;
    console.log('🛑 价格更新任务已停止');
  }
};

/**
 * 启动 K 线更新任务
 */
export const startKlineUpdateTask = () => {
  if (klineUpdateInterval) return;

  klineUpdateInterval = setInterval(async () => {
    await incrementalUpdate();
  }, 60000); // 每1分钟更新一次

  console.log('✅ K线更新任务已启动 (1分钟间隔)');
};

/**
 * 停止 K 线更新任务
 */
export const stopKlineUpdateTask = () => {
  if (klineUpdateInterval) {
    clearInterval(klineUpdateInterval);
    klineUpdateInterval = null;
    console.log('🛑 K线更新任务已停止');
  }
};

export default {
  initializeMarketDataService,
  updatePriceFromJupiter,
  getLatestPrice,
  getMarketStats,
  getKlineFromCache,
  saveKlineToCache,
  incrementalUpdate,
  startPriceUpdateTask,
  stopPriceUpdateTask,
  startKlineUpdateTask,
  stopKlineUpdateTask
};

