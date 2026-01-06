/**
 * SSE (Server-Sent Events) 管理器
 * 管理所有客户端连接，提供统一的数据推送接口
 */

// 存储所有活跃的客户端连接
const clients = new Set();

// 最近推送的消息缓存（用于去重）
const recentMessages = new Map();
const MESSAGE_CACHE_DURATION = 1000; // 1秒内的相同消息会被去重

/**
 * 添加客户端连接
 * @param {Object} res - Express Response 对象
 */
export const addClient = (res) => {
  clients.add(res);
  console.log(`[SSE] 客户端连接，当前连接数: ${clients.size}`);
  
  // 发送初始连接确认
  sendToClient(res, {
    id: `init_${Date.now()}`,
    section: 'system',
    type: 'connected',
    data: { message: 'SSE连接已建立' },
    timestamp: Date.now()
  });
};

/**
 * 移除客户端连接
 * @param {Object} res - Express Response 对象
 */
export const removeClient = (res) => {
  clients.delete(res);
  console.log(`[SSE] 客户端断开，当前连接数: ${clients.size}`);
};

/**
 * 向单个客户端发送消息
 * @param {Object} res - Express Response 对象
 * @param {Object} message - 消息对象
 */
const sendToClient = (res, message) => {
  try {
    const messageStr = `data: ${JSON.stringify(message)}\n\n`;
    res.write(messageStr);
  } catch (error) {
    console.error('[SSE] 发送消息失败:', error);
    removeClient(res);
  }
};

/**
 * 生成消息ID（用于去重）
 * @param {string} section - 数据区域
 * @param {string} type - 消息类型
 * @param {Object} data - 数据对象
 * @returns {string} 消息ID
 */
const generateMessageId = (section, type, data) => {
  // 使用 section + type + 数据的关键字段生成ID
  const dataKey = JSON.stringify(data).substring(0, 100); // 只取前100字符
  const hash = dataKey.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  return `${section}_${type}_${Date.now()}_${Math.abs(hash)}`;
};

/**
 * 检查消息是否重复
 * @param {string} messageId - 消息ID
 * @param {number} timestamp - 时间戳
 * @returns {boolean} 是否重复
 */
const isDuplicate = (messageId, timestamp) => {
  const cached = recentMessages.get(messageId);
  if (cached && (timestamp - cached) < MESSAGE_CACHE_DURATION) {
    return true;
  }
  recentMessages.set(messageId, timestamp);
  
  // 清理过期缓存
  if (recentMessages.size > 1000) {
    const now = Date.now();
    for (const [id, time] of recentMessages.entries()) {
      if (now - time > MESSAGE_CACHE_DURATION) {
        recentMessages.delete(id);
      }
    }
  }
  
  return false;
};

/**
 * 向所有客户端推送更新
 * @param {string} section - 数据区域：'market' | 'omega' | 'map' | 'stats'
 * @param {string} type - 更新类型：'update' | 'incremental' | 'full'
 * @param {Object} data - 要推送的数据
 */
export const pushUpdate = (section, type, data) => {
  if (clients.size === 0) {
    return; // 没有客户端连接，不推送
  }
  
  const timestamp = Date.now();
  const message = {
    id: generateMessageId(section, type, data),
    section,
    type,
    data,
    timestamp
  };
  
  // 检查是否重复
  if (isDuplicate(message.id, timestamp)) {
    return; // 跳过重复消息
  }
  
  // 向所有客户端推送
  const deadClients = [];
  clients.forEach((client) => {
    try {
      sendToClient(client, message);
    } catch (error) {
      console.error('[SSE] 推送失败，移除客户端:', error);
      deadClients.push(client);
    }
  });
  
  // 清理断开的连接
  deadClients.forEach(client => removeClient(client));
  
  console.log(`[SSE] 推送 ${section}.${type} 到 ${clients.size} 个客户端`);
};

/**
 * 发送心跳（keepalive）
 * 定期发送以保持连接活跃
 */
export const sendKeepalive = () => {
  if (clients.size === 0) return;
  
  const message = {
    id: `keepalive_${Date.now()}`,
    section: 'system',
    type: 'keepalive',
    data: { timestamp: Date.now() },
    timestamp: Date.now()
  };
  
  const deadClients = [];
  clients.forEach((client) => {
    try {
      sendToClient(client, message);
    } catch (error) {
      deadClients.push(client);
    }
  });
  
  deadClients.forEach(client => removeClient(client));
};

/**
 * 获取当前连接数
 * @returns {number}
 */
export const getClientCount = () => clients.size;

