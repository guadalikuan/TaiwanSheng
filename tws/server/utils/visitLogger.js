import { put, getAll, NAMESPACES } from './rocksdb.js';
import { getIpGeolocation, getClientIp } from './ipGeolocation.js';

// 访问记录命名空间
const VISIT_LOGS_NAMESPACE = NAMESPACES.VISIT_LOGS || 'visitLogs';

/**
 * 更新访问记录的地理位置信息
 * @param {string} logKey - 日志的key
 * @param {Object} locationData - 地理位置数据
 */
const updateVisitLogLocation = async (logKey, locationData) => {
  try {
    const allLogs = await getAll(VISIT_LOGS_NAMESPACE);
    const logEntry = allLogs.find(entry => entry.key === logKey);
    
    if (logEntry) {
      const updatedLog = { 
        ...logEntry.value, 
        location: locationData.lat && locationData.lng ? { lat: locationData.lat, lng: locationData.lng } : null,
        city: locationData.city || null,
        province: locationData.province || null,
        country: locationData.country || null
      };
      await put(VISIT_LOGS_NAMESPACE, logEntry.key, updatedLog);
    }
  } catch (error) {
    console.error('Failed to update visit log location:', error);
  }
};

/**
 * 记录访问日志
 * @param {Object} req - Express请求对象
 * @param {string} route - 路由路径（如 '/api/homepage/omega'）
 * @param {Object} options - 额外选项 { userId, userAddress, skipGeolocation }
 * @returns {Promise<Object|null>} 访问记录
 */
export const logVisit = async (req, route, options = {}) => {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    const timestamp = Date.now();
    
    // 构建访问记录
    const visitLog = {
      id: `visit_${timestamp}_${Math.random().toString(36).substring(2, 9)}`,
      route,
      ip,
      userAgent,
      timestamp,
      userId: options.userId || null,
      userAddress: options.userAddress || null,
      method: req.method,
      referer: req.headers.referer || null,
      origin: req.headers.origin || null,
      location: null, // 将在获取地理位置后填充
      city: null,
      province: null,
      country: null
    };

    // 存储到RocksDB
    // 使用时间戳作为key的一部分，便于按时间查询
    const dateKey = new Date(timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
    const logKey = `${dateKey}:${visitLog.id}`;
    await put(VISIT_LOGS_NAMESPACE, logKey, visitLog);

    // 异步获取地理位置（不阻塞响应）
    if (!options.skipGeolocation) {
      getIpGeolocation(ip)
        .then(location => {
          if (location) {
            // 更新已存储的记录
            updateVisitLogLocation(logKey, {
              lat: location.lat,
              lng: location.lng,
              city: location.city,
              province: location.province,
              country: location.country
            }).catch(err => {
              console.warn('Failed to update visit log with location:', err);
            });
          }
        })
        .catch(err => {
          console.warn('Failed to get IP geolocation:', err);
        });
    }

    return visitLog;
  } catch (error) {
    console.error('Failed to log visit:', error);
    return null;
  }
};

/**
 * 获取访问记录
 * @param {Object} filters - 过滤条件 { route, ip, userId, startDate, endDate, country }
 * @param {number} limit - 返回记录数量限制
 * @returns {Promise<Array>} 访问记录数组
 */
export const getVisitLogs = async (filters = {}, limit = 100) => {
  try {
    const allLogs = await getAll(VISIT_LOGS_NAMESPACE);
    let filtered = allLogs.map(entry => entry.value);

    // 应用过滤条件
    if (filters.route) {
      filtered = filtered.filter(log => log.route === filters.route);
    }
    if (filters.ip) {
      filtered = filtered.filter(log => log.ip === filters.ip);
    }
    if (filters.userId) {
      filtered = filtered.filter(log => log.userId === filters.userId);
    }
    if (filters.country) {
      filtered = filtered.filter(log => log.country === filters.country);
    }
    if (filters.startDate) {
      const start = new Date(filters.startDate).getTime();
      filtered = filtered.filter(log => log.timestamp >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate).getTime();
      filtered = filtered.filter(log => log.timestamp <= end);
    }

    // 按时间倒序排序
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    return filtered.slice(0, limit);
  } catch (error) {
    console.error('Failed to get visit logs:', error);
    return [];
  }
};

/**
 * 获取访问统计
 * @param {Object} filters - 过滤条件
 * @returns {Promise<Object>} 统计数据
 */
export const getVisitStats = async (filters = {}) => {
  try {
    const logs = await getVisitLogs(filters, 10000);
    
    return {
      total: logs.length,
      uniqueIPs: new Set(logs.map(log => log.ip)).size,
      uniqueUsers: new Set(logs.filter(log => log.userId).map(log => log.userId)).size,
      byRoute: logs.reduce((acc, log) => {
        acc[log.route] = (acc[log.route] || 0) + 1;
        return acc;
      }, {}),
      byCountry: logs.filter(log => log.country).reduce((acc, log) => {
        acc[log.country] = (acc[log.country] || 0) + 1;
        return acc;
      }, {}),
      byCity: logs.filter(log => log.city).reduce((acc, log) => {
        acc[log.city] = (acc[log.city] || 0) + 1;
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Failed to get visit stats:', error);
    return { total: 0, uniqueIPs: 0, uniqueUsers: 0, byRoute: {}, byCountry: {}, byCity: {} };
  }
};

