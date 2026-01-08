/**
 * RWA订单簿管理
 * 管理买卖订单的创建、查询、更新和删除
 */

import { put, get, getAll, del, NAMESPACES } from './rocksdb.js';

/**
 * 创建订单
 * @param {Object} order - 订单对象
 * @returns {Promise<Object>} 创建的订单
 */
export const createOrder = async (order) => {
  if (!order.id || !order.userId || !order.orderType || !order.price) {
    throw new Error('Invalid order: missing required fields');
  }
  
  if (order.orderType !== 'buy' && order.orderType !== 'sell') {
    throw new Error('Invalid order type: must be "buy" or "sell"');
  }
  
  // 卖单必须指定assetId
  if (order.orderType === 'sell' && !order.assetId) {
    throw new Error('Sell order must specify assetId');
  }
  
  // 买单必须指定preferredCity
  if (order.orderType === 'buy' && !order.preferredCity) {
    throw new Error('Buy order must specify preferredCity');
  }
  
  const newOrder = {
    ...order,
    status: 'pending',
    filledAmount: 0,
    createdAt: order.createdAt || Date.now(),
    expiresAt: order.expiresAt || (Date.now() + 7 * 24 * 60 * 60 * 1000) // 默认7天过期
  };
  
  await put(NAMESPACES.RWA_ORDERS, newOrder.id, newOrder);
  return newOrder;
};

/**
 * 获取订单
 * @param {string} orderId - 订单ID
 * @returns {Promise<Object|null>} 订单对象
 */
export const getOrder = async (orderId) => {
  try {
    const result = await get(NAMESPACES.RWA_ORDERS, orderId);
    return result?.value || null;
  } catch (error) {
    if (error.notFound) return null;
    throw error;
  }
};

/**
 * 更新订单
 * @param {string} orderId - 订单ID
 * @param {Object} updates - 更新字段
 * @returns {Promise<Object>} 更新后的订单
 */
export const updateOrder = async (orderId, updates) => {
  const order = await getOrder(orderId);
  if (!order) {
    throw new Error('Order not found');
  }
  
  const updatedOrder = {
    ...order,
    ...updates,
    updatedAt: Date.now()
  };
  
  await put(NAMESPACES.RWA_ORDERS, orderId, updatedOrder);
  return updatedOrder;
};

/**
 * 删除订单
 * @param {string} orderId - 订单ID
 * @returns {Promise<boolean>} 是否成功
 */
export const deleteOrder = async (orderId) => {
  try {
    await del(NAMESPACES.RWA_ORDERS, orderId);
    return true;
  } catch (error) {
    if (error.notFound) return false;
    throw error;
  }
};

/**
 * 获取用户的订单列表
 * @param {string} userId - 用户ID
 * @param {string} orderType - 订单类型（可选）
 * @param {string} status - 订单状态（可选）
 * @returns {Promise<Array>} 订单列表
 */
export const getUserOrders = async (userId, orderType = null, status = null) => {
  try {
    const allOrders = await getAll(NAMESPACES.RWA_ORDERS);
    const orderValues = allOrders.map(o => o.value);
    
    let filtered = orderValues.filter(order => order.userId === userId);
    
    if (orderType) {
      filtered = filtered.filter(order => order.orderType === orderType);
    }
    
    if (status) {
      filtered = filtered.filter(order => order.status === status);
    }
    
    // 按创建时间降序排序
    filtered.sort((a, b) => b.createdAt - a.createdAt);
    
    return filtered;
  } catch (error) {
    console.error('Error getting user orders:', error);
    return [];
  }
};

/**
 * 获取订单簿（买卖盘）
 * @param {string} city - 城市筛选（可选）
 * @param {number} limit - 每边返回数量限制
 * @returns {Promise<Object>} { buys: [], sells: [] }
 */
export const getOrderBook = async (city = null, limit = 20) => {
  try {
    const allOrders = await getAll(NAMESPACES.RWA_ORDERS);
    const orderValues = allOrders.map(o => o.value);
    
    // 筛选有效订单
    const now = Date.now();
    const validOrders = orderValues.filter(order => 
      order.status === 'pending' && 
      order.expiresAt > now &&
      order.filledAmount < (order.amount || 1)
    );
    
    const buys = validOrders.filter(o => o.orderType === 'buy');
    const sells = validOrders.filter(o => o.orderType === 'sell');
    
    // 如果有城市筛选，对买单进行筛选
    if (city) {
      const filteredBuys = buys.filter(o => 
        !o.preferredCity || 
        o.preferredCity === city || 
        o.preferredCity.includes(city) ||
        city.includes(o.preferredCity)
      );
      
      // 对卖单，需要获取资产信息进行筛选
      // 这里简化处理，返回所有卖单，由调用方处理
      
      return {
        buys: filteredBuys
          .sort((a, b) => b.price - a.price) // 买单：价格高优先
          .slice(0, limit),
        sells: sells
          .sort((a, b) => a.price - b.price) // 卖单：价格低优先
          .slice(0, limit)
      };
    }
    
    return {
      buys: buys
        .sort((a, b) => b.price - a.price)
        .slice(0, limit),
      sells: sells
        .sort((a, b) => a.price - b.price)
        .slice(0, limit)
    };
  } catch (error) {
    console.error('Error getting order book:', error);
    return { buys: [], sells: [] };
  }
};

/**
 * 获取资产的卖单
 * @param {string} assetId - 资产ID
 * @returns {Promise<Array>} 卖单列表
 */
export const getAssetSellOrders = async (assetId) => {
  try {
    const allOrders = await getAll(NAMESPACES.RWA_ORDERS);
    const orderValues = allOrders.map(o => o.value);
    
    return orderValues.filter(order => 
      order.orderType === 'sell' && 
      order.assetId === assetId &&
      order.status === 'pending'
    );
  } catch (error) {
    console.error('Error getting asset sell orders:', error);
    return [];
  }
};

/**
 * 取消订单
 * @param {string} orderId - 订单ID
 * @param {string} userId - 用户ID（验证权限）
 * @returns {Promise<boolean>} 是否成功
 */
export const cancelOrder = async (orderId, userId) => {
  const order = await getOrder(orderId);
  if (!order) {
    throw new Error('Order not found');
  }
  
  if (order.userId !== userId) {
    throw new Error('Unauthorized: can only cancel your own orders');
  }
  
  if (order.status !== 'pending') {
    throw new Error('Can only cancel pending orders');
  }
  
  await updateOrder(orderId, { status: 'cancelled' });
  return true;
};

/**
 * 清理过期订单
 * @returns {Promise<number>} 清理的订单数量
 */
export const cleanupExpiredOrders = async () => {
  try {
    const allOrders = await getAll(NAMESPACES.RWA_ORDERS);
    const orderValues = allOrders.map(o => o.value);
    const now = Date.now();
    
    let cleanedCount = 0;
    
    for (const order of orderValues) {
      if (order.status === 'pending' && order.expiresAt < now) {
        await updateOrder(order.id, { status: 'expired' });
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning up expired orders:', error);
    return 0;
  }
};

