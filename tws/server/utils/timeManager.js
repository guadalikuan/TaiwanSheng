import { get, put } from './rocksdb.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pushUpdate } from './sseManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../data');
const TIME_FILE = join(DATA_DIR, 'time.json');
const TIME_BAK_FILE = join(DATA_DIR, 'time.json.bak');

// 初始默认目标时间：2027年12月31日
const DEFAULT_TARGET_DATE = '2027-12-31T00:00:00.000Z';

let timeData = null;

/**
 * 初始化时间管理器
 * 检查是否存在 time.json，不存在则创建
 */
export const initTimeManager = async () => {
  try {
    // 确保数据目录存在
    if (!existsSync(DATA_DIR)) {
      console.log('📁 创建数据目录:', DATA_DIR);
      mkdirSync(DATA_DIR, { recursive: true });
    }

    // 迁移逻辑
    if (existsSync(TIME_FILE)) {
      console.log('🔄 Migrating time.json to RocksDB...');
      try {
        const raw = readFileSync(TIME_FILE, 'utf8');
        const oldTimeData = JSON.parse(raw);
        await put('system', 'timeData', oldTimeData);
        renameSync(TIME_FILE, TIME_BAK_FILE);
        console.log('✅ Time data migration completed');
      } catch (e) {
        console.error('❌ Time data migration failed:', e);
      }
    }

    // 从 RocksDB 加载
    const storedData = await get('system', 'timeData');
    if (storedData) {
      timeData = storedData;
      console.log('🕒 Loaded time data from RocksDB:', new Date(timeData.targetTime).toISOString());
    } else {
      console.log('🆕 Initializing new time data in RocksDB...');
      const targetTime = new Date(DEFAULT_TARGET_DATE).getTime();
      timeData = {
        targetTime: targetTime,
        totalAdjustmentMs: 0,
        lastUpdated: new Date().toISOString(),
        history: [] // 记录最近几次调整
      };
      await saveTimeData();
    }
  } catch (error) {
    console.error('Failed to init TimeManager:', error);
    // Fallback in memory
    timeData = {
      targetTime: new Date(DEFAULT_TARGET_DATE).getTime(),
      totalAdjustmentMs: 0,
      lastUpdated: new Date().toISOString(),
      history: []
    };
  }
};

/**
 * 保存数据到RocksDB
 */
const saveTimeData = async () => {
  try {
    if (timeData) {
      await put('system', 'timeData', timeData);
    }
  } catch (error) {
    console.error('Failed to save time data to RocksDB:', error);
  }
};

/**
 * 获取当前目标时间
 */
export const getTargetTime = () => {
  // 如果尚未初始化，返回默认值或抛出错误
  // 注意：initTimeManager现在是异步的，应该在服务器启动时调用
  if (!timeData) return new Date(DEFAULT_TARGET_DATE).getTime();
  return timeData.targetTime;
};

/**
 * 调整目标时间
 * @param {number} ms - 调整毫秒数（负数代表时间提前/加速，正数代表延后）
 * @param {string} reason - 调整原因
 * @param {string} source - 来源 (e.g., 'Oracle', 'Market')
 */
export const adjustTime = async (ms, reason, source = 'System') => {
  if (!timeData) await initTimeManager();

  if (ms === 0) return timeData.targetTime;

  // 更新目标时间
  timeData.targetTime += ms;
  timeData.totalAdjustmentMs += ms;
  timeData.lastUpdated = new Date().toISOString();
  
  // 记录历史
  timeData.history.unshift({
    timestamp: Date.now(),
    adjustment: ms,
    reason,
    source
  });
  
  // 保持历史记录长度
  if (timeData.history.length > 50) {
    timeData.history.pop();
  }

  await saveTimeData();

  console.log(`⏱️ 时间调整: ${ms > 0 ? '+' : ''}${ms/1000/60}分钟 (${reason}) -> 新目标: ${new Date(timeData.targetTime).toISOString()}`);

  // 立即广播更新
  pushUpdate('omega', 'update', {
    etuTargetTime: timeData.targetTime
  });

  return timeData.targetTime;
};

/**
 * 获取完整时间数据
 */
export const getTimeData = () => {
  return timeData;
};
