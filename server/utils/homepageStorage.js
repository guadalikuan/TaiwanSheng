import { pushUpdate } from './sseManager.js';
import { Homepage } from '../models/Schemas.js';
import { 
  getCurrentPrice, 
  calculate24hPriceChange, 
  calculate24hVolume,
  getOrderBook,
  getRecentTrades,
  calculateVWAP
} from './orderMatchingEngine.js';
import { getBotUserStats } from './botUserManager.js';
import { getTargetTime, getTimeData } from './timeManager.js';

// 内存缓存，减少数据库读取频率
let cachedHomepageData = null;
let saveTimeout = null;

// 获取默认数据
const getDefaultData = () => {
  return {
    omega: {
      etuTargetTime: Date.now() + 1000 * 60 * 60 * 24 * 600,
      riskPremium: 142.5,
      events: [],
      alertMessage: '⚠ SYSTEM ALERT: GEOPOLITICAL TENSION RISING'
    },
    market: {
      currentPrice: 142.85,
      priceChange24h: 12.4,
      volume24h: 4291002911,
      marketIndex: 'STRONG BUY',
      klineData: [],
      orderBook: { asks: [], bids: [] },
      recentTrades: []
    },
    map: {
      taiwan: { nodeCount: 12458, logs: [] },
      mainland: { assetPoolValue: 1425000000, unitCount: 42109, logs: [] },
      blockHeight: '8922104'
    }
  };
};

// 初始化缓存
const initCache = async () => {
  try {
    const doc = await Homepage.getSingleton();
    // 转换为普通对象
    cachedHomepageData = doc.toObject();
    // 移除 mongoose 特有字段
    delete cachedHomepageData._id;
    delete cachedHomepageData.__v;
    delete cachedHomepageData.createdAt;
    delete cachedHomepageData.updatedAt;
  } catch (error) {
    console.warn('Failed to load Homepage from DB, using default:', error.message);
    cachedHomepageData = getDefaultData();
  }
};

// 异步保存（防抖）
const triggerSave = () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  
  saveTimeout = setTimeout(async () => {
    try {
      const doc = await Homepage.findOne();
      if (doc && cachedHomepageData) {
        // 更新字段
        doc.omega = cachedHomepageData.omega;
        doc.market = cachedHomepageData.market;
        doc.map = cachedHomepageData.map;
        await doc.save();
        // console.log('💾 Homepage data synced to DB');
      }
    } catch (error) {
      console.error('Failed to sync Homepage to DB:', error.message);
    }
  }, 2000); // 2秒延迟，避免高频写入
};

// 读取首页数据
const readHomepageData = () => {
  if (!cachedHomepageData) {
    // 如果缓存为空（可能还未初始化完成），返回默认数据
    // 注意：如果是首次启动，initCache 正在运行，这里暂时返回默认值
    return getDefaultData(); 
  }
  return cachedHomepageData;
};

// 写入首页数据
const writeHomepageData = (data) => {
  cachedHomepageData = data;
  triggerSave();
  return true;
};

// 导出初始化函数供 server.js 调用
export const initHomepageStorage = async () => {
  await initCache();
  console.log('🏠 Homepage storage initialized from DB');
};

/**
 * 计算ETU目标时间
 */
const calculateETUTargetTime = async (baseTargetTime) => {
  return getTargetTime();
};

/**
 * 计算风险溢价
 */
const calculateRiskPremium = async () => {
  try {
    let priceChange24h = 0;
    let volume24h = 0;
    let currentPrice = null;
    
    try {
      currentPrice = getCurrentPrice();
      if (currentPrice !== null) {
        priceChange24h = calculate24hPriceChange(currentPrice);
        volume24h = calculate24hVolume();
      }
    } catch (error) {}
    
    let botStats = { active: 0 };
    try { botStats = getBotUserStats(); } catch (error) {}
    
    const basePremium = 100.0;
    const volatilityImpact = Math.abs(priceChange24h) * 2;
    const volumeImpact = -Math.min(volume24h / 100000000, 20);
    const userImpact = -Math.min(botStats.active / 5, 10);

    let tensionImpact = 0;
    try {
      const timeData = await getTimeData();
      if (timeData && timeData.history) {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const recentAdjustments = timeData.history.filter(h => h.timestamp > oneDayAgo);
        const totalAdjustmentMs = recentAdjustments.reduce((sum, h) => sum + h.adjustment, 0);
        
        if (totalAdjustmentMs < 0) {
          const daysAccelerated = Math.abs(totalAdjustmentMs) / (24 * 60 * 60 * 1000);
          tensionImpact = Math.min(daysAccelerated * 5, 50);
        } else if (totalAdjustmentMs > 0) {
          const daysDelayed = totalAdjustmentMs / (24 * 60 * 60 * 1000);
          tensionImpact = -Math.min(daysDelayed * 2, 20);
        }
      }
    } catch (error) {}
    
    const finalPremium = basePremium + volatilityImpact + volumeImpact + userImpact + tensionImpact;
    return Math.max(50, Math.min(200, finalPremium));
  } catch (error) {
    return 142.5;
  }
};

/**
 * 获取Omega屏数据
 */
export const getOmegaData = async () => {
  const data = readHomepageData();
  const omega = data?.omega || getDefaultData().omega;
  
  const dynamicETUTargetTime = await calculateETUTargetTime();
  const dynamicRiskPremium = await calculateRiskPremium();
  
  return {
    ...omega,
    etuTargetTime: dynamicETUTargetTime,
    riskPremium: dynamicRiskPremium
  };
};

/**
 * 更新Omega数据
 */
export const updateOmegaData = (updates) => {
  const data = readHomepageData();
  if (!data) return null;
  
  data.omega = {
    ...data.omega,
    ...updates,
    updatedAt: Date.now()
  };
  
  if (writeHomepageData(data)) {
    pushUpdate('omega', 'update', {
      riskPremium: data.omega.riskPremium,
      etuTargetTime: data.omega.etuTargetTime,
      alertMessage: data.omega.alertMessage,
      events: data.omega.events
    });
    return data.omega;
  }
  return null;
};

/**
 * 添加Omega事件
 */
export const addOmegaEvent = (text, impact = 'NEUTRAL') => {
  const data = readHomepageData();
  if (!data) return null;
  
  const newEvent = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    text,
    impact,
    timestamp: Date.now()
  };
  
  data.omega.events = [newEvent, ...(data.omega.events || [])].slice(0, 8);
  
  if (writeHomepageData(data)) {
    pushUpdate('omega', 'incremental', {
      type: 'event',
      event: newEvent,
      events: data.omega.events
    });
    return newEvent;
  }
  return null;
};

/**
 * 获取Market屏数据
 */
export const getMarketData = () => {
  const data = readHomepageData();
  
  let currentPrice = null;
  let priceChange24h = 0;
  let volume24h = 0;
  let vwap24h = null;
  let orderBook = { asks: [], bids: [] };
  let recentTrades = [];
  
  try {
    currentPrice = getCurrentPrice();
    if (currentPrice !== null) {
      priceChange24h = calculate24hPriceChange(currentPrice);
      volume24h = calculate24hVolume();
      vwap24h = calculateVWAP(86400000);
    }
    orderBook = getOrderBook(10) || { asks: [], bids: [] };
    recentTrades = getRecentTrades(10) || [];
  } catch (error) {}
  
  const storedMarket = data?.market || getDefaultData().market;
  
  let formattedTrades = storedMarket.recentTrades || [];
  if (recentTrades.length > 0) {
    formattedTrades = recentTrades.map(trade => ({
      id: trade.id || `trade_${Date.now()}`,
      price: Number(trade.price).toFixed(2),
      amount: Number(trade.amount).toFixed(4),
      type: trade.buyOrderId ? 'buy' : 'sell',
      time: new Date(trade.timestamp).toLocaleTimeString(),
      timestamp: trade.timestamp
    }));
  }
  
  return {
    ...storedMarket,
    currentPrice: currentPrice || storedMarket.currentPrice || 142.85,
    priceChange24h: currentPrice ? priceChange24h : (storedMarket.priceChange24h || 0),
    volume24h: volume24h || storedMarket.volume24h || 0,
    orderBook: (orderBook.asks.length || orderBook.bids.length) ? orderBook : storedMarket.orderBook,
    recentTrades: formattedTrades,
    klineData: storedMarket.klineData || []
  };
};

export const updateMarketData = (updates) => {
  const data = readHomepageData();
  if (!data) return null;
  
  data.market = { ...data.market, ...updates, updatedAt: Date.now() };
  
  if (writeHomepageData(data)) {
    if (updates.currentPrice !== undefined) {
      pushUpdate('market', 'update', {
        currentPrice: data.market.currentPrice,
        priceChange24h: data.market.priceChange24h,
        volume24h: data.market.volume24h
      });
    }
    return data.market;
  }
  return null;
};

export const addKlinePoint = (klinePoint) => {
  const data = readHomepageData();
  if (!data) return false;
  
  if (!data.market.klineData) data.market.klineData = [];
  data.market.klineData.push({ id: data.market.klineData.length, ...klinePoint });
  
  if (data.market.klineData.length > 60) {
    data.market.klineData = data.market.klineData.slice(-60);
  }
  
  return writeHomepageData(data);
};

export const addMarketTrade = (trade) => {
  const data = readHomepageData();
  if (!data) return null;
  
  const newTrade = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    ...trade,
    timestamp: Date.now()
  };
  
  data.market.recentTrades = [newTrade, ...(data.market.recentTrades || [])].slice(0, 10);
  return writeHomepageData(data) ? newTrade : null;
};

export const updateOrderBook = (orderBook) => {
  const data = readHomepageData();
  if (!data) return false;
  data.market.orderBook = orderBook;
  return writeHomepageData(data);
};

const calculateBlockHeight = async () => {
  return '8922104'; // 简化处理
};

export const getMapData = async () => {
  const data = readHomepageData();
  const map = data?.map || getDefaultData().map;
  const dynamicBlockHeight = await calculateBlockHeight();
  return { ...map, blockHeight: dynamicBlockHeight };
};

export const updateMapData = (updates) => {
  const data = readHomepageData();
  if (!data) return null;
  data.map = { ...data.map, ...updates, updatedAt: Date.now() };
  if (writeHomepageData(data)) {
    pushUpdate('map', 'update', {
      taiwan: data.map.taiwan,
      mainland: data.map.mainland,
      blockHeight: data.map.blockHeight
    });
    return data.map;
  }
  return null;
};

export const addTaiwanLog = (messageOrLog) => {
  const data = readHomepageData();
  if (!data) return null;
  
  let newLog;
  if (typeof messageOrLog === 'string') {
    newLog = { id: `${Date.now()}`, message: messageOrLog, timestamp: Date.now() };
  } else {
    newLog = {
      id: messageOrLog.id || `${Date.now()}`,
      message: messageOrLog.message,
      timestamp: messageOrLog.timestamp || Date.now(),
      nodeId: messageOrLog.nodeId,
      city: messageOrLog.city,
      location: messageOrLog.location,
      status: messageOrLog.status,
      connectionType: messageOrLog.connectionType
    };
  }
  
  data.map.taiwan.logs = [newLog, ...(data.map.taiwan.logs || [])].slice(0, 6);
  data.map.taiwan.nodeCount = (data.map.taiwan.nodeCount || 0) + 1;
  
  if (writeHomepageData(data)) {
    pushUpdate('map', 'incremental', {
      type: 'taiwanLog',
      log: newLog,
      nodeCount: data.map.taiwan.nodeCount
    });
    return newLog;
  }
  return null;
};

export const addAssetLog = (lotOrLog, location) => {
  const data = readHomepageData();
  if (!data) return null;
  
  let newLog;
  if (typeof lotOrLog === 'string') {
    newLog = { id: `${Date.now()}`, lot: lotOrLog, location: location || 'Unknown', timestamp: Date.now() };
  } else {
    newLog = {
      id: lotOrLog.id || `${Date.now()}`,
      lot: lotOrLog.lot,
      location: lotOrLog.location,
      timestamp: lotOrLog.timestamp || Date.now(),
      assetId: lotOrLog.assetId,
      nodeName: lotOrLog.nodeName,
      nodeLocation: lotOrLog.nodeLocation,
      value: lotOrLog.value,
      status: lotOrLog.status
    };
  }
  
  data.map.mainland.logs = [newLog, ...(data.map.mainland.logs || [])].slice(0, 5);
  data.map.mainland.assetPoolValue = (data.map.mainland.assetPoolValue || 0) + (newLog.value || Math.floor(Math.random() * 500000));
  data.map.mainland.unitCount = (data.map.mainland.unitCount || 0) + 1;
  
  if (writeHomepageData(data)) {
    pushUpdate('map', 'incremental', {
      type: 'assetLog',
      log: newLog,
      assetPoolValue: data.map.mainland.assetPoolValue,
      unitCount: data.map.mainland.unitCount
    });
    return newLog;
  }
  return null;
};

export const updateAiTimeAdjustment = (deltaMs) => 0;

export { readHomepageData, writeHomepageData, calculateETUTargetTime, calculateRiskPremium };