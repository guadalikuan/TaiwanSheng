/**
 * RWA锁定管理
 * 管理资产的锁定状态、过期处理、费用退还
 */

import { put, get, getAll, del, NAMESPACES } from './rocksdb.js';
import { getAssetById, updateAssetStatus } from './storage.js';

/**
 * 创建锁定记录
 * @param {Object} lockData - 锁定数据
 * @returns {Promise<Object>} 锁定记录
 */
export const createLock = async (lockData) => {
  const lock = {
    id: lockData.id || `lock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    assetId: lockData.assetId,
    userId: lockData.userId,
    lockFee: lockData.lockFee,
    lockedAt: Date.now(),
    lockExpiresAt: lockData.lockExpiresAt || (Date.now() + 48 * 60 * 60 * 1000), // 默认48小时
    status: 'active', // active, confirmed, expired, released
    txHash: lockData.txHash || null
  };
  
  await put(NAMESPACES.RWA_LOCKS, lock.id, lock);
  return lock;
};

/**
 * 获取锁定记录
 * @param {string} lockId - 锁定ID
 * @returns {Promise<Object|null>} 锁定记录
 */
export const getLock = async (lockId) => {
  try {
    const result = await get(NAMESPACES.RWA_LOCKS, lockId);
    return result?.value || null;
  } catch (error) {
    if (error.notFound) return null;
    throw error;
  }
};

/**
 * 获取资产的锁定记录
 * @param {string} assetId - 资产ID
 * @returns {Promise<Object|null>} 当前有效的锁定记录
 */
export const getAssetLock = async (assetId) => {
  try {
    const allLocks = await getAll(NAMESPACES.RWA_LOCKS);
    const lockValues = allLocks.map(l => l.value);
    
    const now = Date.now();
    const activeLock = lockValues.find(lock => 
      lock.assetId === assetId && 
      lock.status === 'active' &&
      lock.lockExpiresAt > now
    );
    
    return activeLock || null;
  } catch (error) {
    console.error('Error getting asset lock:', error);
    return null;
  }
};

/**
 * 获取用户的锁定列表
 * @param {string} userId - 用户ID
 * @returns {Promise<Array>} 锁定记录列表
 */
export const getUserLocks = async (userId) => {
  try {
    const allLocks = await getAll(NAMESPACES.RWA_LOCKS);
    const lockValues = allLocks.map(l => l.value);
    
    return lockValues
      .filter(lock => lock.userId === userId)
      .sort((a, b) => b.lockedAt - a.lockedAt);
  } catch (error) {
    console.error('Error getting user locks:', error);
    return [];
  }
};

/**
 * 更新锁定状态
 * @param {string} lockId - 锁定ID
 * @param {string} status - 新状态
 * @returns {Promise<Object>} 更新后的锁定记录
 */
export const updateLockStatus = async (lockId, status) => {
  const lock = await getLock(lockId);
  if (!lock) {
    throw new Error('Lock not found');
  }
  
  const updatedLock = {
    ...lock,
    status,
    updatedAt: Date.now()
  };
  
  await put(NAMESPACES.RWA_LOCKS, lockId, updatedLock);
  return updatedLock;
};

/**
 * 释放锁定
 * @param {string} lockId - 锁定ID
 * @param {boolean} refundFee - 是否退还锁定费用
 * @returns {Promise<Object>} 更新后的锁定记录
 */
export const releaseLock = async (lockId, refundFee = false) => {
  const lock = await getLock(lockId);
  if (!lock) {
    throw new Error('Lock not found');
  }
  
  // 更新锁定状态
  await updateLockStatus(lockId, 'released');
  
  // 更新资产状态
  try {
    const assetData = await getAssetById(lock.assetId);
    if (assetData.sanitized && assetData.sanitized.status === 'RESERVED') {
      await updateAssetStatus(lock.assetId, 'AVAILABLE', {
        lockedBy: null,
        lockedAt: null,
        lockExpiresAt: null,
        lockFee: null
      });
    }
  } catch (error) {
    console.error('Error updating asset status on lock release:', error);
  }
  
  // 如果需要退还费用，这里可以触发退款逻辑
  if (refundFee) {
    // TODO: 实现退款逻辑
    console.log(`Refunding lock fee: ${lock.lockFee} to user ${lock.userId}`);
  }
  
  return await getLock(lockId);
};

/**
 * 处理过期锁定
 * @returns {Promise<number>} 处理的锁定数量
 */
export const processExpiredLocks = async () => {
  try {
    const allLocks = await getAll(NAMESPACES.RWA_LOCKS);
    const lockValues = allLocks.map(l => l.value);
    
    const now = Date.now();
    let processedCount = 0;
    
    for (const lock of lockValues) {
      if (lock.status === 'active' && lock.lockExpiresAt < now) {
        // 锁定已过期，自动释放
        await releaseLock(lock.id, true); // 退还费用
        processedCount++;
      }
    }
    
    return processedCount;
  } catch (error) {
    console.error('Error processing expired locks:', error);
    return 0;
  }
};

/**
 * 确认锁定（购买完成）
 * @param {string} lockId - 锁定ID
 * @returns {Promise<Object>} 更新后的锁定记录
 */
export const confirmLock = async (lockId) => {
  const lock = await getLock(lockId);
  if (!lock) {
    throw new Error('Lock not found');
  }
  
  if (lock.status !== 'active') {
    throw new Error('Can only confirm active locks');
  }
  
  const now = Date.now();
  if (lock.lockExpiresAt < now) {
    throw new Error('Lock has expired');
  }
  
  // 更新锁定状态为已确认
  await updateLockStatus(lockId, 'confirmed');
  
  return await getLock(lockId);
};

