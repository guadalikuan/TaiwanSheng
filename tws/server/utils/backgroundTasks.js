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
import {
  generateMarketTrade,
  updateMarketPrice,
  generateOrderBook,
  generateTaiwanNodeLog,
  generateAssetLog,
  generateKlinePoint
} from './mockDataGenerator.js';
import { startBotScheduler, stopBotScheduler } from './botScheduler.js';

let marketTaskInterval = null;
let taiwanNodeTaskInterval = null;
let assetTaskInterval = null;
let orderBookTaskInterval = null;
let klineTaskInterval = null;

/**
 * 启动Market数据生成任务（每800ms）
 */
const startMarketTask = () => {
  if (marketTaskInterval) return;
  
  marketTaskInterval = setInterval(() => {
    try {
      const marketData = getMarketData();
      if (!marketData) return;
      
      // 更新价格
      const newPrice = updateMarketPrice(marketData.currentPrice || 142.85);
      const priceChange = ((newPrice - (marketData.currentPrice || 142.85)) / (marketData.currentPrice || 142.85)) * 100;
      
      // 生成交易记录
      const trade = generateMarketTrade(newPrice);
      addMarketTrade(trade);
      
      // 更新市场数据
      updateMarketData({
        currentPrice: newPrice,
        priceChange24h: priceChange
      });
    } catch (error) {
      console.error('Market task error:', error);
    }
  }, 800);
  
  console.log('✅ Market background task started (800ms interval)');
};

/**
 * 启动订单簿更新任务（每2秒）
 */
const startOrderBookTask = () => {
  if (orderBookTaskInterval) return;
  
  orderBookTaskInterval = setInterval(() => {
    try {
      const marketData = getMarketData();
      if (!marketData) return;
      
      const orderBook = generateOrderBook(marketData.currentPrice || 142.85);
      updateOrderBook(orderBook);
    } catch (error) {
      console.error('OrderBook task error:', error);
    }
  }, 2000);
  
  console.log('✅ OrderBook background task started (2s interval)');
};

/**
 * 启动K线数据生成任务（每5秒添加一个新数据点）
 */
const startKlineTask = () => {
  if (klineTaskInterval) return;
  
  klineTaskInterval = setInterval(() => {
    try {
      const marketData = getMarketData();
      if (!marketData) return;
      
      const klinePoint = generateKlinePoint(
        marketData.currentPrice || 142.85,
        Date.now()
      );
      addKlinePoint(klinePoint);
    } catch (error) {
      console.error('Kline task error:', error);
    }
  }, 5000);
  
  console.log('✅ Kline background task started (5s interval)');
};

/**
 * 启动台湾节点连接任务（每800ms）
 */
const startTaiwanNodeTask = () => {
  if (taiwanNodeTaskInterval) return;
  
  taiwanNodeTaskInterval = setInterval(() => {
    try {
      // 随机决定是否生成新连接（70%概率）
      if (Math.random() > 0.7) {
        const log = generateTaiwanNodeLog();
        addTaiwanLog(log); // 传递完整日志对象
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
  
  assetTaskInterval = setInterval(() => {
    try {
      // 随机决定是否生成新资产确认（60%概率）
      if (Math.random() > 0.6) {
        const log = generateAssetLog();
        addAssetLog(log); // 传递完整日志对象
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

/**
 * 启动所有后台任务
 */
export const startBackgroundTasks = () => {
  console.log('🚀 Starting background tasks...\n');
  
  startMarketTask();
  startOrderBookTask();
  startKlineTask();
  startTaiwanNodeTask();
  startAssetTask();
  startBotTasks();
  
  console.log('\n✨ All background tasks started successfully!');
};

/**
 * 停止所有后台任务
 */
export const stopBackgroundTasks = () => {
  if (marketTaskInterval) {
    clearInterval(marketTaskInterval);
    marketTaskInterval = null;
  }
  if (orderBookTaskInterval) {
    clearInterval(orderBookTaskInterval);
    orderBookTaskInterval = null;
  }
  if (klineTaskInterval) {
    clearInterval(klineTaskInterval);
    klineTaskInterval = null;
  }
  if (taiwanNodeTaskInterval) {
    clearInterval(taiwanNodeTaskInterval);
    taiwanNodeTaskInterval = null;
  }
  if (assetTaskInterval) {
    clearInterval(assetTaskInterval);
    assetTaskInterval = null;
  }
  
  // 停止机器人任务
  stopBotScheduler();
  
  console.log('🛑 All background tasks stopped');
};

