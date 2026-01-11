import RocksDB from 'rocksdb';
import levelup from 'levelup';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, rmSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../data');
const ROCKSDB_DIR = join(DATA_DIR, 'rocksdb');

// 确保RocksDB目录存在
if (!existsSync(ROCKSDB_DIR)) {
  mkdirSync(ROCKSDB_DIR, { recursive: true });
}

let dbInstance = null;

/**
 * 初始化RocksDB数据库
 */
export const initRocksDB = async () => {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    // 使用 levelup + rocksdb 组合
    // 关键修复：Windows下 RocksDB 原生绑定对含中文的绝对路径支持不佳
    // 解决方案：计算相对于 CWD 的路径（只要相对路径中不含中文即可）
    // 假设在 server 目录运行，relative path 为 'data\rocksdb'
    const relativePath = relative(process.cwd(), ROCKSDB_DIR);
    console.log(`[RocksDB] Opening database at relative path: ${relativePath}`);
    
    dbInstance = levelup(RocksDB(relativePath));
    
    await dbInstance.open();
    console.log('✅ RocksDB initialized successfully (Native RocksDB)');
    return dbInstance;
  } catch (error) {
    // 检查是否是数据库损坏错误（可能在 error.message 或 error.cause 中）
    const errorMessage = error.message || '';
    const causeMessage = error.cause?.message || '';
    const errorString = JSON.stringify(error);
    const isCorruptionError = 
      errorMessage.includes('Corruption') || 
      errorMessage.includes('CURRENT file corrupted') ||
      causeMessage.includes('Corruption') ||
      causeMessage.includes('CURRENT file corrupted') ||
      errorString.includes('Corruption') ||
      errorString.includes('CURRENT file corrupted') ||
      error.name === 'OpenError' ||
      (error.cause && (error.cause.message?.includes('Corruption') || error.cause.message?.includes('CURRENT file corrupted')));
    
    if (isCorruptionError) {
      console.error('❌ RocksDB database corrupted. Attempting to repair...');
      console.log('🗑️  Removing corrupted database files...');
      
      try {
        // 关闭现有连接（如果存在）
        if (dbInstance) {
          try {
            await dbInstance.close();
          } catch (e) {
            // 忽略关闭错误
          }
          dbInstance = null;
        }
        
        // 删除损坏的数据库目录
        if (existsSync(ROCKSDB_DIR)) {
          try {
            rmSync(ROCKSDB_DIR, { recursive: true, force: true });
            console.log('✅ Corrupted database files removed');
          } catch (rmError) {
            console.warn('⚠️  Failed to remove some files, trying again after delay...');
            // 如果删除失败，可能是文件被锁定，等待后重试
            await new Promise(resolve => setTimeout(resolve, 500));
            rmSync(ROCKSDB_DIR, { recursive: true, force: true });
            console.log('✅ Corrupted database files removed (retry)');
          }
        }
        
        // 重新创建目录
        mkdirSync(ROCKSDB_DIR, { recursive: true });
        console.log('✅ Database directory recreated');
        
        // 重试初始化
        console.log('🔄 Retrying database initialization...');
        const relativePath = relative(process.cwd(), ROCKSDB_DIR);
        dbInstance = levelup(RocksDB(relativePath));
        await dbInstance.open();
        console.log('✅ RocksDB initialized successfully after repair');
        return dbInstance;
      } catch (repairError) {
        console.error('❌ Failed to repair RocksDB:', repairError);
        console.error('💡 Please run: node scripts/fix-rocksdb.js to manually fix the database');
        throw repairError;
      }
    }
    
    console.error('❌ Failed to initialize RocksDB:', error);
    throw error;
  }
};

/**
 * 获取数据库实例（如果未初始化则先初始化）
 */
export const getDB = async () => {
  if (!dbInstance) {
    await initRocksDB();
  }
  return dbInstance;
};

/**
 * 生成命名空间键
 * @param {string} namespace - 命名空间（users, assets, techProjects等）
 * @param {string} key - 键名
 * @returns {string} 完整的键
 */
export const makeKey = (namespace, key) => {
  return `${namespace}:${key}`;
};

/**
 * 解析键，提取命名空间和键名
 * @param {string} fullKey - 完整键
 * @returns {{namespace: string, key: string}} 命名空间和键名
 */
export const parseKey = (fullKey) => {
  const keyStr = Buffer.isBuffer(fullKey) ? fullKey.toString() : String(fullKey);
  const parts = keyStr.split(':');
  const namespace = parts[0];
  const key = parts.slice(1).join(':');
  return { namespace, key };
};

/**
 * 存储数据
 * @param {string} namespace - 命名空间
 * @param {string} key - 键名
 * @param {any} value - 值（会自动JSON序列化）
 */
export const put = async (namespace, key, value) => {
  const db = await getDB();
  const fullKey = makeKey(namespace, key);
  const serialized = JSON.stringify(value);
  await db.put(fullKey, serialized);
};

/**
 * 获取数据
 * @param {string} namespace - 命名空间
 * @param {string} key - 键名
 * @returns {any|null} 值（自动JSON反序列化），不存在返回null
 */
export const get = async (namespace, key) => {
  try {
    const db = await getDB();
    const fullKey = makeKey(namespace, key);
    const value = await db.get(fullKey);
    const valueStr = Buffer.isBuffer(value) ? value.toString() : String(value);
    return JSON.parse(valueStr);
  } catch (error) {
    if (error.notFound || error.code === 'LEVEL_NOT_FOUND') {
      return null;
    }
    throw error;
  }
};

/**
 * 获取指定前缀的所有数据
 * @param {string} prefix - 键前缀 (e.g. "users")
 * @returns {Promise<Array<any>>} 值数组
 */
export const getAllWithPrefix = async (prefix) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const items = [];
    // 构造查询范围
    // RocksDB的范围查询通常使用 gte (>=) 和 lt (<)
    // prefix: "users" -> gte: "users:", lt: "users;" (ASCII码 : + 1 = ;)
    // 或者使用 gt: "users:", lt: "users:\xff"
    const start = `${prefix}:`;
    const end = `${prefix}:\xff`;
    
    db.createReadStream({
      gte: start,
      lte: end,
      keys: false, // 只需值
      values: true
    })
      .on('data', (data) => {
        try {
          items.push(JSON.parse(data));
        } catch (e) {
          // 忽略解析错误
        }
      })
      .on('error', (err) => reject(err))
      .on('end', () => resolve(items));
  });
};

/**
 * 删除数据
 * @param {string} namespace - 命名空间
 * @param {string} key - 键名
 */
export const del = async (namespace, key) => {
  const db = await getDB();
  const fullKey = makeKey(namespace, key);
  await db.del(fullKey);
};

/**
 * 检查键是否存在
 * @param {string} namespace - 命名空间
 * @param {string} key - 键名
 * @returns {boolean} 是否存在
 */
export const exists = async (namespace, key) => {
  const value = await get(namespace, key);
  return value !== null;
};

/**
 * 获取命名空间下的所有键
 * @param {string} namespace - 命名空间
 * @returns {Promise<string[]>} 键名数组（不包含命名空间前缀）
 */
export const getAllKeys = async (namespace) => {
  const db = await getDB();
  const prefix = makeKey(namespace, '');
  const keys = [];
  
  return new Promise((resolve, reject) => {
    const stream = db.createReadStream({
      keys: true,
      values: false,
      gte: prefix,
      lte: prefix + '\xff' // 使用\xff作为结束标记
    });

    stream.on('data', (data) => {
      const { key } = parseKey(data);
      keys.push(key);
    });

    stream.on('error', (error) => {
      reject(error);
    });

    stream.on('end', () => {
      resolve(keys);
    });
  });
};

/**
 * 获取命名空间下的所有数据
 * @param {string} namespace - 命名空间
 * @returns {Promise<Array<{key: string, value: any}>>} 键值对数组
 */
export const getAll = async (namespace) => {
  const db = await getDB();
  const prefix = makeKey(namespace, '');
  const results = [];
  
  return new Promise((resolve, reject) => {
    const stream = db.createReadStream({
      keys: true,
      values: true,
      gte: prefix,
      lte: prefix + '\xff'
    });

    stream.on('data', (data) => {
      const { key } = parseKey(data.key);
      const valueStr = Buffer.isBuffer(data.value) ? data.value.toString() : String(data.value);
      const value = JSON.parse(valueStr);
      results.push({ key, value });
    });

    stream.on('error', (error) => {
      reject(error);
    });

    stream.on('end', () => {
      resolve(results);
    });
  });
};

/**
 * 批量写入
 * @param {Array<{namespace: string, key: string, value: any}>} operations - 操作数组
 */
export const batch = async (operations) => {
  const db = await getDB();
  const batchOps = operations.map(op => ({
    type: 'put',
    key: makeKey(op.namespace, op.key),
    value: JSON.stringify(op.value)
  }));

  await db.batch(batchOps);
};

/**
 * 关闭数据库连接
 */
export const close = async () => {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
    console.log('RocksDB connection closed');
  }
};

// 命名空间常量
export const NAMESPACES = {
  MAP_ACTIONS: 'map_actions',
  USERS: 'users',
  RAW_ASSETS: 'rawAssets',
  SANITIZED_ASSETS: 'sanitizedAssets',
  TECH_PROJECTS: 'techProjects',
  INVESTMENTS: 'investments',
  USER_ACTIONS: 'userActions',
  PAYMENT_ORDERS: 'paymentOrders', // 支付订单
  ASSETS_BY_TYPE: 'assetsByType', // 用于按类型索引资产
  PREDICTION_MARKETS: 'predictionMarkets', // 预测市场题目
  PREDICTION_BETS: 'predictionBets', // 预测市场下注
  ORDER_BOOK: 'orderBook', // 交易市场挂单
  TRADES: 'trades', // 交易市场成交记录
  VISIT_LOGS: 'visitLogs', // 访问记录
  AUCTIONS: 'auctions', // 拍卖数据
  MARKET_DATA: 'marketData', // K线数据
  MARKET_PRICE: 'marketPrice', // 实时价格缓存
  MARKET_TRANSACTIONS: 'marketTransactions', // 已处理的交易签名（用于增量更新）
  MARKET_STATS: 'marketStats', // 市场统计信息
  ANCESTOR_ORIGINS: 'ancestorOrigins', // 祖籍标记（保留兼容）
  ANCESTOR_PROPERTIES: 'ancestorProperties', // 祖产标记（保留兼容）
  MAP_MARKS: 'mapMarks', // 统一地图标记（所有类型）
  BUY_REQUESTS: 'buyRequests', // 购买需求
  RWA_ORDERS: 'rwaOrders', // RWA订单
  RWA_TRADES: 'rwaTrades', // RWA交易记录
  RWA_LOCKS: 'rwaLocks', // 锁定记录
  TOT_PURCHASE_ORDERS: 'totPurchaseOrders', // TOT购买订单
  SHARE_HOLDINGS: 'rwaShareHoldings', // 份额持有记录
  ETF_BASKETS: 'rwaEtfBaskets', // ETF篮子
  MAP_ACTIONS: 'mapActions', // 地图功能操作记录
  LEADERBOARD: 'leaderboard', // 排行榜缓存
  JACKPOT_HISTORY: 'jackpotHistory' // 奖池历史记录
};

export default {
  initRocksDB,
  getDB,
  put,
  get,
  del,
  exists,
  getAllKeys,
  getAll,
  batch,
  close,
  makeKey,
  parseKey,
  NAMESPACES
};

