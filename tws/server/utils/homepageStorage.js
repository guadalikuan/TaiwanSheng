import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { 
  getCurrentPrice, 
  calculate24hPriceChange, 
  calculate24hVolume,
  getOrderBook,
  getRecentTrades,
  calculateVWAP
} from './orderMatchingEngine.js';
import { getBotUserStats } from './botUserManager.js';
import { pushUpdate } from './sseManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../data');
const HOMEPAGE_FILE = join(DATA_DIR, 'homepage.json');

// 确保数据目录存在
const initDataDir = () => {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  // 注意：默认数据创建现在在 readHomepageData() 中处理
};

// 获取默认数据
const getDefaultData = () => {
  return {
    omega: {
      etuTargetTime: Date.now() + 1000 * 60 * 60 * 24 * 600, // 600天后
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
      orderBook: {
        asks: [],
        bids: []
      },
      recentTrades: []
    },
    map: {
      taiwan: {
        nodeCount: 12458,
        logs: []
      },
      mainland: {
        assetPoolValue: 1425000000,
        unitCount: 42109,
        logs: []
      },
      blockHeight: '8922104'
    }
  };
};

// 读取首页数据
const readHomepageData = () => {
  initDataDir();
  try {
    if (!existsSync(HOMEPAGE_FILE)) {
      // 如果文件不存在，创建默认数据
      const defaultData = getDefaultData();
      writeFileSync(HOMEPAGE_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
      return defaultData;
    }
    
    const data = readFileSync(HOMEPAGE_FILE, 'utf8');
    const parsed = JSON.parse(data);
    
    // 验证数据完整性，如果缺少必要字段，使用默认值补充
    const defaultData = getDefaultData();
    return {
      omega: { ...defaultData.omega, ...(parsed.omega || {}) },
      market: { ...defaultData.market, ...(parsed.market || {}) },
      map: { ...defaultData.map, ...(parsed.map || {}) }
    };
  } catch (error) {
    console.error('Error reading homepage data:', error);
    // 返回默认数据而不是 null
    const defaultData = getDefaultData();
    // 尝试写入默认数据
    try {
      writeFileSync(HOMEPAGE_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
    } catch (writeError) {
      console.error('Error writing default data:', writeError);
    }
    return defaultData;
  }
};

// 写入首页数据
const writeHomepageData = (data) => {
  initDataDir();
  try {
    writeFileSync(HOMEPAGE_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing homepage data:', error);
    return false;
  }
};

import { getTargetTime, getTimeData } from './timeManager.js';

/**
 * 计算ETU目标时间（基于系统事件动态调整）
 * @param {number} baseTargetTime - 基础目标时间（时间戳）
 * @returns {Promise<number>} 调整后的目标时间（时间戳）
 */
const calculateETUTargetTime = async (baseTargetTime) => {
  // 使用统一的时间管理器作为唯一真实数据源
  return getTargetTime();
};

/**
 * 计算风险溢价（基于市场数据动态计算）
 * @returns {Promise<number>} 风险溢价百分比
 */
const calculateRiskPremium = async () => {
  try {
    // 获取市场数据
    let priceChange24h = 0;
    let volume24h = 0;
    let currentPrice = null;
    
    try {
      currentPrice = getCurrentPrice();
      if (currentPrice !== null) {
        priceChange24h = calculate24hPriceChange(currentPrice);
        volume24h = calculate24hVolume();
      }
    } catch (error) {
      console.warn('Error getting market data for risk premium calculation:', error);
    }
    
    // 获取系统统计数据
    let botStats = { active: 0 };
    try {
      botStats = getBotUserStats();
    } catch (error) {
      console.warn('Error getting bot stats for risk premium calculation:', error);
    }
    
    // 获取资产数据
    let assetCount = 0;
    try {
      const storageModule = await import('./storage.js');
      const allAssets = storageModule.getAllAssets();
      assetCount = (allAssets.sanitized && Array.isArray(allAssets.sanitized)) ? allAssets.sanitized.length : 0;
    } catch (error) {
      console.warn('Error getting asset data for risk premium calculation:', error);
    }
    
    // 基础风险溢价
    const basePremium = 100.0;
    
    // 价格波动性影响：价格变化越大，风险溢价越高
    const volatilityImpact = Math.abs(priceChange24h) * 2; // 每1%价格变化增加2%风险溢价
    
    // 交易量影响：交易量越大，市场越活跃，风险溢价略降（流动性好）
    const volumeImpact = -Math.min(volume24h / 100000000, 20); // 每1亿交易量减少1%风险溢价，最多减少20%
    
    // 用户活跃度影响：用户越多，系统越稳定，风险溢价略降
    const userImpact = -Math.min(botStats.active / 5, 10); // 每5个活跃用户减少1%风险溢价，最多减少10%
    
    // 资产数量影响：资产越多，系统越成熟，风险溢价略降
    const assetImpact = -Math.min(assetCount / 20, 15); // 每20个资产减少1%风险溢价，最多减少15%

    // 局势紧张程度影响（基于AI分析的时间调整）
    let tensionImpact = 0;
    try {
      const timeData = await getTimeData();
      if (timeData && timeData.history) {
        // 获取最近24小时的调整记录
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const recentAdjustments = timeData.history.filter(h => h.timestamp > oneDayAgo);
        
        // 计算总调整时间（负值代表加速统一，正值代表推迟）
        const totalAdjustmentMs = recentAdjustments.reduce((sum, h) => sum + h.adjustment, 0);
        
        if (totalAdjustmentMs < 0) {
          // 局势紧张，加速统一 -> 风险溢价上升
          // 每加速1天，增加5%溢价，上限50%
          const daysAccelerated = Math.abs(totalAdjustmentMs) / (24 * 60 * 60 * 1000);
          tensionImpact = Math.min(daysAccelerated * 5, 50);
        } else if (totalAdjustmentMs > 0) {
          // 局势缓和，推迟统一 -> 风险溢价下降
          // 每推迟1天，减少2%溢价，上限20%
          const daysDelayed = totalAdjustmentMs / (24 * 60 * 60 * 1000);
          tensionImpact = -Math.min(daysDelayed * 2, 20);
        }
      }
    } catch (error) {
      console.warn('Error calculating tension impact:', error);
    }
    
    // 计算最终风险溢价
    const finalPremium = basePremium + volatilityImpact + volumeImpact + userImpact + assetImpact + tensionImpact;
    
    // 确保风险溢价在合理范围内（50-200%）
    return Math.max(50, Math.min(200, finalPremium));
  } catch (error) {
    console.error('Error calculating risk premium:', error);
    return 142.5; // 出错时返回默认值
  }
};

/**
 * 获取Omega屏数据
 * @returns {Promise<Object>} Omega数据
 */
export const getOmegaData = async () => {
  const data = readHomepageData();
  const omega = data?.omega || getDefaultData().omega;
  
  // 动态计算ETU目标时间
  const baseTargetTime = omega.etuTargetTime || (Date.now() + 1000 * 60 * 60 * 24 * 600);
  const dynamicETUTargetTime = await calculateETUTargetTime(baseTargetTime);
  
  // 动态计算风险溢价
  const dynamicRiskPremium = await calculateRiskPremium();
  
  return {
    ...omega,
    etuTargetTime: dynamicETUTargetTime,
    riskPremium: dynamicRiskPremium
  };
};

/**
 * 更新Omega数据
 * @param {Object} updates - 要更新的字段
 * @returns {Object|null} 更新后的数据
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
    // 推送 SSE 更新
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
 * @param {string} text - 事件文本
 * @returns {Object|null} 新事件
 */
export const addOmegaEvent = (text) => {
  const data = readHomepageData();
  if (!data) return null;
  
  const newEvent = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    text,
    timestamp: Date.now()
  };
  
  data.omega.events = [newEvent, ...(data.omega.events || [])].slice(0, 8);
  
  if (writeHomepageData(data)) {
    // 推送 SSE 更新（增量）
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
 * @returns {Object} Market数据
 */
export const getMarketData = () => {
  const data = readHomepageData();
  
  // 从订单撮合引擎获取实时数据
  let currentPrice = null;
  let priceChange24h = 0;
  let volume24h = 0;
  let vwap24h = null;
  let orderBook = { asks: [], bids: [] };
  let recentTrades = [];
  
  try {
    try {
      currentPrice = getCurrentPrice();
      if (currentPrice !== null && !isNaN(currentPrice) && isFinite(currentPrice)) {
        try {
          priceChange24h = calculate24hPriceChange(currentPrice);
          if (isNaN(priceChange24h) || !isFinite(priceChange24h)) {
            priceChange24h = 0;
          }
        } catch (calcError) {
          console.warn('Error calculating 24h price change:', calcError.message);
          priceChange24h = 0;
        }
        
        try {
          volume24h = calculate24hVolume();
          if (isNaN(volume24h) || !isFinite(volume24h)) {
            volume24h = 0;
          }
        } catch (volError) {
          console.warn('Error calculating 24h volume:', volError.message);
          volume24h = 0;
        }
        
        try {
          vwap24h = calculateVWAP(24 * 60 * 60 * 1000); // 24小时VWAP
          if (vwap24h !== null && (isNaN(vwap24h) || !isFinite(vwap24h))) {
            vwap24h = null;
          }
        } catch (vwapError) {
          console.warn('Error calculating 24h VWAP:', vwapError.message);
          vwap24h = null;
        }
      }
    } catch (priceError) {
      console.warn('Error getting current price:', priceError.message);
      currentPrice = null;
    }
    
    try {
      orderBook = getOrderBook(10);
      if (!orderBook || !orderBook.asks || !orderBook.bids) {
        orderBook = { asks: [], bids: [] };
      }
    } catch (orderBookError) {
      console.warn('Error getting order book:', orderBookError.message);
      orderBook = { asks: [], bids: [] };
    }
    
    try {
      recentTrades = getRecentTrades(10);
      if (!Array.isArray(recentTrades)) {
        recentTrades = [];
      }
    } catch (tradesError) {
      console.warn('Error getting recent trades:', tradesError.message);
      recentTrades = [];
    }
  } catch (error) {
    // 如果订单撮合引擎不可用，使用默认数据
    console.warn('Order matching engine not available, using default data:', error.message);
    console.error('Full error:', error);
  }
  
  // 合并数据：优先使用订单撮合引擎的数据，如果没有则使用存储的数据
  const storedMarket = data?.market || getDefaultData().market;
  
  // 安全地格式化成交记录
  let formattedTrades = storedMarket.recentTrades || [];
  if (recentTrades.length > 0) {
    try {
      formattedTrades = recentTrades.map(trade => {
        if (!trade || typeof trade !== 'object') return null;
        const price = typeof trade.price === 'number' ? trade.price : parseFloat(trade.price) || 0;
        const amount = typeof trade.amount === 'number' ? trade.amount : parseFloat(trade.amount) || 0;
        const timestamp = trade.timestamp || Date.now();
        
        return {
          id: trade.id || `trade_${timestamp}_${Math.random().toString(36).substring(2, 9)}`,
          price: price.toFixed(2),
          amount: amount.toFixed(4),
          type: trade.buyOrderId ? 'buy' : 'sell',
          time: new Date(timestamp).toLocaleTimeString(),
          timestamp: timestamp
        };
      }).filter(t => t !== null);
    } catch (formatError) {
      console.warn('Error formatting trades:', formatError.message);
      formattedTrades = storedMarket.recentTrades || [];
    }
  }
  
  return {
    ...storedMarket,
    currentPrice: currentPrice !== null && !isNaN(currentPrice) && isFinite(currentPrice) 
      ? currentPrice 
      : (storedMarket.currentPrice || 142.85),
    priceChange24h: currentPrice !== null ? priceChange24h : (storedMarket.priceChange24h || 0),
    volume24h: volume24h > 0 ? volume24h : (storedMarket.volume24h || 0),
    vwap24h: vwap24h !== null && !isNaN(vwap24h) && isFinite(vwap24h) 
      ? vwap24h 
      : (storedMarket.vwap24h || null),
    orderBook: (orderBook.asks && orderBook.asks.length > 0) || (orderBook.bids && orderBook.bids.length > 0) 
      ? orderBook 
      : (storedMarket.orderBook || { asks: [], bids: [] }),
    recentTrades: formattedTrades,
    klineData: storedMarket.klineData || [],
    marketIndex: storedMarket.marketIndex || 'STRONG BUY'
  };
};

/**
 * 更新Market数据
 * @param {Object} updates - 要更新的字段
 * @returns {Object|null} 更新后的数据
 */
export const updateMarketData = (updates) => {
  const data = readHomepageData();
  if (!data) return null;
  
  data.market = {
    ...data.market,
    ...updates,
    updatedAt: Date.now()
  };
  
  if (writeHomepageData(data)) {
    // 推送 SSE 更新（如果包含价格相关数据）
    if (updates.currentPrice !== undefined || updates.priceChange24h !== undefined || updates.volume24h !== undefined) {
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

/**
 * 添加K线数据点
 * @param {Object} klinePoint - K线数据点 {timestamp, open, high, low, close, volume}
 * @returns {boolean} 是否成功
 */
export const addKlinePoint = (klinePoint) => {
  const data = readHomepageData();
  if (!data) return false;
  
  if (!data.market.klineData) {
    data.market.klineData = [];
  }
  
  data.market.klineData.push({
    id: data.market.klineData.length,
    ...klinePoint
  });
  
  // 保持最多60个数据点
  if (data.market.klineData.length > 60) {
    data.market.klineData = data.market.klineData.slice(-60);
  }
  
  return writeHomepageData(data);
};

/**
 * 添加交易记录（已废弃，现在使用订单撮合引擎的成交记录）
 * @param {Object} trade - 交易数据 {price, amount, type, time}
 * @returns {Object|null} 新交易
 * @deprecated 使用订单撮合引擎的成交记录
 */
export const addMarketTrade = (trade) => {
  // 这个方法现在主要用于兼容性，实际交易记录由订单撮合引擎管理
  const data = readHomepageData();
  if (!data) return null;
  
  const newTrade = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    ...trade,
    timestamp: Date.now()
  };
  
  if (!data.market.recentTrades) {
    data.market.recentTrades = [];
  }
  
  data.market.recentTrades = [newTrade, ...data.market.recentTrades].slice(0, 10);
  
  if (writeHomepageData(data)) {
    return newTrade;
  }
  return null;
};

/**
 * 更新订单簿（已废弃，现在使用订单撮合引擎的订单簿）
 * @param {Object} orderBook - 订单簿 {asks: [], bids: []}
 * @returns {boolean} 是否成功
 * @deprecated 使用订单撮合引擎的订单簿
 */
export const updateOrderBook = (orderBook) => {
  // 这个方法现在主要用于兼容性，实际订单簿由订单撮合引擎管理
  const data = readHomepageData();
  if (!data) return false;
  
  data.market.orderBook = orderBook;
  return writeHomepageData(data);
};

/**
 * 计算区块链高度（基于交易数量模拟）
 * @returns {Promise<string>} 区块链高度
 */
const calculateBlockHeight = async () => {
  try {
    // 基础区块高度
    const baseHeight = 8922104;
    
    // 获取交易数据
    let tradeCount = 0;
    try {
      const recentTrades = getRecentTrades(10000);
      tradeCount = recentTrades.length;
    } catch (error) {
      console.warn('Error getting trades for block height calculation:', error);
    }
    
    // 每个交易增加一个区块（简化模型）
    // 实际中，多个交易可能打包在一个区块中，这里简化处理
    const blocksFromTrades = Math.floor(tradeCount / 10); // 每10个交易一个区块
    
    // 基于系统运行时间增加区块（模拟区块时间约15秒）
    const systemStartTime = 1704067200000; // 2024-01-01 00:00:00 UTC (示例起始时间)
    const currentTime = Date.now();
    const timeElapsed = currentTime - systemStartTime;
    const blocksFromTime = Math.floor(timeElapsed / (15 * 1000)); // 每15秒一个区块
    
    // 计算最终区块高度
    const finalHeight = baseHeight + blocksFromTrades + blocksFromTime;
    
    return finalHeight.toString();
  } catch (error) {
    console.error('Error calculating block height:', error);
    return '8922104'; // 出错时返回默认值
  }
};

/**
 * 获取Map屏数据
 * @returns {Promise<Object>} Map数据
 */
export const getMapData = async () => {
  const data = readHomepageData();
  const map = data?.map || getDefaultData().map;
  
  // 动态计算区块链高度
  const dynamicBlockHeight = await calculateBlockHeight();
  
  return {
    ...map,
    blockHeight: dynamicBlockHeight
  };
};

/**
 * 更新Map数据
 * @param {Object} updates - 要更新的字段
 * @returns {Object|null} 更新后的数据
 */
export const updateMapData = (updates) => {
  const data = readHomepageData();
  if (!data) return null;
  
  data.map = {
    ...data.map,
    ...updates,
    updatedAt: Date.now()
  };
  
  if (writeHomepageData(data)) {
    // 推送 SSE 更新
    pushUpdate('map', 'update', {
      taiwan: data.map.taiwan,
      mainland: data.map.mainland,
      blockHeight: data.map.blockHeight
    });
    return data.map;
  }
  return null;
};

/**
 * 添加台湾连接日志
 * @param {string|Object} messageOrLog - 日志消息或完整日志对象
 * @returns {Object|null} 新日志
 */
export const addTaiwanLog = (messageOrLog) => {
  const data = readHomepageData();
  if (!data) return null;
  
  let newLog;
  if (typeof messageOrLog === 'string') {
    // 兼容旧接口：只有消息字符串
    newLog = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      message: messageOrLog,
      timestamp: Date.now()
    };
  } else {
    // 新接口：完整日志对象
    newLog = {
      id: messageOrLog.id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      message: messageOrLog.message,
      timestamp: messageOrLog.timestamp || Date.now(),
      nodeId: messageOrLog.nodeId,
      city: messageOrLog.city,
      location: messageOrLog.location,
      status: messageOrLog.status || 'active',
      connectionType: messageOrLog.connectionType || 'direct'
    };
  }
  
  if (!data.map.taiwan.logs) {
    data.map.taiwan.logs = [];
  }
  
  data.map.taiwan.logs = [newLog, ...data.map.taiwan.logs].slice(0, 6);
  data.map.taiwan.nodeCount = (data.map.taiwan.nodeCount || 0) + 1;
  
  if (writeHomepageData(data)) {
    // 推送 SSE 更新（增量）
    pushUpdate('map', 'incremental', {
      type: 'taiwanLog',
      log: newLog,
      nodeCount: data.map.taiwan.nodeCount
    });
    return newLog;
  }
  return null;
};

/**
 * 添加资产确认日志
 * @param {string|Object} lotOrLog - 批次号或完整日志对象
 * @param {string} location - 位置（如果第一个参数是字符串）
 * @returns {Object|null} 新日志
 */
export const addAssetLog = (lotOrLog, location) => {
  const data = readHomepageData();
  if (!data) return null;
  
  let newLog;
  if (typeof lotOrLog === 'string') {
    // 兼容旧接口：只有批次号和位置
    newLog = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      lot: lotOrLog,
      location: location || 'Unknown',
      timestamp: Date.now()
    };
  } else {
    // 新接口：完整日志对象
    newLog = {
      id: lotOrLog.id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      lot: lotOrLog.lot,
      location: lotOrLog.location,
      timestamp: lotOrLog.timestamp || Date.now(),
      assetId: lotOrLog.assetId,
      nodeName: lotOrLog.nodeName,
      nodeLocation: lotOrLog.nodeLocation,
      value: lotOrLog.value,
      status: lotOrLog.status || 'confirmed'
    };
  }
  
  if (!data.map.mainland.logs) {
    data.map.mainland.logs = [];
  }
  
  data.map.mainland.logs = [newLog, ...data.map.mainland.logs].slice(0, 5);
  data.map.mainland.assetPoolValue = (data.map.mainland.assetPoolValue || 0) + (newLog.value || Math.floor(Math.random() * 500000));
  data.map.mainland.unitCount = (data.map.mainland.unitCount || 0) + 1;
  
  if (writeHomepageData(data)) {
    // 推送 SSE 更新（增量）
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

/**
 * 更新AI时间调整值
 * @param {number} deltaMs - 变化量（毫秒），负值表示加速统一，正值表示延后
 * @returns {number} 新的累计值
 */
export const updateAiTimeAdjustment = (deltaMs) => {
  console.warn('Deprecated: updateAiTimeAdjustment called. Use TimeManager.adjustTime instead.');
  return 0;
};

export {
  readHomepageData,
  writeHomepageData,
  calculateETUTargetTime,
  calculateRiskPremium
};

