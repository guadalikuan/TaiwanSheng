import {
  simulateUserRegistration,
  simulateAssetSubmission,
  simulateAssetPurchase,
  generateOmegaEvent
} from './botBehaviorSimulator.js';

/**
 * 智能调度系统
 * 负责调度机器人行为，确保行为看起来真实
 */

// 任务间隔配置（毫秒）
const TASK_INTERVALS = {
  userRegistration: { min: 5 * 60 * 1000, max: 15 * 60 * 1000 }, // 5-15分钟
  assetSubmission: { min: 3 * 60 * 1000, max: 10 * 60 * 1000 }, // 3-10分钟
  assetPurchase: { min: 2 * 60 * 1000, max: 8 * 60 * 1000 }, // 2-8分钟
  omegaEvent: { min: 10 * 60 * 1000, max: 30 * 60 * 1000 } // 10-30分钟
};

// 活跃时段配置（小时）
const ACTIVE_HOURS = {
  start: 8, // 8:00
  end: 22   // 22:00
};

let taskTimers = {
  userRegistration: null,
  assetSubmission: null,
  assetPurchase: null,
  omegaEvent: null
};

let isRunning = false;

/**
 * 检查当前是否在活跃时段
 * @returns {boolean}
 */
const isActiveHours = () => {
  const now = new Date();
  const hour = now.getHours();
  return hour >= ACTIVE_HOURS.start && hour < ACTIVE_HOURS.end;
};

/**
 * 获取活跃度倍数（白天更活跃）
 * @returns {number} 活跃度倍数（0.5-1.5）
 */
const getActivityMultiplier = () => {
  if (isActiveHours()) {
    return 1.0 + (Math.random() * 0.5); // 1.0-1.5倍
  } else {
    return 0.5 + (Math.random() * 0.3); // 0.5-0.8倍
  }
};

/**
 * 计算下次执行时间（考虑活跃时段）
 * @param {Object} interval - 间隔配置 {min, max}
 * @returns {number} 下次执行时间（毫秒）
 */
const calculateNextExecution = (interval) => {
  const baseInterval = interval.min + Math.random() * (interval.max - interval.min);
  const multiplier = getActivityMultiplier();
  return Math.floor(baseInterval * multiplier);
};

/**
 * 调度用户注册任务
 */
const scheduleUserRegistration = () => {
  if (taskTimers.userRegistration) {
    clearTimeout(taskTimers.userRegistration);
  }
  
  const nextExecution = calculateNextExecution(TASK_INTERVALS.userRegistration);
  
  taskTimers.userRegistration = setTimeout(async () => {
    try {
      await simulateUserRegistration();
    } catch (error) {
      console.error('Error in user registration task:', error);
    }
    
    // 调度下次执行
    if (isRunning) {
      scheduleUserRegistration();
    }
  }, nextExecution);
  
  console.log(`📅 User registration scheduled in ${Math.floor(nextExecution / 1000)}s`);
};

/**
 * 调度资产提交任务
 */
const scheduleAssetSubmission = () => {
  if (taskTimers.assetSubmission) {
    clearTimeout(taskTimers.assetSubmission);
  }
  
  const nextExecution = calculateNextExecution(TASK_INTERVALS.assetSubmission);
  
  taskTimers.assetSubmission = setTimeout(async () => {
    try {
      await simulateAssetSubmission();
    } catch (error) {
      console.error('Error in asset submission task:', error);
    }
    
    // 调度下次执行
    if (isRunning) {
      scheduleAssetSubmission();
    }
  }, nextExecution);
  
  console.log(`📅 Asset submission scheduled in ${Math.floor(nextExecution / 1000)}s`);
};

/**
 * 调度资产购买任务
 */
const scheduleAssetPurchase = () => {
  if (taskTimers.assetPurchase) {
    clearTimeout(taskTimers.assetPurchase);
  }
  
  const nextExecution = calculateNextExecution(TASK_INTERVALS.assetPurchase);
  
  taskTimers.assetPurchase = setTimeout(async () => {
    try {
      await simulateAssetPurchase();
    } catch (error) {
      console.error('Error in asset purchase task:', error);
    }
    
    // 调度下次执行
    if (isRunning) {
      scheduleAssetPurchase();
    }
  }, nextExecution);
  
  console.log(`📅 Asset purchase scheduled in ${Math.floor(nextExecution / 1000)}s`);
};

/**
 * 调度Omega事件生成任务
 */
const scheduleOmegaEvent = () => {
  if (taskTimers.omegaEvent) {
    clearTimeout(taskTimers.omegaEvent);
  }
  
  const nextExecution = calculateNextExecution(TASK_INTERVALS.omegaEvent);
  
  taskTimers.omegaEvent = setTimeout(async () => {
    try {
      generateOmegaEvent();
    } catch (error) {
      console.error('Error in omega event task:', error);
    }
    
    // 调度下次执行
    if (isRunning) {
      scheduleOmegaEvent();
    }
  }, nextExecution);
  
  console.log(`📅 Omega event scheduled in ${Math.floor(nextExecution / 1000)}s`);
};

/**
 * 启动所有调度任务
 */
export const startBotScheduler = () => {
  if (isRunning) {
    console.log('⚠️  Bot scheduler is already running');
    return;
  }
  
  isRunning = true;
  console.log('🚀 Starting bot scheduler...');
  
  // 立即执行一次（可选，用于快速看到效果）
  // 或者延迟执行，让系统先初始化
  
  // 启动所有任务（使用随机初始延迟，避免同时执行）
  setTimeout(() => scheduleUserRegistration(), Math.random() * 60000); // 0-60秒随机延迟
  setTimeout(() => scheduleAssetSubmission(), Math.random() * 60000);
  setTimeout(() => scheduleAssetPurchase(), Math.random() * 60000);
  setTimeout(() => scheduleOmegaEvent(), Math.random() * 60000);
  
  console.log('✅ Bot scheduler started');
};

/**
 * 停止所有调度任务
 */
export const stopBotScheduler = () => {
  if (!isRunning) {
    console.log('⚠️  Bot scheduler is not running');
    return;
  }
  
  isRunning = false;
  
  // 清除所有定时器
  Object.keys(taskTimers).forEach(key => {
    if (taskTimers[key]) {
      clearTimeout(taskTimers[key]);
      taskTimers[key] = null;
    }
  });
  
  console.log('🛑 Bot scheduler stopped');
};

/**
 * 获取调度器状态
 * @returns {Object} 状态信息
 */
export const getSchedulerStatus = () => {
  return {
    isRunning,
    activeHours: isActiveHours(),
    activityMultiplier: getActivityMultiplier(),
    nextExecutions: {
      userRegistration: taskTimers.userRegistration ? 'scheduled' : 'none',
      assetSubmission: taskTimers.assetSubmission ? 'scheduled' : 'none',
      assetPurchase: taskTimers.assetPurchase ? 'scheduled' : 'none',
      omegaEvent: taskTimers.omegaEvent ? 'scheduled' : 'none'
    }
  };
};

