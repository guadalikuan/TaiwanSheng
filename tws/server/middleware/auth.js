import { verifyToken } from '../utils/jwt.js';
import { ROLES, isRoleAllowed } from '../utils/roles.js';

/**
 * 认证中间件 - 验证 JWT token
 */
export const authenticate = async (req, res, next) => {
  try {
    // 从请求头获取 token
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        message: 'Authentication required'
      });
    }
    
    // Bearer token 格式
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    
    // 验证 token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Token verification failed'
      });
    }
    
    // 将用户信息附加到请求对象
    req.user = decoded;
    
    // 记录钱包地址到请求对象（用于后续日志记录）
    if (decoded.address) {
      req.walletAddress = decoded.address;
    }
    
    // 异步记录登录行为（不阻塞请求）
    if (decoded.address && req.path !== '/api/auth/login' && req.path !== '/api/auth/login-mnemonic') {
      const { logAction } = await import('../utils/actionLogger.js');
      logAction(decoded.address, 'API_ACCESS', {
        path: req.path,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      }).catch(err => {
        // 日志记录失败不影响请求
        console.warn('Failed to log action:', err);
      });
    }
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: error.message
    });
  }
};

/**
 * 授权中间件 - 检查用户角色
 * @param {Array<string>} allowedRoles - 允许的角色数组
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }
    
    const userRole = req.user.role || ROLES.USER;
    
    // 检查角色权限
    if (!isRoleAllowed(userRole, allowedRoles)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }
    
    next();
  };
};

/**
 * 权限检查中间件别名（与authorize功能相同，提供更语义化的名称）
 * @param {Array<string>} allowedRoles - 允许的角色数组
 */
export const requireRole = (...allowedRoles) => {
  return authorize(...allowedRoles);
};

/**
 * 可选认证中间件 - 如果有 token 则验证，没有也不报错
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;
      
      const decoded = verifyToken(token);
      if (decoded) {
        req.user = decoded;
        if (decoded.address) {
          req.walletAddress = decoded.address;
        }
      }
    }
    
    next();
  } catch (error) {
    // 可选认证失败不影响请求继续
    next();
  }
};

