import express from 'express';
import { addClient, removeClient, sendKeepalive } from '../utils/sseManager.js';

const router = express.Router();

// 允许的源列表
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  'http://localhost:3000',
];

// 处理 OPTIONS 预检请求
router.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Last-Event-ID');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24小时
  res.status(204).end();
});

// 测试路由，用于验证路由是否正常工作
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'SSE route is working',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

/**
 * SSE 连接端点
 * GET /api/sse/homepage
 * 建立 Server-Sent Events 连接，推送首页实时数据
 */
router.get('/homepage', (req, res) => {
  try {
    console.log('[SSE] ========== 收到连接请求 ==========');
    console.log('[SSE] IP:', req.ip);
    console.log('[SSE] Method:', req.method);
    console.log('[SSE] Path:', req.path);
    console.log('[SSE] Original URL:', req.originalUrl);
    console.log('[SSE] User-Agent:', req.headers['user-agent']);
    console.log('[SSE] Origin:', req.headers.origin);
    
    // 设置 SSE 响应头（必须在写入数据之前设置）
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲
    
    // CORS 头部
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type');
    
    // 添加客户端连接
    addClient(res);
    
    // 处理客户端断开
    req.on('close', () => {
      console.log('[SSE] 客户端关闭连接:', req.ip);
      removeClient(res);
      if (!res.headersSent) {
        res.end();
      }
    });
    
    req.on('aborted', () => {
      console.log('[SSE] 客户端中止连接:', req.ip);
      removeClient(res);
      if (!res.headersSent) {
        res.end();
      }
    });
    
    // 处理错误
    res.on('error', (error) => {
      console.error('[SSE] 响应错误:', error);
      removeClient(res);
    });
    
    // 发送初始连接消息
    res.write(`: connected\n\n`);
    
    console.log('[SSE] 连接已建立，等待数据推送');
  } catch (error) {
    console.error('[SSE] 处理连接请求时出错:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to establish SSE connection',
        message: error.message
      });
    }
  }
});

/**
 * 启动心跳任务（每30秒发送一次 keepalive）
 */
let keepaliveInterval = null;

export const startSSEKeepalive = () => {
  if (keepaliveInterval) return;
  
  keepaliveInterval = setInterval(() => {
    sendKeepalive();
  }, 30000); // 30秒
  
  console.log('✅ SSE keepalive started (30s interval)');
};

export const stopSSEKeepalive = () => {
  if (keepaliveInterval) {
    clearInterval(keepaliveInterval);
    keepaliveInterval = null;
    console.log('🛑 SSE keepalive stopped');
  }
};

// 调试：列出所有注册的路由
console.log('[SSE Routes] 路由已注册:');
console.log('  - GET /api/sse/test');
console.log('  - GET /api/sse/homepage');
console.log('  - OPTIONS /api/sse/*');

export default router;

