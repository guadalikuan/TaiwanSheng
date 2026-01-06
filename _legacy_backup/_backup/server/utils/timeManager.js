import { pushUpdate } from './sseManager.js';
import { TimeConfig } from '../models/Schemas.js';

// 初始默认目标时间：2027年12月31日
const DEFAULT_TARGET_DATE = '2027-12-31T00:00:00.000Z';

let cachedTimeData = null;

/**
 * 初始化时间管理器
 * 从 MongoDB 加载数据，如果失败则回退到内存默认值
 */
export const initTimeManager = async () => {
  try {
    // 尝试从数据库获取单例配置
    const doc = await TimeConfig.getSingleton();
    
    cachedTimeData = {
      targetTime: doc.targetTime,
      totalAdjustmentMs: doc.totalAdjustmentMs,
      lastUpdated: doc.lastUpdated,
      history: doc.history.map(h => ({
        timestamp: h.timestamp,
        adjustment: h.adjustment,
        reason: h.reason,
        source: h.source
      }))
    };
    
    console.log('🕒 加载倒计时配置:', new Date(cachedTimeData.targetTime).toISOString());
  } catch (error) {
    console.warn('Failed to load TimeManager from DB (using in-memory fallback):', error.message);
    // Fallback in memory
    cachedTimeData = {
      targetTime: new Date(DEFAULT_TARGET_DATE).getTime(),
      totalAdjustmentMs: 0,
      lastUpdated: new Date(),
      history: []
    };
  }
};

/**
 * 保存数据到 MongoDB
 */
const saveTimeData = async () => {
  if (!cachedTimeData) return;
  
  try {
    const doc = await TimeConfig.findOne();
    if (doc) {
      doc.targetTime = cachedTimeData.targetTime;
      doc.totalAdjustmentMs = cachedTimeData.totalAdjustmentMs;
      doc.lastUpdated = new Date();
      doc.history = cachedTimeData.history;
      await doc.save();
      // console.log('💾 时间数据已保存至 DB');
    }
  } catch (error) {
    console.error('Failed to save time data to DB:', error.message);
  }
};

/**
 * 获取当前目标时间
 */
export const getTargetTime = () => {
  // 如果尚未初始化，返回默认值（虽然 initTimeManager 应该在启动时被调用）
  if (!cachedTimeData) return new Date(DEFAULT_TARGET_DATE).getTime();
  return cachedTimeData.targetTime;
};

/**
 * 调整目标时间
 * @param {number} ms - 调整毫秒数（负数代表时间提前/加速，正数代表延后）
 * @param {string} reason - 调整原因
 * @param {string} source - 来源 (e.g., 'Oracle', 'Market')
 */
export const adjustTime = (ms, reason, source = 'System') => {
  // 确保缓存已初始化
  if (!cachedTimeData) {
    // 紧急初始化内存值
    cachedTimeData = {
      targetTime: new Date(DEFAULT_TARGET_DATE).getTime(),
      totalAdjustmentMs: 0,
      lastUpdated: new Date(),
      history: []
    };
  }

  if (ms === 0) return cachedTimeData.targetTime;

  // 更新目标时间
  cachedTimeData.targetTime += ms;
  cachedTimeData.totalAdjustmentMs += ms;
  cachedTimeData.lastUpdated = new Date();
  
  // 记录历史
  cachedTimeData.history.unshift({
    timestamp: Date.now(),
    adjustment: ms,
    reason,
    source
  });
  
  // 保持历史记录长度
  if (cachedTimeData.history.length > 50) {
    cachedTimeData.history.pop();
  }

  // 异步保存到数据库，不阻塞返回
  saveTimeData().catch(err => console.error('Async save failed:', err.message));

  console.log(`⏱️ 时间调整: ${ms > 0 ? '+' : ''}${ms/1000/60}分钟 (${reason}) -> 新目标: ${new Date(cachedTimeData.targetTime).toISOString()}`);

  // 立即广播更新
  pushUpdate('omega', 'update', {
    etuTargetTime: cachedTimeData.targetTime
  });

  return cachedTimeData.targetTime;
};

/**
 * 获取完整时间数据
 */
export const getTimeData = () => {
  if (!cachedTimeData) return {
    targetTime: new Date(DEFAULT_TARGET_DATE).getTime(),
    totalAdjustmentMs: 0,
    lastUpdated: new Date(),
    history: []
  };
  return cachedTimeData;
};