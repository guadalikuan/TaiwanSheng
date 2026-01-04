import { put, get, getAll, NAMESPACES } from './rocksdb.js';

/**
 * 记录用户操作
 * @param {string} walletAddress - 钱包地址
 * @param {string} actionType - 操作类型（INVEST_TECH_PROJECT, CREATE_TECH_PROJECT, VIEW_ASSET等）
 * @param {Object} actionData - 操作相关数据
 * @returns {Promise<Object>} 保存的操作记录
 */
export const logAction = async (walletAddress, actionType, actionData = {}) => {
  if (!walletAddress) {
    console.warn('⚠️  Cannot log action: wallet address is missing');
    return null;
  }

  const action = {
    id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    walletAddress: walletAddress.toLowerCase(),
    actionType,
    actionData,
    timestamp: Date.now(),
    ip: actionData.ip || null,
    userAgent: actionData.userAgent || null
  };

  // 存储到RocksDB，使用钱包地址和时间戳作为键的一部分
  const key = `${walletAddress.toLowerCase()}:${action.timestamp}`;
  await put(NAMESPACES.USER_ACTIONS, key, action);

  return action;
};

/**
 * 获取用户的操作历史
 * @param {string} walletAddress - 钱包地址
 * @param {number} limit - 返回记录数量限制
 * @param {string} actionType - 操作类型筛选（可选）
 * @returns {Promise<Array>} 操作记录数组
 */
export const getUserActions = async (walletAddress, limit = 100, actionType = null) => {
  if (!walletAddress) {
    return [];
  }

  try {
    const allActions = await getAll(NAMESPACES.USER_ACTIONS);
    let userActions = allActions
      .filter(a => a.value.walletAddress.toLowerCase() === walletAddress.toLowerCase())
      .map(a => a.value);

    // 按操作类型筛选
    if (actionType) {
      userActions = userActions.filter(a => a.actionType === actionType);
    }

    // 按时间戳排序（最新的在前）
    userActions.sort((a, b) => b.timestamp - a.timestamp);

    // 限制返回数量
    return userActions.slice(0, limit);
  } catch (error) {
    console.error('Error getting user actions:', error);
    return [];
  }
};

/**
 * 获取所有操作记录（管理员用）
 * @param {Object} filters - 筛选条件
 * @returns {Promise<Array>} 操作记录数组
 */
export const getAllActions = async (filters = {}) => {
  try {
    const allActions = await getAll(NAMESPACES.USER_ACTIONS);
    let actions = allActions.map(a => a.value);

    // 按钱包地址筛选
    if (filters.walletAddress) {
      actions = actions.filter(a => 
        a.walletAddress.toLowerCase() === filters.walletAddress.toLowerCase()
      );
    }

    // 按操作类型筛选
    if (filters.actionType) {
      actions = actions.filter(a => a.actionType === filters.actionType);
    }

    // 按时间范围筛选
    if (filters.startTime) {
      actions = actions.filter(a => a.timestamp >= filters.startTime);
    }
    if (filters.endTime) {
      actions = actions.filter(a => a.timestamp <= filters.endTime);
    }

    // 排序
    actions.sort((a, b) => b.timestamp - a.timestamp);

    // 分页
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    
    return {
      actions: actions.slice(offset, offset + limit),
      total: actions.length,
      limit,
      offset
    };
  } catch (error) {
    console.error('Error getting all actions:', error);
    return { actions: [], total: 0, limit: 0, offset: 0 };
  }
};

/**
 * 获取操作统计信息
 * @param {string} walletAddress - 钱包地址（可选）
 * @returns {Promise<Object>} 统计信息
 */
export const getActionStats = async (walletAddress = null) => {
  try {
    const allActions = await getAll(NAMESPACES.USER_ACTIONS);
    let actions = allActions.map(a => a.value);

    if (walletAddress) {
      actions = actions.filter(a => 
        a.walletAddress.toLowerCase() === walletAddress.toLowerCase()
      );
    }

    // 按操作类型统计
    const statsByType = {};
    actions.forEach(action => {
      statsByType[action.actionType] = (statsByType[action.actionType] || 0) + 1;
    });

    return {
      totalActions: actions.length,
      statsByType,
      lastActionTime: actions.length > 0 ? Math.max(...actions.map(a => a.timestamp)) : null
    };
  } catch (error) {
    console.error('Error getting action stats:', error);
    return {
      totalActions: 0,
      statsByType: {},
      lastActionTime: null
    };
  }
};

// 操作类型常量
export const ACTION_TYPES = {
  INVEST_TECH_PROJECT: 'INVEST_TECH_PROJECT',
  CREATE_TECH_PROJECT: 'CREATE_TECH_PROJECT',
  VIEW_ASSET: 'VIEW_ASSET',
  VIEW_TECH_PROJECT: 'VIEW_TECH_PROJECT',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT'
};

export default {
  logAction,
  getUserActions,
  getAllActions,
  getActionStats,
  ACTION_TYPES
};

