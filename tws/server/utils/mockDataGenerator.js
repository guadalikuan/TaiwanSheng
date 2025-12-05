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
 * 验证并修正坐标是否在合理范围内
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @param {string} region - 区域类型：'mainland' 或 'taiwan'
 * @returns {Object} 修正后的坐标 {lat, lng}
 */
const validateAndFixCoordinates = (lat, lng, region = 'mainland') => {
  // 中国大陆范围：纬度 18°-54°N，经度 73°-135°E
  // 台湾范围：纬度 21.9°-25.3°N，经度 119.3°-122.0°E
  const bounds = region === 'taiwan' 
    ? { latMin: 21.9, latMax: 25.3, lngMin: 119.3, lngMax: 122.0 }
    : { latMin: 18, latMax: 54, lngMin: 73, lngMax: 135 };
  
  // 修正超出范围的坐标
  let fixedLat = lat;
  let fixedLng = lng;
  
  if (fixedLat < bounds.latMin) fixedLat = bounds.latMin;
  if (fixedLat > bounds.latMax) fixedLat = bounds.latMax;
  if (fixedLng < bounds.lngMin) fixedLng = bounds.lngMin;
  if (fixedLng > bounds.lngMax) fixedLng = bounds.lngMax;
  
  return { lat: fixedLat, lng: fixedLng };
};

/**
 * 生成模拟市场交易记录
 * @param {number} currentPrice - 当前价格
 * @returns {Object} 交易记录
 */
export const generateMarketTrade = (currentPrice) => {
  const change = (Math.random() - 0.4) * 1.5; // 从0.5增加到1.5，增加单次交易价格变化
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
  const volatility = 0.6; // 波动率（从0.3增加到0.6，增加波动性）
  const drift = 0.005; // 漂移率（从0.01减少到0.005，减少趋势，增加随机性）
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
 * 生成资产确认日志（基于真实资产数据）
 * @returns {Promise<Object>} 资产日志
 */
export const generateAssetLog = async () => {
  try {
    // 尝试从真实资产数据中获取
    const { getAllAssets, getAssetsByStatus } = await import('./storage.js');
    const allAssets = getAllAssets();
    
    // 优先选择最近提交的MINTING或AVAILABLE状态的资产
    const availableAssets = getAssetsByStatus('AVAILABLE');
    const mintingAssets = getAssetsByStatus('MINTING');
    const recentAssets = [...availableAssets, ...mintingAssets];
    
    let selectedAsset = null;
    if (recentAssets.length > 0) {
      // 随机选择一个最近提交的资产
      selectedAsset = recentAssets[Math.floor(Math.random() * recentAssets.length)];
    }
    
    // 如果找到了真实资产，使用真实数据
    if (selectedAsset) {
      const rawAsset = allAssets.raw.find(r => r.id === selectedAsset.id || r.id === selectedAsset.internalRef);
      
      // 确定节点位置（基于资产城市）
      let baseNode = mainlandNodes[0]; // 默认节点
      if (rawAsset && rawAsset.city) {
        // 根据城市选择对应的节点
        const cityNodeMap = {
          '西安': mainlandNodes.find(n => n.name.includes('XI\'AN')),
          '咸阳': mainlandNodes.find(n => n.name.includes('XI\'AN')),
          '宝鸡': mainlandNodes.find(n => n.name.includes('SHAANXI')),
          '商洛': mainlandNodes.find(n => n.name.includes('SHAANXI')),
          '汉中': mainlandNodes.find(n => n.name.includes('SHAANXI')),
          '安康': mainlandNodes.find(n => n.name.includes('SHAANXI')),
          '延安': mainlandNodes.find(n => n.name.includes('SHAANXI')),
          '榆林': mainlandNodes.find(n => n.name.includes('SHAANXI'))
        };
        baseNode = cityNodeMap[rawAsset.city] || baseNode;
      }
      
      // 尝试关联机器人用户
      let botUser = null;
      try {
        botUser = getRandomBotUser({ role: ROLES.SUBMITTER }) || getRandomBotUser({ role: ROLES.USER });
      } catch (error) {
        // 忽略错误
      }
      
      // 生成坐标，偏移从 0.8 度减少到 0.1 度（约11公里）
      const rawLat = baseNode.lat + (Math.random() - 0.5) * 0.1;
      const rawLng = baseNode.lng + (Math.random() - 0.5) * 0.1;
      const validatedCoords = validateAndFixCoordinates(rawLat, rawLng, 'mainland');
      
      const log = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        lot: selectedAsset.codeName || selectedAsset.id || `LOT-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        location: rawAsset ? rawAsset.city : baseNode.name.split(' ')[0],
        timestamp: Date.now(),
        assetId: selectedAsset.id,
        nodeName: baseNode.name,
        nodeLocation: {
          lat: validatedCoords.lat,
          lng: validatedCoords.lng
        },
        value: rawAsset ? (rawAsset.debtAmount || Math.floor(Math.random() * 500000 + 100000)) : Math.floor(Math.random() * 500000 + 100000),
        status: selectedAsset.status === 'AVAILABLE' ? 'confirmed' : 'pending'
      };
      
      if (botUser) {
        log.userId = botUser.id;
        log.username = botUser.username;
        log.userAddress = botUser.address;
        log.submittedBy = botUser.address;
      }
      
      return log;
    }
  } catch (error) {
    console.warn('Error generating asset log from real assets, falling back to mock:', error);
  }
  
  // 如果无法获取真实资产，使用模拟数据（向后兼容）
  const baseNode = mainlandNodes[Math.floor(Math.random() * mainlandNodes.length)];
  const contractId = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  let botUser = null;
  try {
    botUser = getRandomBotUser({ role: ROLES.SUBMITTER }) || getRandomBotUser({ role: ROLES.USER });
  } catch (error) {
    // 忽略错误
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
  // 增加波动性：从2增加到4，使价格变化更明显
  const close = basePrice + (Math.random() - 0.4) * 4;
  // 增加高低价差：从1增加到2-3
  const high = Math.max(open, close) + Math.random() * 2.5;
  const low = Math.min(open, close) - Math.random() * 2.5;
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

