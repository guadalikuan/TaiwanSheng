import bloomFilters from 'bloom-filters';
const { BloomFilter } = bloomFilters;
import { get, put, del, getAllWithPrefix } from './rocksdb.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../data');
const HISTORY_FILE = join(DATA_DIR, 'history.json');
const HISTORY_BAK_FILE = join(DATA_DIR, 'history.json.bak');

// 初始化布隆过滤器
const bloomFilter = BloomFilter.create(10000, 0.01);
let historyCache = [];

/**
 * 初始化历史记录管理器
 */
export const initHistoryManager = async () => {
  try {
    // 确保数据目录存在
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }

    // 迁移逻辑：如果存在旧的JSON文件，将其迁移到RocksDB
    if (existsSync(HISTORY_FILE)) {
      console.log('🔄 Migrating history.json to RocksDB...');
      try {
        const raw = readFileSync(HISTORY_FILE, 'utf8');
        const oldHistory = JSON.parse(raw);
        if (Array.isArray(oldHistory)) {
           for (const item of oldHistory) {
             if (item.url) {
               // 使用URL作为key的一部分，确保唯一性
               await put('history', item.url, item);
             }
           }
        }
        renameSync(HISTORY_FILE, HISTORY_BAK_FILE);
        console.log('✅ History migration completed');
      } catch (e) {
        console.error('❌ Migration failed:', e);
      }
    }

    // 从 RocksDB 加载历史记录
    const items = await getAllWithPrefix('history');
    // 按时间戳倒序排序（最新在前）
    historyCache = items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // 限制缓存大小为1000条，避免内存过大
    if (historyCache.length > 1000) {
      historyCache = historyCache.slice(0, 1000);
    }

    // 将加载的历史记录添加到布隆过滤器
    console.log(`📚 History loaded from RocksDB: ${historyCache.length} items`);
    historyCache.forEach(item => {
      if (item.url) {
        bloomFilter.add(item.url);
      }
    });

  } catch (error) {
    console.error('❌ Init history manager failed:', error);
  }
};

/**
 * 检查是否为重复新闻
 * 策略 B：布隆过滤器初筛 + 历史记录二次核实
 * @param {string} url - 新闻链接
 * @returns {boolean} 是否重复
 */
export const isDuplicate = (url) => {
  if (!url) return false;

  // 1. 布隆过滤器初筛 (O(1))
  if (!bloomFilter.has(url)) {
    return false;
  }

  // 2. 二次核实 (O(n))
  // 注意：如果历史记录超过缓存大小(1000)，这里只能检查最近的1000条
  // 对于非常老的重复新闻，可能会漏掉检查，但RocksDB里有全量数据
  // 如果需要严格去重，可能需要查RocksDB，但这会变成异步
  // 目前保持同步接口，仅依赖缓存
  const exists = historyCache.some(item => item.url === url);
  
  if (!exists) {
    return false;
  }

  return true;
};

/**
 * 添加新记录到历史
 * @param {object} item - 历史记录项 { url, title, timestamp, analysis }
 */
export const addToHistory = async (item) => {
  if (!item || !item.url) return;

  // 1. 添加到内存缓存
  historyCache.unshift(item); // 最新在前

  // 保持历史记录长度在合理范围
  if (historyCache.length > 1000) {
    historyCache = historyCache.slice(0, 1000);
  }

  // 2. 添加到布隆过滤器
  bloomFilter.add(item.url);

  // 3. 持久化到 RocksDB
  try {
    await put('history', item.url, item);
  } catch (error) {
    console.error('❌ Failed to save history to RocksDB:', error);
  }
};

// 注意：initHistoryManager现在是异步的，需要在服务器启动时调用
// 这里不再自动调用，而是由外部调用
