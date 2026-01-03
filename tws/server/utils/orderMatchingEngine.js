import { readFileSync, existsSync, renameSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { put, get, getAll, del, NAMESPACES } from './rocksdb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../data');
const ORDER_BOOK_FILE = join(DATA_DIR, 'orderBook.json');
const ORDER_BOOK_BAK_FILE = join(DATA_DIR, 'orderBook.json.bak');
const TRADES_FILE = join(DATA_DIR, 'trades.json');
const TRADES_BAK_FILE = join(DATA_DIR, 'trades.json.bak');

// 初始化订单簿数据（迁移旧数据）
const initOrderBookData = async () => {
  try {
    const existingOrders = await getAll(NAMESPACES.ORDER_BOOK);
    if (existingOrders.length === 0 && existsSync(ORDER_BOOK_FILE)) {
      console.log('[Migration] Migrating order book to RocksDB...');
      const data = JSON.parse(readFileSync(ORDER_BOOK_FILE, 'utf8'));
      
      if (data.buys) {
        for (const order of data.buys) {
          await put(NAMESPACES.ORDER_BOOK, order.id, { ...order, type: 'buy' });
        }
      }
      if (data.sells) {
        for (const order of data.sells) {
          await put(NAMESPACES.ORDER_BOOK, order.id, { ...order, type: 'sell' });
        }
      }
      renameSync(ORDER_BOOK_FILE, ORDER_BOOK_BAK_FILE);
      console.log('[Migration] Order book migration complete.');
    }

    const existingTrades = await getAll(NAMESPACES.TRADES);
    if (existingTrades.length === 0 && existsSync(TRADES_FILE)) {
      console.log('[Migration] Migrating trades to RocksDB...');
      const trades = JSON.parse(readFileSync(TRADES_FILE, 'utf8'));
      for (const trade of trades) {
        await put(NAMESPACES.TRADES, trade.id, trade);
      }
      renameSync(TRADES_FILE, TRADES_BAK_FILE);
      console.log('[Migration] Trades migration complete.');
    }
  } catch (error) {
    console.error('[Migration] Error initializing order book data:', error);
  }
};

// 初始化数据
initOrderBookData();

// 从数据库读取并排序订单簿
const getOrderBookFromDB = async () => {
  try {
    const orders = await getAll(NAMESPACES.ORDER_BOOK);
    const orderValues = orders.map(o => o.value);
    const buys = orderValues.filter(o => o.type === 'buy');
    const sells = orderValues.filter(o => o.type === 'sell');

    // 买单：价格高优先，时间早优先
    buys.sort((a, b) => {
      if (b.price !== a.price) return b.price - a.price;
      return a.createdAt - b.createdAt;
    });

    // 卖单：价格低优先，时间早优先
    sells.sort((a, b) => {
      if (a.price !== b.price) return a.price - b.price;
      return a.createdAt - b.createdAt;
    });

    return { buys, sells };
  } catch (error) {
    console.error('Error reading order book from DB:', error);
    return { buys: [], sells: [] };
  }
};

/**
 * 提交订单到订单簿
 * @param {Object} order - 订单 {id, userId, type, price, amount, timestamp}
 * @returns {Object} 提交的订单
 */
export const submitOrder = async (order) => {
  // 验证订单
  if (!order.id || !order.type || !order.price || !order.amount) {
    throw new Error('Invalid order: missing required fields');
  }
  
  if (order.type !== 'buy' && order.type !== 'sell') {
    throw new Error('Invalid order type: must be "buy" or "sell"');
  }

  const newOrder = {
    ...order,
    remainingAmount: order.amount,
    status: 'pending',
    createdAt: order.timestamp || Date.now()
  };
  
  await put(NAMESPACES.ORDER_BOOK, newOrder.id, newOrder);
  return newOrder;
};

/**
 * 撮合订单
 * @returns {Array} 新生成的成交记录数组
 */
export const matchOrders = async () => {
  const { buys, sells } = await getOrderBookFromDB();
  const newTrades = [];
  
  // 撮合逻辑：买单价格 >= 卖单价格时撮合
  while (buys.length > 0 && sells.length > 0) {
    const bestBuy = buys[0]; // 最高买单
    const bestSell = sells[0]; // 最低卖单
    
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
      await put(NAMESPACES.TRADES, trade.id, trade);
      
      // 更新订单剩余数量
      bestBuy.remainingAmount -= matchAmount;
      bestSell.remainingAmount -= matchAmount;
      
      // 更新或删除订单
      if (bestBuy.remainingAmount <= 0) {
        await del(NAMESPACES.ORDER_BOOK, bestBuy.id);
        buys.shift();
      } else {
        await put(NAMESPACES.ORDER_BOOK, bestBuy.id, bestBuy);
      }

      if (bestSell.remainingAmount <= 0) {
        await del(NAMESPACES.ORDER_BOOK, bestSell.id);
        sells.shift();
      } else {
        await put(NAMESPACES.ORDER_BOOK, bestSell.id, bestSell);
      }
    } else {
      break;
    }
  }
  
  // 清理过期成交记录 (保留最近24小时)
  // 注意：全量扫描清理可能比较耗时，可以考虑单独的任务处理，或者只在特定时间清理
  // 这里简化处理：每次撮合不强制清理，或者异步清理
  
  return newTrades;
};

/**
 * 获取订单簿（格式化用于显示）
 * @param {number} limit - 限制返回的订单数量
 * @returns {Object} {asks: [], bids: []}
 */
export const getOrderBook = async (limit = 10) => {
  try {
    const { buys, sells } = await getOrderBookFromDB();
    
    // 格式化卖单（asks）
    const asks = sells
      .slice(0, limit)
      .map(order => ({
        price: typeof order.price === 'number' ? order.price : parseFloat(order.price) || 0,
        amount: typeof order.remainingAmount === 'number' ? order.remainingAmount : parseFloat(order.remainingAmount) || 0
      }))
      .filter(order => order.price > 0 && order.amount > 0);
    
    // 格式化买单（bids）
    const bids = buys
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
 * 获取当前市场价格（基于最新成交价格）
 * @returns {number|null} 当前价格
 */
export const getCurrentPrice = async () => {
  try {
    const trades = await getAll(NAMESPACES.TRADES);
    if (!Array.isArray(trades) || trades.length === 0) {
      return null;
    }
    const tradeValues = trades.map(t => t.value);
    // 按时间排序，取最后一个
    tradeValues.sort((a, b) => a.timestamp - b.timestamp);
    const lastTrade = tradeValues[tradeValues.length - 1];
    
    if (!lastTrade || typeof lastTrade.price !== 'number' || isNaN(lastTrade.price) || !isFinite(lastTrade.price)) {
      return null;
    }
    return lastTrade.price;
  } catch (error) {
    console.error('Error getting current price:', error);
    return null;
  }
};

/**
 * 获取最近的成交记录
 * @param {number} limit - 限制返回的数量
 * @returns {Array} 成交记录数组
 */
export const getRecentTrades = async (limit = 20) => {
  try {
    const trades = await getAll(NAMESPACES.TRADES);
    if (!Array.isArray(trades)) {
      return [];
    }
    const tradeValues = trades.map(t => t.value);
    // 按时间排序
    tradeValues.sort((a, b) => a.timestamp - b.timestamp);
    // 返回最近的成交记录
    return tradeValues.slice(-limit).reverse();
  } catch (error) {
    console.error('Error getting recent trades:', error);
    return [];
  }
};

/**
 * 计算24小时价格变化
 * @param {number} currentPrice - 当前价格
 * @returns {number} 价格变化百分比
 */
export const calculate24hPriceChange = async (currentPrice) => {
  try {
    if (!currentPrice || isNaN(currentPrice) || !isFinite(currentPrice)) {
      return 0;
    }
    
    const trades = await getAll(NAMESPACES.TRADES);
    if (!Array.isArray(trades) || trades.length === 0) {
      return 0;
    }
    
    const tradeValues = trades.map(t => t.value);
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const dayAgoTrades = tradeValues.filter(t => t && t.timestamp && t.timestamp <= oneDayAgo);
    
    if (dayAgoTrades.length === 0) {
      return 0;
    }
    
    // 找到24小时前的价格（或最接近的）
    dayAgoTrades.sort((a, b) => a.timestamp - b.timestamp);
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
export const calculate24hVolume = async () => {
  try {
    const trades = await getAll(NAMESPACES.TRADES);
    if (!Array.isArray(trades) || trades.length === 0) {
      return 0;
    }
    
    const tradeValues = trades.map(t => t.value);
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentTrades = tradeValues.filter(t => t && t.timestamp && t.timestamp >= oneDayAgo);
    
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
export const calculateVWAP = async (timeWindow = 24 * 60 * 60 * 1000) => {
  try {
    const trades = await getAll(NAMESPACES.TRADES);
    if (!Array.isArray(trades) || trades.length === 0) {
      return null;
    }
    
    const tradeValues = trades.map(t => t.value);
    const now = Date.now();
    const windowStart = now - timeWindow;
    
    // 筛选时间窗口内的成交记录
    const windowTrades = tradeValues.filter(t => 
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
export const getOrderBookStats = async () => {
  const { buys, sells } = await getOrderBookFromDB();
  return {
    totalBuyOrders: buys.length,
    totalSellOrders: sells.length,
    totalBuyAmount: buys.reduce((sum, o) => sum + o.remainingAmount, 0),
    totalSellAmount: sells.reduce((sum, o) => sum + o.remainingAmount, 0)
  };
};
