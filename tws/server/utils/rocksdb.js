import RocksDB from 'level-rocksdb';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

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
    dbInstance = RocksDB(ROCKSDB_DIR, {
      createIfMissing: true,
      errorIfExists: false
    });

    await dbInstance.open();
    console.log('✅ RocksDB initialized successfully');
    return dbInstance;
  } catch (error) {
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
  const parts = fullKey.split(':');
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
    return JSON.parse(value);
  } catch (error) {
    if (error.notFound || error.code === 'LEVEL_NOT_FOUND') {
      return null;
    }
    throw error;
  }
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
      const value = JSON.parse(data.value);
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
  USERS: 'users',
  RAW_ASSETS: 'rawAssets',
  SANITIZED_ASSETS: 'sanitizedAssets',
  TECH_PROJECTS: 'techProjects',
  INVESTMENTS: 'investments',
  USER_ACTIONS: 'userActions',
  ASSETS_BY_TYPE: 'assetsByType' // 用于按类型索引资产
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

