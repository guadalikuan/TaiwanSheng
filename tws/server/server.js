import express from 'express';
import cors from 'cors';
import arsenalRoutes from './routes/arsenal.js';
import authRoutes from './routes/auth.js';
import homepageRoutes from './routes/homepage.js';
import oracleRoutes from './routes/oracle.js';
import paymentRoutes from './routes/payment.js';
import referralRoutes from './routes/referral.js';
import { startBackgroundTasks } from './utils/backgroundTasks.js';
import { startScanning } from './utils/oracle.js';
import { securityMiddleware } from './middleware/security.js';
import { initializeBotUsers } from './utils/botBehaviorSimulator.js';
import { getBotUserStats, getActiveBotUsers } from './utils/botUserManager.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 确保上传目录存在
const uploadsDir = join(__dirname, 'uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

// 安全中间件
app.use(securityMiddleware);

// 基础中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 信任代理（用于获取真实IP）
app.set('trust proxy', 1);

// 静态文件服务 - 提供上传的文件
app.use('/uploads', express.static(uploadsDir));

// API 路由
app.use('/api/arsenal', arsenalRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/homepage', homepageRoutes);
app.use('/api/oracle', oracleRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/referral', referralRoutes);

// 根路径
app.get('/', (req, res) => {
  res.json({ 
    message: 'TWS Arsenal API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: {
        arsenal: '/api/arsenal',
        auth: '/api/auth',
        homepage: '/api/homepage',
        oracle: '/api/oracle',
        payment: '/api/payment',
        referral: '/api/referral'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Chrome DevTools 相关路径处理（消除控制台警告）
app.get('/.well-known/*', (req, res) => {
  res.status(204).send(); // 204 No Content
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 先启动服务器，然后再初始化
app.listen(PORT, () => {
  console.log(`🚀 TWS Arsenal Server running on http://localhost:${PORT}`);
  
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

  // 初始化机器人用户池，然后启动后台任务
  initializeBotUserPool().then(() => {
    // 启动后台任务
    startBackgroundTasks();
  }).catch(error => {
    console.error('⚠️  Error during initialization:', error);
    // 即使初始化失败，也启动后台任务
    startBackgroundTasks();
  });

  // 启动Oracle扫描任务（如果启用）
  if (process.env.ENABLE_ORACLE === 'true') {
    startScanning((result) => {
      console.log('🚨 Oracle检测到触发事件:', result);
    });
  }

  // 启动Telegram Bot（如果启用）
  if (process.env.TELEGRAM_BOT_TOKEN) {
    import('./bot/index.js').catch(error => {
      console.error('加载Telegram Bot失败:', error);
    });
  }
});

