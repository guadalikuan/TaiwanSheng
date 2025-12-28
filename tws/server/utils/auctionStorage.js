import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../data');
const AUCTION_FILE = join(DATA_DIR, 'auction.json');

// 确保数据目录存在
const initDataDir = () => {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
};

// 获取默认拍卖数据
const getDefaultAuctionData = () => {
  return {
    state: {
      currentPrice: 1000, // 起拍价 1000 TWSCoin
      highestBidder: null,
      owner: null, // 初始没有所有者
      tauntMessage: '此房产等待第一个出价者',
      startPrice: 1000,
      startTime: Date.now(),
      ownershipDuration: 0,
      updatedAt: Date.now()
    },
    bidHistory: [] // 出价历史记录
  };
};

// 读取拍卖数据
const readAuctionData = () => {
  initDataDir();
  try {
    if (!existsSync(AUCTION_FILE)) {
      const defaultData = getDefaultAuctionData();
      writeFileSync(AUCTION_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
      return defaultData;
    }
    
    const data = readFileSync(AUCTION_FILE, 'utf8');
    const parsed = JSON.parse(data);
    
    // 验证数据完整性
    const defaultData = getDefaultAuctionData();
    return {
      state: { ...defaultData.state, ...(parsed.state || {}) },
      bidHistory: parsed.bidHistory || []
    };
  } catch (error) {
    console.error('Error reading auction data:', error);
    const defaultData = getDefaultAuctionData();
    try {
      writeFileSync(AUCTION_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
    } catch (writeError) {
      console.error('Error writing default auction data:', writeError);
    }
    return defaultData;
  }
};

// 写入拍卖数据
const writeAuctionData = (data) => {
  initDataDir();
  try {
    writeFileSync(AUCTION_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing auction data:', error);
    return false;
  }
};

/**
 * 获取当前拍卖状态
 * @returns {Object} 拍卖状态
 */
export const getAuctionState = () => {
  const data = readAuctionData();
  const state = data.state;
  
  // 计算持有时长（秒）
  if (state.startTime && state.owner) {
    const now = Date.now();
    state.ownershipDuration = Math.floor((now - state.startTime) / 1000);
  }
  
  return state;
};

/**
 * 更新拍卖状态
 * @param {Object} updates - 要更新的字段
 * @returns {Object|null} 更新后的状态
 */
export const updateAuctionState = (updates) => {
  const data = readAuctionData();
  if (!data) return null;
  
  data.state = {
    ...data.state,
    ...updates,
    updatedAt: Date.now()
  };
  
  if (writeAuctionData(data)) {
    return data.state;
  }
  return null;
};

/**
 * 添加出价记录
 * @param {Object} bidData - 出价数据 { bidder, amount, taunt, transactionSignature }
 * @returns {Object|null} 新出价记录
 */
export const addBid = (bidData) => {
  const data = readAuctionData();
  if (!data) return null;
  
  const now = Date.now();
  const timeStr = new Date(now).toLocaleTimeString('zh-CN', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  const newBid = {
    id: `${now}-${Math.random().toString(36).substring(2, 9)}`,
    user: bidData.bidder || 'Unknown',
    amount: bidData.amount,
    time: timeStr,
    taunt: bidData.taunt || '',
    timestamp: now,
    transactionSignature: bidData.transactionSignature || null
  };
  
  // 添加到历史记录开头
  data.bidHistory = [newBid, ...data.bidHistory];
  
  // 保持最多100条记录
  if (data.bidHistory.length > 100) {
    data.bidHistory = data.bidHistory.slice(0, 100);
  }
  
  // 更新拍卖状态
  data.state = {
    ...data.state,
    currentPrice: bidData.amount,
    highestBidder: bidData.bidder,
    owner: bidData.bidder,
    tauntMessage: bidData.taunt || data.state.tauntMessage,
    startTime: now, // 重新开始计时
    ownershipDuration: 0,
    updatedAt: now
  };
  
  if (writeAuctionData(data)) {
    return newBid;
  }
  return null;
};

/**
 * 获取出价历史
 * @param {number} limit - 返回的记录数限制（默认20）
 * @returns {Array} 出价历史记录
 */
export const getBidHistory = (limit = 20) => {
  const data = readAuctionData();
  const history = data.bidHistory || [];
  
  // 返回最新的记录
  return history.slice(0, limit);
};

/**
 * 获取所有出价历史（用于统计等）
 * @returns {Array} 所有出价历史记录
 */
export const getAllBidHistory = () => {
  const data = readAuctionData();
  return data.bidHistory || [];
};

