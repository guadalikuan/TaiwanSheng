import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../data');
const ORDER_BOOK_FILE = join(DATA_DIR, 'orderBook.json');
const TRADES_FILE = join(DATA_DIR, 'trades.json');

// 确保数据目录存在
const initDataDir = () => {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(ORDER_BOOK_FILE)) {
    writeFileSync(ORDER_BOOK_FILE, JSON.stringify({ buys: [], sells: [] }, null, 2), 'utf8');
  }
  if (!existsSync(TRADES_FILE)) {
    writeFileSync(TRADES_FILE, JSON.stringify([], null, 2), 'utf8');
  }
};

// 读取订单簿
const readOrderBook = () => {
  initDataDir();
  try {
    const data = readFileSync(ORDER_BOOK_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading order book:', error);
    return { buys: [], sells: [] };
  }
};

// 写入订单簿
const writeOrderBook = (orderBook) => {
  initDataDir();
  try {
    writeFileSync(ORDER_BOOK_FILE, JSON.stringify(orderBook, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing order book:', error);
    return false;
  }
};

// 读取成交记录
const readTrades = () => {
  initDataDir();
  try {
    const data = readFileSync(TRADES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading trades:', error);
    return [];
  }
};

// 写入成交记录
const writeTrades = (trades) => {
  initDataDir();
  try {
    writeFileSync(TRADES_FILE, JSON.stringify(trades, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing trades:', error);
    return false;
  }
};

/**
 * 提交订单到订单簿
 * @param {Object} order - 订单 {id, userId, type, price, amount, timestamp}
 * @returns {Object} 提交的订单
 */
export const submitOrder = (order) => {
  const orderBook = readOrderBook();
  
  // 验证订单
  if (!order.id || !order.type || !order.price || !order.amount) {
    throw new Error('Invalid order: missing required fields');
  }
  
  if (order.type !== 'buy' && order.type !== 'sell') {
    throw new Error('Invalid order type: must be "buy" or "sell"');
  }
  
  // 添加订单到对应队列
  if (order.type === 'buy') {
    // 买单：按价格从高到低排序（价格优先），相同价格按时间从早到晚（时间优先）
    orderBook.buys.push({
      ...order,
      remainingAmount: order.amount,
      status: 'pending',
      createdAt: order.timestamp || Date.now()
    });
    orderBook.buys.sort((a, b) => {
      if (b.price !== a.price) {
        return b.price - a.price; // 价格高的在前
      }
      return a.createdAt - b.createdAt; // 时间早的在前
    });
  } else {
    // 卖单：按价格从低到高排序（价格优先），相同价格按时间从早到晚（时间优先）
    orderBook.sells.push({
      ...order,
      remainingAmount: order.amount,
      status: 'pending',
      createdAt: order.timestamp || Date.now()
    });
    orderBook.sells.sort((a, b) => {
      if (a.price !== b.price) {
        return a.price - b.price; // 价格低的在前
      }
      return a.createdAt - b.createdAt; // 时间早的在前
    });
  }
  
  writeOrderBook(orderBook);
  return order;
};

/**
 * 撮合订单
 * @returns {Array} 新生成的成交记录数组
 */
export const matchOrders = () => {
  const orderBook = readOrderBook();
  const trades = readTrades();
  const newTrades = [];
  
  // 撮合逻辑：买单价格 >= 卖单价格时撮合
  while (orderBook.buys.length > 0 && orderBook.sells.length > 0) {
    const bestBuy = orderBook.buys[0]; // 最高买单
    const bestSell = orderBook.sells[0]; // 最低卖单
    
    // 检查是否可以撮合
    if (bestBuy.price >= bestSell.price) {
      // 撮合价格 = 先进入订单簿的价格（maker price）
      const matchPrice = bestBuy.createdAt < bestSell.createdAt ? bestBuy.price : bestSell.price;
      const matchAmount = Math.min(bestBuy.remainingAmount, bestSell.remainingAmount);
      
      // 创建成交记录
      const trade = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        buyOrderId: bestBuy.id,
        sellOrderId: bestSell.id,
        price: matchPrice,
        amount: matchAmount,
        timestamp: Date.now(),
        buyerId: bestBuy.userId,
        sellerId: bestSell.userId,
        buyerUsername: bestBuy.username,
        sellerUsername: bestSell.username
      };
      
      newTrades.push(trade);
      trades.push(trade);
      
      // 更新订单剩余数量
      bestBuy.remainingAmount -= matchAmount;
      bestSell.remainingAmount -= matchAmount;
      
      // 如果订单完全成交，从订单簿中移除
      if (bestBuy.remainingAmount <= 0) {
        orderBook.buys.shift();
      }
      if (bestSell.remainingAmount <= 0) {
        orderBook.sells.shift();
      }
    } else {
      // 无法撮合，退出循环
      break;
    }
  }
  
  // 保存更新后的订单簿和成交记录
  writeOrderBook(orderBook);
  
  // 只保留最近24小时的成交记录（避免文件过大）
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentTrades = trades.filter(t => t.timestamp >= oneDayAgo);
  writeTrades(recentTrades);
  
  return newTrades;
};

/**
 * 获取订单簿（格式化用于显示）
 * @param {number} limit - 限制返回的订单数量
 * @returns {Object} {asks: [], bids: []}
 */
export const getOrderBook = (limit = 10) => {
  try {
    const orderBook = readOrderBook();
    if (!orderBook || !orderBook.sells || !orderBook.buys) {
      return { asks: [], bids: [] };
    }
    
    // 格式化卖单（asks）
    const asks = (Array.isArray(orderBook.sells) ? orderBook.sells : [])
      .slice(0, limit)
      .map(order => ({
        price: typeof order.price === 'number' ? order.price : parseFloat(order.price) || 0,
        amount: typeof order.remainingAmount === 'number' ? order.remainingAmount : parseFloat(order.remainingAmount) || 0
      }))
      .filter(order => order.price > 0 && order.amount > 0);
    
    // 格式化买单（bids）
    const bids = (Array.isArray(orderBook.buys) ? orderBook.buys : [])
      .slice(0, limit)
      .map(order => ({
        price: typeof order.price === 'number' ? order.price : parseFloat(order.price) || 0,
        amount: typeof order.remainingAmount === 'number' ? order.remainingAmount : parseFloat(order.remainingAmount) || 0
      }))
      .filter(order => order.price > 0 && order.amount > 0);
    
    return { asks, bids };
  } catch (error) {
    console.error('Error getting order book:', error);
    return { asks: [], bids: [] };
  }
};

/**
 * 获取最近的成交记录
 * @param {number} limit - 限制返回的数量
 * @returns {Array} 成交记录数组
 */
export const getRecentTrades = (limit = 20) => {
  try {
    const trades = readTrades();
    if (!Array.isArray(trades)) {
      return [];
    }
    // 按时间倒序，返回最近的成交记录
    return trades.slice(-limit).reverse();
  } catch (error) {
    console.error('Error getting recent trades:', error);
    return [];
  }
};

/**
 * 获取当前市场价格（基于最新成交价格）
 * @returns {number|null} 当前价格
 */
export const getCurrentPrice = () => {
  try {
    const trades = readTrades();
    if (!Array.isArray(trades) || trades.length === 0) {
      return null;
    }
    const lastTrade = trades[trades.length - 1];
    if (!lastTrade || typeof lastTrade.price !== 'number' || isNaN(lastTrade.price) || !isFinite(lastTrade.price)) {
      return null;
    }
    // 返回最新成交价格
    return lastTrade.price;
  } catch (error) {
    console.error('Error getting current price:', error);
    return null;
  }
};

/**
 * 计算24小时价格变化
 * @param {number} currentPrice - 当前价格
 * @returns {number} 价格变化百分比
 */
export const calculate24hPriceChange = (currentPrice) => {
  try {
    if (!currentPrice || isNaN(currentPrice) || !isFinite(currentPrice)) {
      return 0;
    }
    
    const trades = readTrades();
    if (!Array.isArray(trades) || trades.length === 0) {
      return 0;
    }
    
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const dayAgoTrades = trades.filter(t => t && t.timestamp && t.timestamp <= oneDayAgo);
    
    if (dayAgoTrades.length === 0) {
      return 0;
    }
    
    // 找到24小时前的价格（或最接近的）
    const dayAgoPrice = dayAgoTrades[dayAgoTrades.length - 1]?.price;
    if (!dayAgoPrice || isNaN(dayAgoPrice) || !isFinite(dayAgoPrice) || dayAgoPrice === 0) {
      return 0;
    }
    
    const change = ((currentPrice - dayAgoPrice) / dayAgoPrice) * 100;
    return isNaN(change) || !isFinite(change) ? 0 : change;
  } catch (error) {
    console.error('Error calculating 24h price change:', error);
    return 0;
  }
};

/**
 * 计算24小时成交量
 * @returns {number} 总成交量
 */
export const calculate24hVolume = () => {
  try {
    const trades = readTrades();
    if (!Array.isArray(trades) || trades.length === 0) {
      return 0;
    }
    
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentTrades = trades.filter(t => t && t.timestamp && t.timestamp >= oneDayAgo);
    
    const volume = recentTrades.reduce((total, trade) => {
      const price = typeof trade.price === 'number' ? trade.price : parseFloat(trade.price) || 0;
      const amount = typeof trade.amount === 'number' ? trade.amount : parseFloat(trade.amount) || 0;
      return total + (price * amount);
    }, 0);
    
    return isNaN(volume) || !isFinite(volume) ? 0 : volume;
  } catch (error) {
    console.error('Error calculating 24h volume:', error);
    return 0;
  }
};

/**
 * 计算成交量加权平均价格（VWAP）
 * @param {number} timeWindow - 时间窗口（毫秒），默认24小时
 * @returns {number|null} VWAP价格，如果没有成交记录则返回null
 */
export const calculateVWAP = (timeWindow = 24 * 60 * 60 * 1000) => {
  try {
    const trades = readTrades();
    if (!Array.isArray(trades) || trades.length === 0) {
      return null;
    }
    
    const now = Date.now();
    const windowStart = now - timeWindow;
    
    // 筛选时间窗口内的成交记录
    const windowTrades = trades.filter(t => 
      t && 
      t.timestamp && 
      t.timestamp >= windowStart && 
      typeof t.price === 'number' && 
      typeof t.amount === 'number' &&
      !isNaN(t.price) && 
      !isNaN(t.amount) &&
      isFinite(t.price) && 
      isFinite(t.amount) &&
      t.price > 0 && 
      t.amount > 0
    );
    
    if (windowTrades.length === 0) {
      return null;
    }
    
    // 计算VWAP: Σ(price * volume) / Σ(volume)
    let totalPriceVolume = 0;
    let totalVolume = 0;
    
    for (const trade of windowTrades) {
      const price = trade.price;
      const volume = trade.amount;
      totalPriceVolume += price * volume;
      totalVolume += volume;
    }
    
    if (totalVolume === 0) {
      return null;
    }
    
    const vwap = totalPriceVolume / totalVolume;
    return isNaN(vwap) || !isFinite(vwap) ? null : vwap;
  } catch (error) {
    console.error('Error calculating VWAP:', error);
    return null;
  }
};

/**
 * 获取订单簿统计信息
 * @returns {Object} 统计信息
 */
export const getOrderBookStats = () => {
  const orderBook = readOrderBook();
  return {
    totalBuyOrders: orderBook.buys.length,
    totalSellOrders: orderBook.sells.length,
    totalBuyAmount: orderBook.buys.reduce((sum, o) => sum + o.remainingAmount, 0),
    totalSellAmount: orderBook.sells.reduce((sum, o) => sum + o.remainingAmount, 0)
  };
};

