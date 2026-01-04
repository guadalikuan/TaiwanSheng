import { put, get, getAll, NAMESPACES, initRocksDB } from './rocksdb.js';
import { readFileSync, existsSync, renameSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../data');
const USERS_FILE = join(DATA_DIR, 'users.json');
const USERS_BAK_FILE = join(DATA_DIR, 'users.json.bak');

// 初始化RocksDB（如果尚未初始化）
let dbInitialized = false;
const ensureDB = async () => {
  if (!dbInitialized) {
    await initRocksDB();
    dbInitialized = true;
  }
};

// 初始化用户存储（迁移旧数据）
export const initUserStorage = async () => {
  await ensureDB();
  
  try {
    const users = await getAll(NAMESPACES.USERS);
    if (users.length === 0 && existsSync(USERS_FILE)) {
      console.log('🔄 Migrating users.json to RocksDB...');
      const data = JSON.parse(readFileSync(USERS_FILE, 'utf8'));
      if (Array.isArray(data)) {
        for (const user of data) {
          if (user.address) {
            await put(NAMESPACES.USERS, user.address.toLowerCase(), user);
          }
        }
      }
      renameSync(USERS_FILE, USERS_BAK_FILE);
      console.log('✅ Users migration completed');
    }
  } catch (error) {
    console.error('❌ User storage migration failed:', error);
  }
};

// 确保数据目录存在（兼容性函数）
const initDataDir = initUserStorage;

/**
 * 保存用户数据
 * @param {Object} userData - 用户数据
 * @returns {Object} 保存的用户数据
 */
export const saveUser = async (userData) => {
  await ensureDB();
  
  if (!userData.address) {
    throw new Error('User address is required');
  }
  
  const address = userData.address.toLowerCase();
  
  // 检查地址是否已存在
  const existing = await get(NAMESPACES.USERS, address);
  
  if (existing) {
    // 更新现有用户
    const updated = {
      ...existing,
      ...userData,
      updatedAt: Date.now()
    };
    await put(NAMESPACES.USERS, address, updated);
    return updated;
  } else {
    // 添加新用户
    const newUser = {
      ...userData,
      address: address,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await put(NAMESPACES.USERS, address, newUser);
    return newUser;
  }
};

/**
 * 根据钱包地址查找用户
 * @param {string} address - 钱包地址
 * @returns {Object|null} 用户数据或 null
 */
export const getUserByAddress = async (address) => {
  await ensureDB();
  if (!address) return null;
  
  const user = await get(NAMESPACES.USERS, address.toLowerCase());
  return user || null;
};

/**
 * 根据用户名查找用户
 * @param {string} username - 用户名
 * @returns {Object|null} 用户数据或 null
 */
export const getUserByUsername = async (username) => {
  await ensureDB();
  if (!username) return null;
  
  const allUsers = await getAll(NAMESPACES.USERS);
  const user = allUsers.find(u => u.value.username === username);
  return user ? user.value : null;
};

/**
 * 更新用户信息
 * @param {string} address - 钱包地址
 * @param {Object} updates - 要更新的字段
 * @returns {Object|null} 更新后的用户数据或 null
 */
export const updateUser = async (address, updates) => {
  await ensureDB();
  if (!address) return null;
  
  const user = await get(NAMESPACES.USERS, address.toLowerCase());
  if (!user) {
    return null;
  }
  
  const updated = {
    ...user,
    ...updates,
    updatedAt: Date.now()
  };
  
  await put(NAMESPACES.USERS, address.toLowerCase(), updated);
  return updated;
};

/**
 * 获取所有用户（管理员用）
 * @returns {Array} 所有用户数组
 */
export const getAllUsers = async () => {
  await ensureDB();
  const results = await getAll(NAMESPACES.USERS);
  return results.map(r => r.value);
};

/**
 * 根据角色获取用户
 * @param {string} role - 角色 (USER, SUBMITTER, REVIEWER, ADMIN)
 * @returns {Array} 匹配角色的用户数组
 */
export const getUsersByRole = async (role) => {
  await ensureDB();
  const allUsers = await getAllUsers();
  return allUsers.filter(u => u.role === role);
};
