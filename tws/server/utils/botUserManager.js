import { get, put, del, getAllWithPrefix } from './rocksdb.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateMnemonic, getAddressFromMnemonic } from './web3.js';
import { ROLES } from './roles.js';
import { saveUser } from './userStorage.js';
import bcrypt from 'bcryptjs';
import { encryptPrivateKey } from './web3.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../data');
const BOT_USERS_FILE = join(DATA_DIR, 'botUsers.json');
const BOT_USERS_BAK_FILE = join(DATA_DIR, 'botUsers.json.bak');

let botUsersCache = [];

/**
 * 初始化机器人用户管理器
 * 负责从文件迁移数据到RocksDB，并加载数据到内存缓存
 */
export const initBotUserManager = async () => {
  try {
    // 确保数据目录存在
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }

    // 迁移逻辑：如果存在旧的JSON文件，将其迁移到RocksDB
    if (existsSync(BOT_USERS_FILE)) {
      console.log('🔄 Migrating botUsers.json to RocksDB...');
      try {
        const raw = readFileSync(BOT_USERS_FILE, 'utf8');
        const oldBotUsers = JSON.parse(raw);
        if (Array.isArray(oldBotUsers)) {
          for (const bot of oldBotUsers) {
            if (bot.id) {
              await put('botUser', bot.id, bot);
            }
          }
        }
        renameSync(BOT_USERS_FILE, BOT_USERS_BAK_FILE);
        console.log('✅ Bot users migration completed');
      } catch (e) {
        console.error('❌ Bot users migration failed:', e);
      }
    }

    // 从 RocksDB 加载机器人用户
    const items = await getAllWithPrefix('botUser');
    botUsersCache = items;
    console.log(`🤖 Bot users loaded from RocksDB: ${botUsersCache.length} users`);

  } catch (error) {
    console.error('❌ Init bot user manager failed:', error);
  }
};

/**
 * 获取所有机器人用户（从缓存）
 */
const readBotUsers = () => {
  return botUsersCache;
};

/**
 * 保存机器人用户（更新缓存并异步写入RocksDB）
 */
const saveBotUser = async (botUser) => {
  // 更新缓存
  const index = botUsersCache.findIndex(b => b.id === botUser.id);
  if (index !== -1) {
    botUsersCache[index] = botUser;
  } else {
    botUsersCache.push(botUser);
  }

  // 写入RocksDB
  try {
    await put('botUser', botUser.id, botUser);
  } catch (error) {
    console.error('❌ Failed to save bot user to RocksDB:', error);
  }
};

/**
 * 创建新的机器人用户
 * @param {Object} options - 配置选项
 * @param {string} options.role - 角色 (USER 或 SUBMITTER)
 * @param {string} options.activityLevel - 活跃度 (high, medium, low)
 * @param {Array<string>} options.preferredActions - 偏好操作
 * @returns {Object} 创建的机器人用户
 */
export const createBotUser = async (options = {}) => {
  const {
    role = Math.random() > 0.2 ? ROLES.USER : ROLES.SUBMITTER, // 80% USER, 20% SUBMITTER
    activityLevel = ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
    preferredActions = []
  } = options;

  // 生成唯一用户名
  const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const username = `bot_user_${Math.random().toString(36).substring(2, 8)}`;
  
  // 生成钱包
  const mnemonic = generateMnemonic();
  const address = getAddressFromMnemonic(mnemonic);
  
  // 生成随机密码（机器人不需要真实密码，但需要符合格式要求）
  const password = `Bot${Math.random().toString(36).substring(2, 10)}123`;
  const passwordHash = await bcrypt.hash(password, 10);
  const encryptedMnemonic = encryptPrivateKey(mnemonic, password);

  // 创建机器人用户数据
  const botUser = {
    id: botId,
    username,
    address,
    role,
    behaviorProfile: {
      activityLevel,
      preferredActions: preferredActions.length > 0 
        ? preferredActions 
        : role === ROLES.USER 
          ? ['purchase', 'trade'] 
          : ['submit'],
      lastActionTime: null,
      actionCount: 0
    },
    createdAt: Date.now(),
    isActive: true
  };

  // 保存到机器人用户列表
  await saveBotUser(botUser);

  // 同时保存到主用户系统（这样机器人可以正常使用系统功能）
  const systemUser = {
    address,
    username,
    passwordHash,
    encryptedMnemonic,
    role,
    profile: {
      displayName: username,
      avatar: ''
    },
    lastLogin: null
  };
  saveUser(systemUser);

  return botUser;
};

/**
 * 获取所有活跃的机器人用户
 * @returns {Array} 活跃的机器人用户数组
 */
export const getActiveBotUsers = () => {
  const botUsers = readBotUsers();
  return botUsers.filter(bot => bot.isActive);
};

/**
 * 根据角色获取机器人用户
 * @param {string} role - 角色
 * @returns {Array} 匹配角色的机器人用户数组
 */
export const getBotUsersByRole = (role) => {
  const botUsers = readBotUsers();
  return botUsers.filter(bot => bot.isActive && bot.role === role);
};

/**
 * 根据ID获取机器人用户
 * @param {string} botId - 机器人ID
 * @returns {Object|null} 机器人用户或 null
 */
export const getBotUserById = (botId) => {
  const botUsers = readBotUsers();
  return botUsers.find(bot => bot.id === botId) || null;
};

/**
 * 根据地址获取机器人用户
 * @param {string} address - 钱包地址
 * @returns {Object|null} 机器人用户或 null
 */
export const getBotUserByAddress = (address) => {
  const botUsers = readBotUsers();
  return botUsers.find(bot => bot.address.toLowerCase() === address.toLowerCase()) || null;
};

/**
 * 随机选择一个机器人用户
 * @param {Object} options - 筛选选项
 * @param {string} options.role - 角色筛选
 * @param {string} options.activityLevel - 活跃度筛选
 * @returns {Object|null} 选中的机器人用户或 null
 */
export const getRandomBotUser = (options = {}) => {
  let candidates = getActiveBotUsers();
  
  if (options.role) {
    candidates = candidates.filter(bot => bot.role === options.role);
  }
  
  if (options.activityLevel) {
    candidates = candidates.filter(bot => bot.behaviorProfile.activityLevel === options.activityLevel);
  }
  
  if (candidates.length === 0) {
    return null;
  }
  
  return candidates[Math.floor(Math.random() * candidates.length)];
};

/**
 * 更新机器人用户的行为记录
 * @param {string} botId - 机器人ID
 * @param {string} actionType - 操作类型
 * @returns {Promise<Object|null>} 更新后的机器人用户或 null
 */
export const recordBotAction = async (botId, actionType) => {
  const botUsers = readBotUsers();
  const index = botUsers.findIndex(bot => bot.id === botId);
  
  if (index === -1) {
    return null;
  }
  
  botUsers[index].behaviorProfile.lastActionTime = Date.now();
  botUsers[index].behaviorProfile.actionCount = (botUsers[index].behaviorProfile.actionCount || 0) + 1;
  
  await saveBotUser(botUsers[index]);
  return botUsers[index];
};

/**
 * 获取机器人用户统计信息
 * @returns {Object} 统计信息
 */
export const getBotUserStats = () => {
  const botUsers = readBotUsers();
  const activeBots = botUsers.filter(bot => bot.isActive);
  
  return {
    total: botUsers.length,
    active: activeBots.length,
    byRole: {
      USER: activeBots.filter(bot => bot.role === ROLES.USER).length,
      SUBMITTER: activeBots.filter(bot => bot.role === ROLES.SUBMITTER).length
    },
    byActivityLevel: {
      high: activeBots.filter(bot => bot.behaviorProfile.activityLevel === 'high').length,
      medium: activeBots.filter(bot => bot.behaviorProfile.activityLevel === 'medium').length,
      low: activeBots.filter(bot => bot.behaviorProfile.activityLevel === 'low').length
    }
  };
};

/**
 * 停用机器人用户
 * @param {string} botId - 机器人ID
 * @returns {Promise<boolean>} 是否成功
 */
export const deactivateBotUser = async (botId) => {
  const botUsers = readBotUsers();
  const index = botUsers.findIndex(bot => bot.id === botId);
  
  if (index === -1) {
    return false;
  }
  
  botUsers[index].isActive = false;
  await saveBotUser(botUsers[index]);
  return true;
};

/**
 * 激活机器人用户
 * @param {string} botId - 机器人ID
 * @returns {Promise<boolean>} 是否成功
 */
export const activateBotUser = async (botId) => {
  const botUsers = readBotUsers();
  const index = botUsers.findIndex(bot => bot.id === botId);
  
  if (index === -1) {
    return false;
  }
  
  botUsers[index].isActive = true;
  await saveBotUser(botUsers[index]);
  return true;
};


