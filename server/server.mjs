import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import tokenRoutes from './routes/token.js'; // 假设你的路由文件在 routes 目录下 

// 加载环境变量 - 从项目根目录加载 .env 文件
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..'); // 项目根目录
const envPath = join(rootDir, '.env');

// 加载 .env 文件（如果存在）
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`✅ 已加载环境变量: ${envPath}`);
} else {
  // 如果根目录没有，尝试当前目录
  dotenv.config();
  console.log(`⚠️  未找到 ${envPath}，使用默认 dotenv 配置`);
}

import arsenalRoutes from './routes/arsenal.js';
import authRoutes from './routes/auth.js';
import homepageRoutes from './routes/homepage.js';
import oracleRoutes from './routes/oracle.js';
import paymentRoutes from './routes/payment.js';
import referralRoutes from './routes/referral.js';
import sseRoutes, { startSSEKeepalive } from './routes/sse.js';
import bunkerRoutes from './routes/bunker.js';
import { startBackgroundTasks } from './utils/backgroundTasks.js';
import { startScanning } from './utils/oracle.js';
import { initTimeManager } from './utils/timeManager.js';
import { initHomepageStorage } from './utils/homepageStorage.js';
import connectDB from './config/db.js';
import { securityMiddleware } from './middleware/security.js';
import { initializeBotUsers } from './utils/botBehaviorSimulator.js';

const app = express();
const PORT = process.env.PORT || 3001;

// 确保上传目录存在
const uploadsDir = join(__dirname, 'uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

// ==================== CORS 配置 ====================
// 允许跨域访问，支持前端和倒计时App
app.use(cors({
  origin: true, // 允许所有来源，方便本地开发和文件系统访问
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(securityMiddleware);

// Static files
app.use('/uploads', express.static(uploadsDir));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Routes
app.use('/api/arsenal', arsenalRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/homepage', homepageRoutes);
app.use('/api/oracle', oracleRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/sse', sseRoutes);
app.use('/api/bunker', bunkerRoutes);
app.use('/api/token', tokenRoutes);

const startServer = async () => {
  try {
    // 1. 连接数据库
    await connectDB();
    console.log('✅ Connected to MongoDB Atlas');

    // 2. 初始化服务
    await initTimeManager();
    await initHomepageStorage();

    // 3. 启动后台任务与机器人
    if (typeof initializeBotUsers === 'function') {
      await initializeBotUsers();
    }
    startBackgroundTasks();
    startScanning();
    startSSEKeepalive();

    // 4. 真正启动监听
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 TWS Arsenal Server is LIVE`);
      console.log(`📡 Listening on port: ${PORT}`);
    });

  } catch (error) {
    console.error('\n❌ Server startup failed:', error);
    process.exit(1);
  }
};

startServer();
