import bloomFilters from 'bloom-filters';
const { BloomFilter } = bloomFilters;
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../data');
const HISTORY_FILE = join(DATA_DIR, 'history.json');

// 初始化布隆过滤器
// bloom-filters 库的 BloomFilter 构造函数参数为 (size, nbHashes)
// 或者使用静态方法 create(expectedItems, errorRate)
// 这里我们改用 create 方法，因为它更直观
const bloomFilter = BloomFilter.create(10000, 0.01);
let historyCache = [];

/**
 * 初始化历史记录管理器
 */
export const initHistoryManager = () => {
  try {
    // 确保数据目录存在
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }

    if (existsSync(HISTORY_FILE)) {
      const raw = readFileSync(HISTORY_FILE, 'utf8');
      try {
        historyCache = JSON.parse(raw);
        if (!Array.isArray(historyCache)) {
          historyCache = [];
        }
      } catch (e) {
        console.error('⚠️ 解析 history.json 失败，重置为空', e);
        historyCache = [];
      }
    } else {
      historyCache = [];
      saveHistory(); // 创建空文件
    }

    // 将现有历史记录加载到布隆过滤器
    console.log(`📚 加载历史记录: ${historyCache.length} 条`);
    historyCache.forEach(item => {
      if (item.url) {
        bloomFilter.add(item.url);
      }
    });

  } catch (error) {
    console.error('❌ 初始化历史管理器失败:', error);
  }
};

/**
 * 保存历史记录到磁盘
 */
const saveHistory = () => {
  try {
    writeFileSync(HISTORY_FILE, JSON.stringify(historyCache, null, 2), 'utf8');
  } catch (error) {
    console.error('❌ 保存 history.json 失败:', error);
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
  // 如果布隆过滤器说"不存在"，那就一定不存在
  if (!bloomFilter.has(url)) {
    return false;
  }

  // 2. 如果布隆过滤器说"存在"，可能是误判，需要查 historyCache 二次核实 (O(n))
  // 考虑到 historyCache 在内存中，且数量级不大，性能可以接受
  const exists = historyCache.some(item => item.url === url);
  
  if (!exists) {
    // 这种情况就是布隆过滤器的误判（False Positive）
    // 虽然 bloomFilter 认为存在，但实际记录里没有
    // 这种情况极少发生，但为了严谨我们允许通过
    return false;
  }

  return true;
};

/**
 * 添加新记录到历史
 * @param {object} item - 历史记录项 { url, title, timestamp, analysis }
 */
export const addToHistory = (item) => {
  if (!item || !item.url) return;

  // 1. 添加到内存缓存
  historyCache.unshift(item); // 最新在前

  // 保持历史记录长度在合理范围 (例如最近 1000 条)
  if (historyCache.length > 1000) {
    historyCache = historyCache.slice(0, 1000);
    // 注意：布隆过滤器不支持删除，所以如果这里删除了旧记录，
    // 布隆过滤器里依然会有。但这不影响"去重"的核心逻辑，
    // 只会轻微增加"误判为存在"的概率（然后被二次核实拦截），这是可接受的。
  }

  // 2. 添加到布隆过滤器
  bloomFilter.add(item.url);

  // 3. 持久化
  saveHistory();
};

// 立即初始化
initHistoryManager();
