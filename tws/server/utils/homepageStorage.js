import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../data');
const HOMEPAGE_FILE = join(DATA_DIR, 'homepage.json');

// 确保数据目录存在
const initDataDir = () => {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(HOMEPAGE_FILE)) {
    const defaultData = {
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
    writeFileSync(HOMEPAGE_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
  }
};

// 读取首页数据
const readHomepageData = () => {
  initDataDir();
  try {
    const data = readFileSync(HOMEPAGE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading homepage data:', error);
    return null;
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

/**
 * 获取Omega屏数据
 * @returns {Object} Omega数据
 */
export const getOmegaData = () => {
  const data = readHomepageData();
  return data?.omega || null;
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
  return data?.market || null;
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
 * 添加交易记录
 * @param {Object} trade - 交易数据 {price, amount, type, time}
 * @returns {Object|null} 新交易
 */
export const addMarketTrade = (trade) => {
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
 * 更新订单簿
 * @param {Object} orderBook - 订单簿 {asks: [], bids: []}
 * @returns {boolean} 是否成功
 */
export const updateOrderBook = (orderBook) => {
  const data = readHomepageData();
  if (!data) return false;
  
  data.market.orderBook = orderBook;
  return writeHomepageData(data);
};

/**
 * 获取Map屏数据
 * @returns {Object} Map数据
 */
export const getMapData = () => {
  const data = readHomepageData();
  return data?.map || null;
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
    return newLog;
  }
  return null;
};

