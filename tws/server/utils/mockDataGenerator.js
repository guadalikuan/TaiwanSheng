/**
 * 模拟数据生成工具
 * 用于生成Market、Map等模拟数据
 */

import { getRandomBotUser } from './botUserManager.js';
import { ROLES } from './roles.js';

const taiwanHotspots = [
  { name: 'Taipei (Xinyi)', lat: 25.033, lng: 121.5654 },
  { name: 'New Taipei', lat: 25.012, lng: 121.4654 },
  { name: 'Taichung', lat: 24.1477, lng: 120.6736 },
  { name: 'Kaohsiung', lat: 22.6273, lng: 120.3014 },
  { name: 'Tainan', lat: 22.9997, lng: 120.227 },
  { name: 'Hsinchu (Science Park)', lat: 24.8138, lng: 120.9675 },
  { name: 'Taoyuan (Airport)', lat: 25.0724, lng: 121.2272 },
];

const mainlandNodes = [
  { name: "SHAANXI (Qinling Base)", lat: 33.87, lng: 110.15 },
  { name: "XI'AN (Urban Reserve)", lat: 34.3416, lng: 108.9398 },
  { name: 'FUJIAN (Coastal Front)', lat: 26.0745, lng: 119.2965 },
  { name: 'HORGOS (Tax Haven)', lat: 44.2144, lng: 80.4085 },
  { name: 'GUANGDONG (Inventory)', lat: 23.1291, lng: 113.2644 },
  { name: 'SICHUAN (Backup)', lat: 30.5728, lng: 104.0668 },
];

/**
 * 生成模拟市场交易记录
 * @param {number} currentPrice - 当前价格
 * @returns {Object} 交易记录
 */
export const generateMarketTrade = (currentPrice) => {
  const change = (Math.random() - 0.4) * 0.5;
  const nextPrice = Number((currentPrice + change).toFixed(2));
  const type = Math.random() > 0.3 ? 'buy' : 'sell';
  
  // 尝试关联机器人用户（如果存在）
  let botUser = null;
  try {
    botUser = getRandomBotUser({ role: ROLES.USER });
  } catch (error) {
    // 忽略错误，如果没有机器人用户就继续
  }
  
  const trade = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    price: nextPrice.toFixed(2),
    amount: (Math.random() * 500 + 10).toFixed(2),
    type,
    time: new Date().toLocaleTimeString(),
    timestamp: Date.now(),
    pair: 'TWS/CNY',
    volume: (Number(nextPrice) * (Math.random() * 500 + 10)).toFixed(2)
  };
  
  // 如果有关联的机器人用户，添加用户信息
  if (botUser) {
    trade.userId = botUser.id;
    trade.username = botUser.username;
    trade.userAddress = botUser.address;
  }
  
  return trade;
};

/**
 * 更新市场价格（随机游走模型）
 * @param {number} currentPrice - 当前价格
 * @returns {number} 新价格
 */
export const updateMarketPrice = (currentPrice) => {
  const volatility = 0.3; // 波动率
  const drift = 0.01; // 漂移率（轻微上涨趋势）
  const randomChange = (Math.random() - 0.5) * volatility;
  const newPrice = currentPrice * (1 + drift + randomChange);
  return Number(newPrice.toFixed(2));
};

/**
 * 生成订单簿数据
 * @param {number} currentPrice - 当前价格
 * @returns {Object} 订单簿 {asks: [], bids: []}
 */
export const generateOrderBook = (currentPrice) => {
  const asks = [];
  const bids = [];
  
  // 生成卖单（asks）
  for (let i = 0; i < 5; i++) {
    const price = currentPrice + (i + 1) * 0.1 + Math.random() * 0.2;
    asks.push({
      price: Number(price.toFixed(2)),
      amount: Number((Math.random() * 10 + 1).toFixed(4))
    });
  }
  
  // 生成买单（bids）
  for (let i = 0; i < 7; i++) {
    const price = currentPrice - (i + 1) * 0.1 - Math.random() * 0.2;
    bids.push({
      price: Number(price.toFixed(2)),
      amount: Number((Math.random() * 100 + 10).toFixed(4))
    });
  }
  
  return { asks, bids };
};

/**
 * 生成台湾节点连接日志
 * @returns {Object} 节点日志
 */
export const generateTaiwanNodeLog = () => {
  const city = taiwanHotspots[Math.floor(Math.random() * taiwanHotspots.length)];
  const nodeId = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // 尝试关联机器人用户（如果存在）
  let botUser = null;
  try {
    botUser = getRandomBotUser({ role: ROLES.USER });
  } catch (error) {
    // 忽略错误，如果没有机器人用户就继续
  }
  
  const log = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    message: botUser 
      ? `[CONNECT] ${city.name} :: ${botUser.username} (${botUser.address.substring(0, 8)}...)`
      : `[CONNECT] ${city.name} :: USR-${nodeId}`,
    timestamp: Date.now(),
    nodeId: `NODE-${nodeId}`,
    city: city.name,
    location: {
      lat: city.lat + (Math.random() - 0.5) * 0.04,
      lng: city.lng + (Math.random() - 0.5) * 0.04
    },
    status: 'active',
    connectionType: Math.random() > 0.5 ? 'direct' : 'relay'
  };
  
  // 如果有关联的机器人用户，添加用户信息
  if (botUser) {
    log.userId = botUser.id;
    log.username = botUser.username;
    log.userAddress = botUser.address;
  }
  
  return log;
};

/**
 * 生成资产确认日志
 * @returns {Object} 资产日志
 */
export const generateAssetLog = () => {
  const baseNode = mainlandNodes[Math.floor(Math.random() * mainlandNodes.length)];
  const contractId = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  // 尝试关联机器人用户（SUBMITTER或USER都可以）
  let botUser = null;
  try {
    // 优先选择SUBMITTER，如果没有则选择USER
    botUser = getRandomBotUser({ role: ROLES.SUBMITTER }) || getRandomBotUser({ role: ROLES.USER });
  } catch (error) {
    // 忽略错误，如果没有机器人用户就继续
  }
  
  const log = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    lot: contractId,
    location: baseNode.name.split(' ')[0],
    timestamp: Date.now(),
    assetId: `ASSET-${contractId}`,
    nodeName: baseNode.name,
    nodeLocation: {
      lat: baseNode.lat,
      lng: baseNode.lng
    },
    value: Math.floor(Math.random() * 500000 + 100000),
    status: 'confirmed'
  };
  
  // 如果有关联的机器人用户，添加用户信息
  if (botUser) {
    log.userId = botUser.id;
    log.username = botUser.username;
    log.userAddress = botUser.address;
    log.submittedBy = botUser.address;
  }
  
  return log;
};

/**
 * 生成K线数据点
 * @param {number} basePrice - 基础价格
 * @param {number} timestamp - 时间戳
 * @returns {Object} K线数据点
 */
export const generateKlinePoint = (basePrice, timestamp) => {
  const open = basePrice;
  const close = basePrice + (Math.random() - 0.4) * 2;
  const high = Math.max(open, close) + Math.random();
  const low = Math.min(open, close) - Math.random();
  const volume = Math.random() * 1000;
  
  return {
    id: timestamp,
    timestamp,
    open: Number(open.toFixed(2)),
    high: Number(high.toFixed(2)),
    low: Number(low.toFixed(2)),
    close: Number(close.toFixed(2)),
    volume: Number(volume.toFixed(2))
  };
};

