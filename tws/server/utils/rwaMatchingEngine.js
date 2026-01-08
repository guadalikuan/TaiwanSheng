/**
 * RWA撮合引擎
 * 匹配买卖订单，执行交易
 */

import { getOrderBook, getOrder, updateOrder, getAssetSellOrders } from './rwaOrderBook.js';
import { put, NAMESPACES } from './rocksdb.js';
import { getAssetById } from './storage.js';
import { updateAssetStatus } from './storage.js';

/**
 * 执行撮合
 * @param {Object} options - 撮合选项
 * @returns {Promise<Array>} 新生成的交易记录
 */
export const matchOrders = async (options = {}) => {
  const { city = null, maxMatches = 10 } = options;
  
  try {
    // 获取订单簿
    const { buys, sells } = await getOrderBook(city, 50);
    
    const newTrades = [];
    const processedBuyIds = new Set();
    const processedSellIds = new Set();
    
    // 撮合逻辑：遍历买单，寻找匹配的卖单
    for (const buyOrder of buys) {
      if (processedBuyIds.has(buyOrder.id)) continue;
      if (newTrades.length >= maxMatches) break;
      
      // 查找匹配的卖单
      for (const sellOrder of sells) {
        if (processedSellIds.has(sellOrder.id)) continue;
        if (newTrades.length >= maxMatches) break;
        
        // 检查是否可以撮合
        if (canMatch(buyOrder, sellOrder)) {
          try {
            const trade = await executeMatch(buyOrder, sellOrder);
            if (trade) {
              newTrades.push(trade);
              processedBuyIds.add(buyOrder.id);
              processedSellIds.add(sellOrder.id);
            }
          } catch (error) {
            console.error('Error executing match:', error);
            // 继续处理下一个
          }
        }
      }
    }
    
    return newTrades;
  } catch (error) {
    console.error('Error matching orders:', error);
    return [];
  }
};

/**
 * 检查两个订单是否可以撮合
 * @param {Object} buyOrder - 买单
 * @param {Object} sellOrder - 卖单
 * @returns {boolean} 是否可以撮合
 */
const canMatch = (buyOrder, sellOrder) => {
  // 1. 价格匹配：买单价格 >= 卖单价格
  if (buyOrder.price < sellOrder.price) {
    return false;
  }
  
  // 2. 地理位置匹配：买单的偏好城市必须匹配卖单的资产城市
  if (buyOrder.preferredCity && sellOrder.assetId) {
    // 需要获取资产信息来检查城市
    // 这里先简化，后续在executeMatch中验证
  }
  
  // 3. 订单状态必须是pending
  if (buyOrder.status !== 'pending' || sellOrder.status !== 'pending') {
    return false;
  }
  
  // 4. 订单未过期
  const now = Date.now();
  if (buyOrder.expiresAt < now || sellOrder.expiresAt < now) {
    return false;
  }
  
  // 5. 订单未完全成交
  const buyRemaining = (buyOrder.amount || 1) - (buyOrder.filledAmount || 0);
  const sellRemaining = (sellOrder.amount || 1) - (sellOrder.filledAmount || 0);
  
  if (buyRemaining <= 0 || sellRemaining <= 0) {
    return false;
  }
  
  return true;
};

/**
 * 执行撮合交易
 * @param {Object} buyOrder - 买单
 * @param {Object} sellOrder - 卖单
 * @returns {Promise<Object|null>} 交易记录
 */
const executeMatch = async (buyOrder, sellOrder) => {
  try {
    // 重新获取订单（确保数据最新）
    const freshBuyOrder = await getOrder(buyOrder.id);
    const freshSellOrder = await getOrder(sellOrder.id);
    
    if (!freshBuyOrder || !freshSellOrder) {
      return null;
    }
    
    // 再次验证撮合条件
    if (!canMatch(freshBuyOrder, freshSellOrder)) {
      return null;
    }
    
    // 获取资产信息（用于验证地理位置）
    if (freshSellOrder.assetId) {
      const assetData = await getAssetById(freshSellOrder.assetId);
      if (assetData.sanitized) {
        const assetCity = assetData.sanitized.city || assetData.sanitized.locationTag || '';
        if (freshBuyOrder.preferredCity && 
            assetCity !== freshBuyOrder.preferredCity &&
            !assetCity.includes(freshBuyOrder.preferredCity) &&
            !freshBuyOrder.preferredCity.includes(assetCity)) {
          // 地理位置不匹配，跳过
          return null;
        }
        
        // 检查资产状态（必须是LOCKED，表示已购买）
        if (assetData.sanitized.status !== 'LOCKED') {
          // 资产未购买，不能进行二级市场交易
          return null;
        }
      }
    }
    
    // 计算成交数量和价格
    const buyRemaining = (freshBuyOrder.amount || 1) - (freshBuyOrder.filledAmount || 0);
    const sellRemaining = (freshSellOrder.amount || 1) - (freshSellOrder.filledAmount || 0);
    const matchAmount = Math.min(buyRemaining, sellRemaining);
    
    // 撮合价格：使用卖单价格（maker price）
    const matchPrice = freshSellOrder.price;
    
    // 创建交易记录
    const trade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      buyOrderId: freshBuyOrder.id,
      sellOrderId: freshSellOrder.id,
      assetId: freshSellOrder.assetId,
      buyerId: freshBuyOrder.userId,
      sellerId: freshSellOrder.userId,
      price: matchPrice,
      amount: matchAmount,
      timestamp: Date.now(),
      txHash: null // 链上交易哈希（后续添加）
    };
    
    // 保存交易记录
    await put(NAMESPACES.RWA_TRADES, trade.id, trade);
    
    // 更新订单状态
    const newBuyFilled = (freshBuyOrder.filledAmount || 0) + matchAmount;
    const newSellFilled = (freshSellOrder.filledAmount || 0) + matchAmount;
    
    if (newBuyFilled >= (freshBuyOrder.amount || 1)) {
      await updateOrder(freshBuyOrder.id, { 
        status: 'filled',
        filledAmount: newBuyFilled
      });
    } else {
      await updateOrder(freshBuyOrder.id, { 
        filledAmount: newBuyFilled
      });
    }
    
    if (newSellFilled >= (freshSellOrder.amount || 1)) {
      await updateOrder(freshSellOrder.id, { 
        status: 'filled',
        filledAmount: newSellFilled
      });
    } else {
      await updateOrder(freshSellOrder.id, { 
        filledAmount: newSellFilled
      });
    }
    
    // 更新资产所有权（如果是全额交易）
    if (freshSellOrder.assetId && matchAmount >= (freshSellOrder.amount || 1)) {
      await updateAssetStatus(freshSellOrder.assetId, 'LOCKED', {
        purchasedBy: freshBuyOrder.userId,
        purchasedAt: Date.now(),
        purchasePrice: matchPrice,
        previousOwner: freshSellOrder.userId
      });
    }
    
    return trade;
  } catch (error) {
    console.error('Error executing match:', error);
    return null;
  }
};

/**
 * 获取交易历史
 * @param {Object} options - 查询选项
 * @returns {Promise<Array>} 交易记录列表
 */
export const getTradeHistory = async (options = {}) => {
  const { userId = null, assetId = null, limit = 50 } = options;
  
  try {
    const allTrades = await getAll(NAMESPACES.RWA_TRADES);
    const tradeValues = allTrades.map(t => t.value);
    
    let filtered = tradeValues;
    
    if (userId) {
      filtered = filtered.filter(trade => 
        trade.buyerId === userId || trade.sellerId === userId
      );
    }
    
    if (assetId) {
      filtered = filtered.filter(trade => trade.assetId === assetId);
    }
    
    // 按时间降序排序
    filtered.sort((a, b) => b.timestamp - a.timestamp);
    
    return filtered.slice(0, limit);
  } catch (error) {
    console.error('Error getting trade history:', error);
    return [];
  }
};

/**
 * 获取交易统计
 * @param {Object} options - 统计选项
 * @returns {Promise<Object>} 统计信息
 */
export const getTradeStats = async (options = {}) => {
  const { timeWindow = 24 * 60 * 60 * 1000 } = options; // 默认24小时
  
  try {
    const allTrades = await getAll(NAMESPACES.RWA_TRADES);
    const tradeValues = allTrades.map(t => t.value);
    
    const now = Date.now();
    const windowStart = now - timeWindow;
    
    const recentTrades = tradeValues.filter(trade => trade.timestamp >= windowStart);
    
    const totalVolume = recentTrades.reduce((sum, trade) => {
      return sum + (trade.price * trade.amount);
    }, 0);
    
    const totalCount = recentTrades.length;
    
    const avgPrice = totalCount > 0 ? 
      recentTrades.reduce((sum, trade) => sum + trade.price, 0) / totalCount : 0;
    
    return {
      totalTrades: totalCount,
      totalVolume,
      avgPrice: Math.round(avgPrice * 100) / 100,
      timeWindow
    };
  } catch (error) {
    console.error('Error getting trade stats:', error);
    return {
      totalTrades: 0,
      totalVolume: 0,
      avgPrice: 0,
      timeWindow
    };
  }
};

