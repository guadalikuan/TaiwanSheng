/**
 * 市场数据后台任务
 * 定时更新价格和K线数据
 */

import {
  startPriceUpdateTask,
  stopPriceUpdateTask,
  startKlineUpdateTask,
  stopKlineUpdateTask,
  initializeMarketDataService
} from './marketDataService.js';

let isInitialized = false;

/**
 * 启动所有市场数据任务
 */
export const startMarketDataTasks = async () => {
  if (isInitialized) {
    console.log('[MarketDataTasks] 任务已启动，跳过重复初始化');
    return;
  }

  try {
    // 初始化市场数据服务
    await initializeMarketDataService();

    // 启动价格更新任务（每10秒）
    startPriceUpdateTask();

    // 启动K线更新任务（每1分钟）
    startKlineUpdateTask();

    isInitialized = true;
    console.log('✅ 市场数据任务已启动');
  } catch (error) {
    console.error('❌ 启动市场数据任务失败:', error);
  }
};

/**
 * 停止所有市场数据任务
 */
export const stopMarketDataTasks = () => {
  stopPriceUpdateTask();
  stopKlineUpdateTask();
  isInitialized = false;
  console.log('🛑 市场数据任务已停止');
};

export default {
  startMarketDataTasks,
  stopMarketDataTasks
};

