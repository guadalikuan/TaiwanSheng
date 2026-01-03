import {
  getMarketData,
  updateMarketData,
  addMarketTrade,
  updateOrderBook,
  getMapData,
  updateMapData,
  addTaiwanLog,
  addAssetLog,
  addKlinePoint
} from './homepageStorage.js';
import { pushUpdate } from './sseManager.js';
import {
  generateMarketTrade,
  updateMarketPrice,
  generateOrderBook,
  generateTaiwanNodeLog,
  generateAssetLog,
  generateKlinePoint
} from './mockDataGenerator.js';
import { 
  getCurrentPrice, 
  getOrderBook, 
  getRecentTrades,
  matchOrders,
  calculate24hPriceChange,
  calculate24hVolume
} from './orderMatchingEngine.js';
import { startBotScheduler, stopBotScheduler } from './botScheduler.js';

let marketTaskInterval = null;
let taiwanNodeTaskInterval = null;
let assetTaskInterval = null;
let orderBookTaskInterval = null;
let klineTaskInterval = null;

/**
 * 启动Market数据生成任务（每350ms，约每秒3次）
 * 现在基于订单撮合引擎的成交记录更新价格
 */
const startMarketTask = () => {
  if (marketTaskInterval) return;
  
  marketTaskInterval = setInterval(async () => {
    try {
      // 尝试撮合订单（机器人提交的订单会被撮合）
      await matchOrders();
      
      // 从订单撮合引擎获取当前价格
      const currentPrice = await getCurrentPrice();
      
      if (currentPrice !== null) {
        // 计算24小时价格变化和成交量
        const priceChange24h = await calculate24hPriceChange(currentPrice);
        const volume24h = await calculate24hVolume();
        
        // 更新市场数据
      await updateMarketData({
        currentPrice: currentPrice,
        priceChange24h: priceChange24h,
        volume24h: volume24h
      });
      
      // 推送 SSE 更新
      pushUpdate('market', 'update', {
        currentPrice,
        priceChange24h,
        volume24h
      });
    } else {
      // 如果没有成交记录，使用默认价格（首次启动时）
      const marketData = await getMarketData();
      if (marketData && !marketData.currentPrice) {
        await updateMarketData({
          currentPrice: 142.85,
          priceChange24h: 0,
          volume24h: 0
        });
      }
    }
  } catch (error) {
    console.error('Market task error:', error);
  }
}, 350);

console.log('✅ Market background task started (350ms interval, ~3 updates/sec)');
};

/**
* 启动订单簿更新任务（每2秒）
* 现在直接从订单撮合引擎获取订单簿
*/
const startOrderBookTask = () => {
if (orderBookTaskInterval) return;

orderBookTaskInterval = setInterval(async () => {
  try {
    // 从订单撮合引擎获取订单簿
    const orderBook = getOrderBook(10);
    
    // 更新到存储（用于兼容性）
    await updateOrderBook(orderBook);
    
    // 推送 SSE 更新
    pushUpdate('market', 'update', {
      orderBook
    });
  } catch (error) {
    console.error('OrderBook task error:', error);
  }
}, 2000);

console.log('✅ OrderBook background task started (2s interval)');
};

/**
 * 启动K线数据生成任务（每1.5秒添加一个新数据点）
 * 现在基于实际成交记录生成K线数据
 */
const startKlineTask = () => {
  if (klineTaskInterval) return;
  
  let lastKlineTime = Date.now();
  let lastKlinePrice = null;
  
  klineTaskInterval = setInterval(async () => {
    try {
      // 获取最近1.5秒内的成交记录
      const recentTrades = await getRecentTrades(100);
      const now = Date.now();
      const timeWindow = 1500; // 1.5秒
      const windowStart = now - timeWindow;
      
      // 筛选出时间窗口内的成交记录
      // getRecentTrades返回的是倒序（最新在前），需要按时间正序排序
      const windowTrades = recentTrades
        .filter(t => t && t.timestamp && t.timestamp >= windowStart)
        .sort((a, b) => a.timestamp - b.timestamp); // 按时间正序排序
        
      if (windowTrades.length > 0) {
        // 基于实际成交记录生成K线数据点
        const prices = windowTrades.map(t => {
          const price = typeof t.price === 'number' ? t.price : parseFloat(t.price) || 0;
          return isNaN(price) || !isFinite(price) ? 0 : price;
        }).filter(p => p > 0);
        
        const volumes = windowTrades.map(t => {
          const amount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
          return isNaN(amount) || !isFinite(amount) ? 0 : amount;
        });
        
        if (prices.length > 0) {
          const open = lastKlinePrice || prices[0]; // 第一个价格（时间最早）
          const close = prices[prices.length - 1]; // 最后一个价格（时间最晚）
          const high = Math.max(...prices);
          const low = Math.min(...prices);
          const volume = volumes.reduce((sum, v) => sum + v, 0);
        
          const klinePoint = {
            timestamp: now,
            open: open,
            high: high,
            low: low,
            close: close,
            volume: volume
          };
          
          await addKlinePoint(klinePoint);
          lastKlinePrice = close;
          lastKlineTime = now;
          
          // 推送 SSE 更新（增量）
          pushUpdate('market', 'incremental', {
            klinePoint
          });
        }
      } else {
        // 如果没有成交记录，使用当前价格生成一个数据点
        const currentPrice = getCurrentPrice();
        if (currentPrice !== null) {
          const klinePoint = {
            timestamp: now,
            open: currentPrice,
            high: currentPrice,
            low: currentPrice,
            close: currentPrice,
            volume: 0
          };
          await addKlinePoint(klinePoint);
          lastKlinePrice = currentPrice;
          
          // 推送 SSE 更新（增量）
          pushUpdate('market', 'incremental', {
            klinePoint
          });
        }
      }
    } catch (error) {
      console.error('Kline task error:', error);
    }
  }, 1500);
  
  console.log('✅ Kline background task started (1.5s interval, based on actual trades)');
};

/**
 * 启动台湾节点连接任务（每800ms）
 */
const startTaiwanNodeTask = () => {
  if (taiwanNodeTaskInterval) return;
  
  taiwanNodeTaskInterval = setInterval(async () => {
    try {
      // 随机决定是否生成新连接（70%概率）
      if (Math.random() > 0.7) {
        const log = generateTaiwanNodeLog();
        await addTaiwanLog(log); // 传递完整日志对象
        // addTaiwanLog 内部会推送 SSE 更新
      }
    } catch (error) {
      console.error('Taiwan node task error:', error);
    }
  }, 800);
  
  console.log('✅ Taiwan node background task started (800ms interval)');
};

/**
 * 启动资产确认任务（每600ms）
 */
const startAssetTask = () => {
  if (assetTaskInterval) return;
  
  assetTaskInterval = setInterval(async () => {
    try {
      // 随机决定是否生成新资产确认（60%概率）
      if (Math.random() > 0.6) {
        const log = await generateAssetLog();
        await addAssetLog(log); // 传递完整日志对象
        // addAssetLog 内部会推送 SSE 更新
      }
    } catch (error) {
      console.error('Asset task error:', error);
    }
  }, 600);
  
  console.log('✅ Asset background task started (600ms interval)');
};

/**
 * 启动机器人任务
 */
const startBotTasks = () => {
  // 启动机器人调度器
  startBotScheduler();
  console.log('✅ Bot tasks started');
};

// 启动后台任务
export const startBackgroundTasks = () => {
  console.log('🚀 Starting background tasks...');
  
  // 仅保留真实数据相关的任务（如需）
  // 目前没有真实数据后台任务，所有模拟任务均已禁用
  
  console.log('✅ Background tasks initialized (REAL DATA MODE)');
};

// 停止后台任务
export const stopBackgroundTasks = () => {
  console.log('🛑 Stopping background tasks...');
  // 清理逻辑（如果需要）
};

