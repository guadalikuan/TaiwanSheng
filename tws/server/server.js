// #region agent log
fetch('http://127.0.0.1:7243/ingest/4a4faaed-19c7-42a1-9aa5-d33580d7c144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:1',message:'开始导入模块',data:{nodeVersion:process.version,modulePaths:process.env.NODE_PATH||'default',cwd:process.cwd()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,E'})}).catch(()=>{});
// #endregion
import express from 'express';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/4a4faaed-19c7-42a1-9aa5-d33580d7c144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:2',message:'express导入成功',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion
import cors from 'cors';
import arsenalRoutes from './routes/arsenal.js';
import assetPoolRoutes from './routes/assetPool.js';
import authRoutes from './routes/auth.js';
import homepageRoutes from './routes/homepage.js';
import oracleRoutes from './routes/oracle.js';
import paymentRoutes from './routes/payment.js';
import referralRoutes from './routes/referral.js';
import openRoutes from './routes/open.js';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/4a4faaed-19c7-42a1-9aa5-d33580d7c144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:9',message:'准备导入auctionRoutes',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
// #endregion
import auctionRoutes from './routes/auction.js';
import predictionRoutes from './routes/prediction.js';
import sseRoutes, { startSSEKeepalive } from './routes/sse.js';
import techProjectRoutes from './routes/techProject.js';
import adminRoutes from './routes/admin.js';
import investmentRoutes from './routes/investments.js';
import myAssetsRoutes from './routes/myAssets.js';
import marketRoutes from './routes/market.js';
import ancestorRoutes from './routes/ancestor.js';
import rwaTradeRoutes from './routes/rwaTrade.js';
import totPurchaseRoutes from './routes/totPurchase.js';
import mapActionsRoutes from './routes/mapActions.js';
import leaderboardRoutes from './routes/leaderboard.js';
import { startBackgroundTasks } from './utils/backgroundTasks.js';
import { startMarketDataTasks } from './utils/marketDataTasks.js';
import { startMatchingScheduler } from './utils/rwaMatchingScheduler.js';
import { startScanning } from './utils/oracle.js';
import { initTimeManager } from './utils/timeManager.js';
import { initHistoryManager } from './utils/historyManager.js';
import { securityMiddleware } from './middleware/security.js';
import { initializeBotUsers } from './utils/botBehaviorSimulator.js';
import { getBotUserStats, getActiveBotUsers, initBotUserManager } from './utils/botUserManager.js';
import { initHomepageStorage } from './utils/homepageStorage.js';
import { initUserStorage } from './utils/userStorage.js';
import { initStorage } from './utils/storage.js';
import { initTWSMainProject } from './utils/initTechProjects.js';
import { getCurrentPrice, submitOrder, matchOrders } from './utils/orderMatchingEngine.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import http from 'http';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载 .env 文件（如果存在）
const envPath = join(__dirname, '.env');
if (existsSync(envPath)) {
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
    console.log('✅ 已加载 .env 文件');
  } catch (error) {
    console.warn('⚠️ 加载 .env 文件失败:', error.message);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// 确保上传目录存在
const uploadsDir = join(__dirname, 'uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

// ==================== CORS 配置 ====================
const allowedOrigins = [
  'http://localhost:5173',  // Vite开发服务器
  'http://localhost:5174',  // Vite开发服务器（备用端口）
  'http://localhost:4173',  // Vite预览服务器
  'http://localhost:3000',   // 备用端口
  'https://tws-fronted.zeabur.app', // Zeabur Frontend
];

// CORS 辅助函数
const setCORSHeaders = (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (origin) {
    // 开发环境：允许所有 origin
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Last-Event-ID, Accept');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24小时
};

// ==================== 步骤 1: OPTIONS 处理器（最前面！） ====================
// 必须在所有其他中间件之前，确保 OPTIONS 请求立即返回，不经过任何其他中间件
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  console.log(`[CORS] OPTIONS 预检请求: ${req.method} ${req.path} from ${origin || 'no origin'}`);
  
  setCORSHeaders(req, res);
  res.status(204).end();
  // 不调用 next()，立即结束响应
});

// ==================== 步骤 2: 全局 CORS 中间件 ====================
app.use(cors({
  origin: (origin, callback) => {
    // 允许没有 origin 的请求（如 Postman、curl 等）
    if (!origin) {
      return callback(null, true);
    }
    // 检查 origin 是否在允许列表中
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // 开发环境：记录但允许所有 origin
      console.log(`[CORS] 允许的 origin (开发模式): ${origin}`);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Last-Event-ID', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false, // 立即响应预检请求，不继续到下一个中间件
  optionsSuccessStatus: 204, // 预检请求返回 204
}));

// ==================== 步骤 3: 请求日志中间件（用于调试） ====================
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    console.log(`[CORS] OPTIONS 请求经过日志中间件: ${req.path} from origin: ${req.headers.origin}`);
  }
  if (req.path.startsWith('/api/sse') || req.path.startsWith('/api/homepage')) {
    console.log(`[DEBUG] 收到请求: ${req.method} ${req.path} from origin: ${req.headers.origin || 'none'}`);
  }
  next();
});

// ==================== 步骤 4: SSE 路由（在安全中间件之前） ====================
console.log('[ROUTE] 正在注册 SSE 路由...');
app.use('/api/sse', 
  // CORS 中间件（确保 SSE 路由有正确的 CORS）
  (req, res, next) => {
    setCORSHeaders(req, res);
    next();
  },
  // 调试中间件
  (req, res, next) => {
    console.log(`[DEBUG] SSE 路由中间件: ${req.method} ${req.path}, 路由对象类型:`, typeof sseRoutes);
    next();
  },
  // 路由处理器
  sseRoutes
);
console.log('[ROUTE] ✅ SSE 路由已注册到 /api/sse');

// ==================== 步骤 5: 安全中间件（包含速率限制等） ====================
// 注意：所有安全中间件都应该跳过 OPTIONS 请求
app.use(securityMiddleware);

// 基础中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 信任代理（用于获取真实IP）
app.set('trust proxy', 1);

// 静态文件服务 - 提供上传的文件
app.use('/uploads', express.static(uploadsDir));

// API 路由
app.use('/api/arsenal', arsenalRoutes);
app.use('/api/asset-pool', assetPoolRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/homepage', homepageRoutes);
app.use('/api/oracle', oracleRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/auction', auctionRoutes);
app.use('/api/open', openRoutes);
app.use('/api/prediction', predictionRoutes);
app.use('/api/tech-project', techProjectRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/my-assets', myAssetsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/ancestor', ancestorRoutes);
app.use('/api/rwa-trade', rwaTradeRoutes);
app.use('/api/tot-purchase', totPurchaseRoutes);
app.use('/api/tot', mapActionsRoutes);
app.use('/api/map-actions', mapActionsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// 调试：列出所有注册的路由
console.log('📋 已注册的路由:');
console.log('  - /api/sse (SSE实时推送) - 在安全中间件之前');
console.log('  - /api/arsenal');
console.log('  - /api/auth');
console.log('  - /api/homepage');
console.log('  - /api/oracle');
console.log('  - /api/payment');
console.log('  - /api/referral');
console.log('  - /api/auction');

// 验证 SSE 路由是否正确加载
if (sseRoutes) {
  console.log('✅ SSE 路由已成功导入');
  console.log('   路由类型:', typeof sseRoutes);
  console.log('   是否为函数:', typeof sseRoutes === 'function');
} else {
  console.error('❌ SSE 路由导入失败！');
  process.exit(1);
}

// 根路径
app.get('/', (req, res) => {
  res.json({ 
    message: 'TWS Arsenal API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: {
        sse: '/api/sse',
        arsenal: '/api/arsenal',
        auth: '/api/auth',
        homepage: '/api/homepage',
        oracle: '/api/oracle',
        payment: '/api/payment',
        referral: '/api/referral',
        open: '/api/open/countdown'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// ==================== 健康检查和服务器状态 ====================
// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

// 服务器状态 API
app.get('/api/server/status', (req, res) => {
  res.json({
    success: true,
    server: {
      status: 'running',
      port: PORT,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB'
      }
    },
    routes: {
      sse: {
        test: '/api/sse/test',
        homepage: '/api/sse/homepage',
        registered: !!sseRoutes
      },
      api: [
        '/api/arsenal',
        '/api/auth',
        '/api/homepage',
        '/api/oracle',
        '/api/payment',
        '/api/referral'
      ],
      health: '/health',
      status: '/api/server/status'
    },
    cors: {
      allowedOrigins: allowedOrigins
    }
  });
});

// 路由状态查询接口
app.get('/api/routes/status', (req, res) => {
  res.json({
    success: true,
    routes: {
      sse: {
        test: '/api/sse/test',
        homepage: '/api/sse/homepage',
        registered: !!sseRoutes
      },
      other: [
        '/api/arsenal',
        '/api/auth',
        '/api/homepage',
        '/api/oracle',
        '/api/payment',
        '/api/referral'
      ]
    }
  });
});

// Chrome DevTools 相关路径处理（消除控制台警告）
app.get('/.well-known/*', (req, res) => {
  res.status(204).send(); // 204 No Content
});

// 404 处理器 - 记录所有未匹配的路由（必须在所有路由之后）
app.use((req, res, next) => {
  console.error(`\n[404] ========== 未找到路由 ==========`);
  console.error(`[404] Method: ${req.method}`);
  console.error(`[404] Path: ${req.path}`);
  console.error(`[404] Original URL: ${req.originalUrl}`);
  console.error(`[404] Query:`, req.query);
  console.error(`[404] IP: ${req.ip}`);
  console.error(`[404] User-Agent: ${req.headers['user-agent']}`);
  console.error(`[404] Origin: ${req.headers.origin}`);
  console.error(`[404] ====================================\n`);
  
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `路由 ${req.method} ${req.path} 未找到`,
    availableRoutes: {
      sse: [
        'GET /api/sse/test',
        'GET /api/sse/homepage'
      ],
      homepage: [
        'GET /api/homepage/omega',
        'GET /api/homepage/market',
        'GET /api/homepage/map',
        'GET /api/homepage/stats'
      ]
    },
    tip: '如果这是 SSE 路由，请确保服务器已重启并加载了新代码'
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('\n[ERROR] ========== 服务器错误 ==========');
  console.error('[ERROR]', err);
  console.error('[ERROR] Stack:', err.stack);
  console.error('[ERROR] ====================================\n');
  res.status(500).json({ 
    success: false,
    error: 'Internal server error', 
    message: err.message 
  });
});

// ==================== 启动前检查 ====================
const checkPortAvailability = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.close(() => {
        resolve(true); // 端口可用
      });
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false); // 端口被占用
      } else {
        resolve(true); // 其他错误，假设可用
      }
    });
  });
};

// 先启动服务器，然后再初始化
const startServer = async () => {
  // 检查端口是否被占用
  const portAvailable = await checkPortAvailability(PORT);
  if (!portAvailable) {
    console.error(`\n❌ 错误：端口 ${PORT} 已被占用！`);
    console.error('   请执行以下操作之一：');
    console.error('   1. 停止占用端口的进程');
    console.error('   2. 使用环境变量 PORT 指定其他端口（例如：PORT=3002 npm run dev:backend）');
    console.error('   3. 在 Windows 上查找占用端口的进程：netstat -ano | findstr :3001');
    console.error('   4. 在 Linux/Mac 上查找占用端口的进程：lsof -i :3001\n');
    process.exit(1);
  }
  
  // 启动服务器
  app.listen(PORT, () => {
    console.log(`\n🚀 TWS Arsenal Server running on http://localhost:${PORT}`);
    console.log(`📡 服务器正在监听端口 ${PORT}`);
  
  // 服务器启动后，初始化机器人用户池和后台任务
  const initializeBotUserPool = async () => {
    try {
      const activeBots = getActiveBotUsers();
      const minBotCount = 20;
      
      if (activeBots.length < minBotCount) {
        const needed = minBotCount - activeBots.length;
        console.log(`🤖 Initializing ${needed} bot users...`);
        await initializeBotUsers(needed);
        const stats = getBotUserStats();
        console.log(`✅ Bot user pool ready: ${stats.active} active bots`);
      } else {
        const stats = getBotUserStats();
        console.log(`✅ Bot user pool already initialized: ${stats.active} active bots`);
      }
    } catch (error) {
      console.error('⚠️  Error initializing bot user pool:', error);
      // 不阻止服务器运行，继续运行
    }
  };

  // 初始化订单撮合引擎的默认价格
  const initializeMarketPrice = () => {
    try {
      const currentPrice = getCurrentPrice();
      if (currentPrice === null) {
        // 如果没有成交记录，创建初始买卖订单以生成初始价格
        const initialPrice = 142.85;
        const initialAmount = 100;
        
        // 创建初始买单和卖单
        const buyOrder = {
          id: `init_buy_${Date.now()}`,
          userId: 'system',
          username: 'system',
          type: 'buy',
          price: initialPrice,
          amount: initialAmount,
          timestamp: Date.now()
        };
        
        const sellOrder = {
          id: `init_sell_${Date.now()}`,
          userId: 'system',
          username: 'system',
          type: 'sell',
          price: initialPrice,
          amount: initialAmount,
          timestamp: Date.now()
        };
        
        submitOrder(buyOrder);
        submitOrder(sellOrder);
        matchOrders(); // 撮合订单，生成初始成交记录
        
        console.log(`💰 Market initialized with initial price: ${initialPrice}`);
      } else {
        console.log(`💰 Market price already initialized: ${currentPrice}`);
      }
    } catch (error) {
      console.error('⚠️  Error initializing market price:', error);
    }
  };

  // 初始化机器人用户池，然后启动后台任务
  initializeBotUserPool().then(async () => {
    // 初始化各个管理器（包括数据迁移）
    console.log('🔄 Initializing storage managers...');
    await initHistoryManager();
    await initBotUserManager();
    await initHomepageStorage();
    await initUserStorage();
    await initStorage();
    await initTimeManager(); // initTimeManager now is async in my previous edit? let's check. Yes it is.
    
    // 初始化 TWS 主项目（预置科创项目）
    await initTWSMainProject();

    // 初始化市场价格
    initializeMarketPrice();

    // 启动后台任务
    startBackgroundTasks();
    
    // 启动市场数据任务
    await startMarketDataTasks();
    
    // 启动RWA撮合调度器
    startMatchingScheduler();
    
    console.log('\n✅ 所有服务已启动：');
    console.log('   ✓ Express API 服务器');
    console.log('   ✓ SSE (Server-Sent Events) 实时推送');
    console.log('   ✓ 后台数据生成任务（市场、订单簿、K线、地图、资产）');
    console.log('   ✓ 机器人用户池和调度器');
    console.log('   ✓ 订单撮合引擎');
    console.log('   ✓ 市场数据服务（价格、K线）');
  }).catch(async error => {
    console.error('⚠️  Error during initialization:', error);
    // 即使初始化失败，也初始化市场价格并启动后台任务
    await initializeMarketPrice();
    startBackgroundTasks();
    await startMarketDataTasks();
    console.log('\n✅ 核心服务已启动（部分初始化失败）');
  });
  
  // 启动 SSE keepalive
  startSSEKeepalive();
  
  // 启动Oracle扫描任务
  startScanning();
  console.log('   ✓ Oracle 扫描服务');

  // 启动Telegram Bot（如果启用）
  if (process.env.TELEGRAM_BOT_TOKEN) {
    import('./bot/index.js').then(() => {
      console.log('   ✓ Telegram Bot');
    }).catch(error => {
      console.error('加载Telegram Bot失败:', error);
    });
  }
  
  // ==================== 启动验证 ====================
  console.log('\n🔍 验证配置和路由...');
  
  // 验证 CORS 配置
  console.log('✅ CORS 配置已加载');
  console.log('   允许的源:', allowedOrigins.join(', '));
  
  // 验证 SSE 路由
  if (sseRoutes) {
    console.log('✅ SSE 路由已导入');
    console.log('   路由类型:', typeof sseRoutes);
  } else {
    console.error('❌ SSE 路由导入失败！');
  }
  
  // 测试路由（延迟执行，确保服务器完全启动）
  setTimeout(() => {
    console.log('\n🧪 测试路由可访问性...');
    
    // 测试 SSE 测试路由
    const testSSERoute = http.get('http://localhost:3001/api/sse/test', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ SSE 测试路由 (/api/sse/test) 可访问');
          try {
            const json = JSON.parse(data);
            console.log('   响应:', json.message);
          } catch (e) {
            // 忽略解析错误
          }
        } else {
          console.error(`❌ SSE 测试路由返回 ${res.statusCode}`);
        }
      });
    });
    testSSERoute.on('error', (err) => {
      console.error('❌ SSE 路由测试失败:', err.message);
    });
    testSSERoute.setTimeout(2000, () => {
      testSSERoute.destroy();
      console.error('❌ SSE 路由测试超时');
    });
    
    // 测试 OPTIONS 预检请求
    const testOptions = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/homepage/stats',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5174',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    }, (res) => {
      const corsHeader = res.headers['access-control-allow-origin'];
      if (res.statusCode === 204 && corsHeader) {
        console.log('✅ OPTIONS 预检请求正常工作');
        console.log('   CORS 头:', corsHeader);
      } else {
        console.error(`❌ OPTIONS 预检请求失败: ${res.statusCode}, CORS 头: ${corsHeader || '缺失'}`);
      }
    });
    testOptions.on('error', (err) => {
      console.error('❌ OPTIONS 测试失败:', err.message);
    });
    testOptions.end();
    
  }, 1500);
  
    console.log('\n✅ 服务器启动完成！');
    console.log('📝 重要提示：');
    console.log('   - 如果遇到 CORS 错误，请确保浏览器访问的 origin 在允许列表中');
    console.log('   - SSE 路由: /api/sse/homepage');
    console.log('   - 测试路由: /api/sse/test');
    console.log('   - 路由状态: /api/routes/status');
    console.log('   - 健康检查: /health');
    console.log('   - 服务器状态: /api/server/status');
  }).on('error', (err) => {
    console.error('\n❌ 服务器启动失败！');
    console.error('   错误信息:', err.message);
    
    if (err.code === 'EADDRINUSE') {
      console.error(`\n   端口 ${PORT} 已被占用！`);
      console.error('   解决方案：');
      console.error('   1. 停止占用端口的进程');
      console.error('   2. 使用其他端口：PORT=3002 npm run dev:backend');
      console.error('   3. Windows: netstat -ano | findstr :' + PORT);
      console.error('   4. Linux/Mac: lsof -i :' + PORT);
    } else if (err.code === 'EACCES') {
      console.error(`\n   没有权限监听端口 ${PORT}！`);
      console.error('   解决方案：使用 1024 以上的端口，或使用 sudo（不推荐）');
    } else {
      console.error('\n   未知错误，请检查：');
      console.error('   1. 服务器代码是否有语法错误');
      console.error('   2. 依赖是否已安装（npm install）');
      console.error('   3. 环境变量配置是否正确');
    }
    console.error('\n');
    process.exit(1);
  });
};

// 启动服务器
startServer().catch((error) => {
  console.error('\n❌ 启动前检查失败：', error);
  process.exit(1);
});

