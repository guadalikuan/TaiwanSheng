/**
 * RWA份额跟踪器
 * 跟踪每个用户对每个资产的持有份额（支持0.0001精度）
 */

import { put, get, getAll, del, NAMESPACES } from './rocksdb.js';
import { getAssetById } from './storage.js';

// 份额精度常量
export const SHARE_PRECISION = 0.0001;

/**
 * 格式化份额（保留4位小数）
 * @param {number} shares - 原始份额
 * @returns {number} 格式化后的份额
 */
export const formatShares = (shares) => {
  return Math.round(shares / SHARE_PRECISION) * SHARE_PRECISION;
};

/**
 * 记录用户持有份额
 * @param {string} userId - 用户ID
 * @param {string} assetId - 资产ID
 * @param {number} shares - 份额数量（可以是小数，最小0.0001）
 * @returns {Promise<Object>} 持有记录
 */
export const recordShareHolding = async (userId, assetId, shares) => {
  if (shares < SHARE_PRECISION && shares !== 0) {
    throw new Error(`Shares must be at least ${SHARE_PRECISION}`);
  }
  
  const holdingId = `${userId}_${assetId}`;
  const formattedShares = formatShares(shares);
  
  try {
    const existing = await get(NAMESPACES.SHARE_HOLDINGS, holdingId);
    const currentShares = existing?.value?.shares || 0;
    const newShares = formatShares(currentShares + formattedShares);
    
    // 如果份额为0或负数，删除记录
    if (newShares <= 0) {
      try {
        await del(NAMESPACES.SHARE_HOLDINGS, holdingId);
        return null;
      } catch (error) {
        // 如果删除失败，继续更新为0
      }
    }
    
    const holding = {
      id: holdingId,
      userId,
      assetId,
      shares: newShares,
      updatedAt: Date.now()
    };
    
    if (!existing) {
      holding.createdAt = Date.now();
    } else {
      holding.createdAt = existing.value.createdAt || Date.now();
    }
    
    await put(NAMESPACES.SHARE_HOLDINGS, holdingId, holding);
    return holding;
  } catch (error) {
    if (error.notFound || error.code === 'LEVEL_NOT_FOUND') {
      // 新记录
      if (formattedShares <= 0) {
        return null;
      }
      
      const holding = {
        id: holdingId,
        userId,
        assetId,
        shares: formattedShares,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await put(NAMESPACES.SHARE_HOLDINGS, holdingId, holding);
      return holding;
    }
    throw error;
  }
};

/**
 * 获取用户对资产的持有份额
 * @param {string} userId - 用户ID
 * @param {string} assetId - 资产ID
 * @returns {Promise<number>} 持有份额
 */
export const getUserAssetShares = async (userId, assetId) => {
  const holdingId = `${userId}_${assetId}`;
  try {
    const result = await get(NAMESPACES.SHARE_HOLDINGS, holdingId);
    return result?.value?.shares || 0;
  } catch (error) {
    if (error.notFound || error.code === 'LEVEL_NOT_FOUND') return 0;
    throw error;
  }
};

/**
 * 获取用户的所有持有资产
 * @param {string} userId - 用户ID
 * @returns {Promise<Array>} 持有记录列表
 */
export const getUserHoldings = async (userId) => {
  try {
    const allHoldings = await getAll(NAMESPACES.SHARE_HOLDINGS);
    const holdings = allHoldings
      .map(h => h.value)
      .filter(h => h.userId === userId && h.shares > 0);
    
    // 获取资产详情并计算价值
    const holdingsWithAssets = await Promise.all(
      holdings.map(async (holding) => {
        try {
          const assetData = await getAssetById(holding.assetId);
          const asset = assetData.sanitized || assetData.raw;
          
          if (!asset) {
            return { ...holding, asset: null, value: 0 };
          }
          
          // 计算资产总价和总份额
          const totalPrice = asset.financials?.totalTokens || asset.tokenPrice || asset.debtAmount || 0;
          const totalShares = asset.totalShares || 10000; // 默认10000份
          const pricePerShare = totalPrice / totalShares;
          const value = holding.shares * pricePerShare;
          
          return {
            ...holding,
            asset,
            pricePerShare,
            value
          };
        } catch (error) {
          console.error(`Error loading asset ${holding.assetId}:`, error);
          return { ...holding, asset: null, value: 0 };
        }
      })
    );
    
    return holdingsWithAssets;
  } catch (error) {
    console.error('Error getting user holdings:', error);
    return [];
  }
};

/**
 * 获取资产的所有持有者
 * @param {string} assetId - 资产ID
 * @returns {Promise<Array>} 持有者列表（按份额降序）
 */
export const getAssetHolders = async (assetId) => {
  try {
    const allHoldings = await getAll(NAMESPACES.SHARE_HOLDINGS);
    const holders = allHoldings
      .map(h => h.value)
      .filter(h => h.assetId === assetId && h.shares > 0)
      .sort((a, b) => b.shares - a.shares);
    
    return holders;
  } catch (error) {
    console.error('Error getting asset holders:', error);
    return [];
  }
};

/**
 * 转移份额
 * @param {string} fromUserId - 转出用户ID
 * @param {string} toUserId - 转入用户ID
 * @param {string} assetId - 资产ID
 * @param {number} shares - 转移份额
 * @returns {Promise<Object>} 转移结果
 */
export const transferShares = async (fromUserId, toUserId, assetId, shares) => {
  if (shares < SHARE_PRECISION) {
    throw new Error(`Shares must be at least ${SHARE_PRECISION}`);
  }
  
  // 检查转出方是否有足够份额
  const fromShares = await getUserAssetShares(fromUserId, assetId);
  if (fromShares < shares) {
    throw new Error('Insufficient shares');
  }
  
  // 减少转出方份额
  await recordShareHolding(fromUserId, assetId, -shares);
  
  // 增加转入方份额
  await recordShareHolding(toUserId, assetId, shares);
  
  return {
    success: true,
    fromUserId,
    toUserId,
    assetId,
    shares: formatShares(shares)
  };
};

/**
 * 计算用户的总资产价值
 * @param {string} userId - 用户ID
 * @returns {Promise<number>} 总价值（TOT）
 */
export const calculateUserTotalValue = async (userId) => {
  const holdings = await getUserHoldings(userId);
  return holdings.reduce((sum, holding) => sum + (holding.value || 0), 0);
};

