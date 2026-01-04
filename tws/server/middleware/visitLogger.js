import { logVisit } from '../utils/visitLogger.js';

/**
 * 访问记录中间件
 * @param {Object} options - 选项 { skipGeolocation, routes }
 * @returns {Function} Express中间件
 */
export const visitLogger = (options = {}) => {
  return async (req, res, next) => {
    // 如果指定了路由列表，只记录这些路由
    if (options.routes && !options.routes.includes(req.path)) {
      return next();
    }

    // 从JWT token中提取用户信息（如果存在）
    let userId = null;
    let userAddress = null;
    
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const { verifyToken } = await import('../utils/jwt.js');
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        if (decoded) {
          userId = decoded.id || decoded.address;
          userAddress = decoded.address;
        }
      }
    } catch (error) {
      // 忽略token解析错误，继续记录访问
    }

    // 异步记录访问（不阻塞请求）
    logVisit(req, req.path, {
      userId,
      userAddress,
      skipGeolocation: options.skipGeolocation
    }).catch(err => {
      console.warn('Failed to log visit:', err);
    });

    next();
  };
};

