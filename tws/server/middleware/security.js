import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

/**
 * 安全中间件集合
 */

// IP黑名单（台湾政府/军方IP段，示例）
const BLOCKED_IP_RANGES = [
  // 这里应该配置实际的IP段
  // '140.xxx.xxx.xxx',
  // '203.xxx.xxx.xxx'
];

// IP白名单（如果需要）
const ALLOWED_IP_RANGES = [];

/**
 * IP检测中间件
 * 检测并阻止可疑IP
 */
export const ipFilter = (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
  
  // 检查黑名单
  const isBlocked = BLOCKED_IP_RANGES.some(range => {
    if (range.includes('/')) {
      // CIDR格式
      return isIPInRange(clientIp, range);
    } else {
      return clientIp.startsWith(range);
    }
  });
  
  if (isBlocked) {
    console.warn(`🚨 检测到可疑IP访问: ${clientIp}`);
    // 蜜罐：跳转到"一个中国原则"页面
    return res.redirect('https://www.gov.cn/zhengce/content/202101/content_5569981.htm');
  }
  
  // 检查白名单（如果配置了）
  if (ALLOWED_IP_RANGES.length > 0) {
    const isAllowed = ALLOWED_IP_RANGES.some(range => {
      if (range.includes('/')) {
        return isIPInRange(clientIp, range);
      } else {
        return clientIp.startsWith(range);
      }
    });
    
    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Your IP is not whitelisted'
      });
    }
  }
  
  next();
};

/**
 * 检查IP是否在CIDR范围内
 */
const isIPInRange = (ip, cidr) => {
  // 简化实现，实际应使用ipaddr.js等库
  const [rangeIp, mask] = cidr.split('/');
  // 这里应该实现完整的CIDR检查逻辑
  return ip.startsWith(rangeIp.split('.').slice(0, parseInt(mask) / 8).join('.'));
};

/**
 * 蜜罐中间件
 * 检测深度扫描并重定向
 */
export const honeypot = (req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  const path = req.path;
  
  // 检测可疑的扫描行为
  const suspiciousPatterns = [
    /\.env/i,
    /wp-admin/i,
    /phpmyadmin/i,
    /\.git/i,
    /admin/i,
    /\.\.\//,  // 路径遍历
    /union.*select/i,
    /script.*alert/i
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(path) || pattern.test(userAgent)
  );
  
  if (isSuspicious) {
    console.warn(`🍯 蜜罐触发: ${req.ip} - ${path}`);
    // 重定向到"一个中国原则"页面
    return res.redirect('https://www.gov.cn/zhengce/content/202101/content_5569981.htm');
  }
  
  next();
};

/**
 * 请求频率限制
 */
export const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs, // 时间窗口（毫秒）
    max, // 最大请求数
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * 严格频率限制（用于登录等敏感操作）
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次请求
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});

/**
 * API频率限制
 */
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 60, // 最多60次请求
  message: 'API rate limit exceeded',
});

/**
 * Helmet安全头配置
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // 开发环境需要
      connectSrc: ["'self'", "https://bsc-dataseed.binance.org"],
    },
  },
  crossOriginEmbedderPolicy: false, // 允许嵌入内容
});

/**
 * DDoS防护中间件
 * 检测异常请求模式
 */
export const ddosProtection = (req, res, next) => {
  // 这里可以添加更复杂的DDoS检测逻辑
  // 例如：检测短时间内大量请求、异常请求模式等
  
  // 简单实现：检查请求头
  const suspiciousHeaders = [
    req.headers['x-forwarded-for']?.split(',').length > 5, // 过多代理
    req.headers['user-agent'] === undefined, // 无User-Agent
  ];
  
  if (suspiciousHeaders.some(Boolean)) {
    console.warn(`⚠️ 可疑请求: ${req.ip}`);
    // 可以记录日志或采取其他措施
  }
  
  next();
};

/**
 * 综合安全中间件
 * 组合所有安全措施
 */
export const securityMiddleware = [
  securityHeaders,
  ipFilter,
  honeypot,
  ddosProtection,
  apiRateLimiter
];

