/**
 * RWA撮合调度器
 * 定时执行撮合、清理过期订单和锁定
 */

import { matchOrders } from './rwaMatchingEngine.js';
import { cleanupExpiredOrders } from './rwaOrderBook.js';
import { processExpiredLocks } from './rwaLockManager.js';

let matchingInterval = null;
let cleanupInterval = null;

/**
 * 启动撮合调度器
 * @param {Object} options - 配置选项
 */
export const startMatchingScheduler = (options = {}) => {
  const {
    matchingIntervalMs = 30 * 1000, // 默认30秒撮合一次
    cleanupIntervalMs = 5 * 60 * 1000 // 默认5分钟清理一次
  } = options;
  
  // 停止现有调度器（如果存在）
  stopMatchingScheduler();
  
  console.log('[RWA Scheduler] 启动撮合调度器...');
  
  // 撮合任务
  matchingInterval = setInterval(async () => {
    try {
      const trades = await matchOrders({ maxMatches: 10 });
      if (trades.length > 0) {
        console.log(`[RWA Scheduler] 撮合成功: ${trades.length} 笔交易`);
      }
    } catch (error) {
      console.error('[RWA Scheduler] 撮合任务失败:', error);
    }
  }, matchingIntervalMs);
  
  // 清理任务
  cleanupInterval = setInterval(async () => {
    try {
      const expiredOrders = await cleanupExpiredOrders();
      const expiredLocks = await processExpiredLocks();
      
      if (expiredOrders > 0 || expiredLocks > 0) {
        console.log(`[RWA Scheduler] 清理完成: ${expiredOrders} 个过期订单, ${expiredLocks} 个过期锁定`);
      }
    } catch (error) {
      console.error('[RWA Scheduler] 清理任务失败:', error);
    }
  }, cleanupIntervalMs);
  
  console.log('[RWA Scheduler] ✅ 撮合调度器已启动');
  console.log(`[RWA Scheduler] 撮合间隔: ${matchingIntervalMs / 1000}秒`);
  console.log(`[RWA Scheduler] 清理间隔: ${cleanupIntervalMs / 1000}秒`);
};

/**
 * 停止撮合调度器
 */
export const stopMatchingScheduler = () => {
  if (matchingInterval) {
    clearInterval(matchingInterval);
    matchingInterval = null;
  }
  
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  
  console.log('[RWA Scheduler] 撮合调度器已停止');
};

/**
 * 手动触发撮合（用于测试）
 */
export const triggerMatching = async () => {
  try {
    const trades = await matchOrders({ maxMatches: 20 });
    return {
      success: true,
      count: trades.length,
      trades
    };
  } catch (error) {
    console.error('Error triggering matching:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

