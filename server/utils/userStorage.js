import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../data');
const USERS_FILE = join(DATA_DIR, 'users.json');

// 确保数据目录存在
const initDataDir = () => {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(USERS_FILE)) {
    writeFileSync(USERS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
};

// 读取所有用户
const readUsers = () => {
  initDataDir();
  try {
    const data = readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users:', error);
    return [];
  }
};

// 写入所有用户
const writeUsers = (users) => {
  initDataDir();
  try {
    writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing users:', error);
    throw error;
  }
};

/**
 * 保存用户数据
 * @param {Object} userData - 用户数据
 * @returns {Object} 保存的用户数据
 */
export const saveUser = (userData) => {
  const users = readUsers();
  
  // 检查地址是否已存在
  const existingIndex = users.findIndex(u => u.address === userData.address);
  
  if (existingIndex >= 0) {
    // 更新现有用户
    users[existingIndex] = {
      ...users[existingIndex],
      ...userData,
      updatedAt: Date.now()
    };
    writeUsers(users);
    return users[existingIndex];
  } else {
    // 添加新用户
    const newUser = {
      ...userData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    users.push(newUser);
    writeUsers(users);
    return newUser;
  }
};

/**
 * 根据钱包地址查找用户
 * @param {string} address - 钱包地址
 * @returns {Object|null} 用户数据或 null
 */
export const getUserByAddress = (address) => {
  const users = readUsers();
  // Solana地址是大小写敏感的，直接比较
  return users.find(u => u.address === address) || null;
};

/**
 * 根据用户名查找用户
 * @param {string} username - 用户名
 * @returns {Object|null} 用户数据或 null
 */
export const getUserByUsername = (username) => {
  const users = readUsers();
  return users.find(u => u.username === username) || null;
};

/**
 * 更新用户信息
 * @param {string} address - 钱包地址
 * @param {Object} updates - 要更新的字段
 * @returns {Object|null} 更新后的用户数据或 null
 */
export const updateUser = (address, updates) => {
  const users = readUsers();
  // Solana地址是大小写敏感的，直接比较
  const index = users.findIndex(u => u.address === address);
  
  if (index === -1) {
    return null;
  }
  
  users[index] = {
    ...users[index],
    ...updates,
    updatedAt: Date.now()
  };
  
  writeUsers(users);
  return users[index];
};

/**
 * 获取所有用户（管理员用）
 * @returns {Array} 所有用户数组
 */
export const getAllUsers = () => {
  return readUsers();
};

/**
 * 根据角色获取用户
 * @param {string} role - 角色 (USER, SUBMITTER, REVIEWER, ADMIN)
 * @returns {Array} 匹配角色的用户数组
 */
export const getUsersByRole = (role) => {
  const users = readUsers();
  return users.filter(u => u.role === role);
};

