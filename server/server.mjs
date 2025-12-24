import express from 'express';
import cors from 'cors';
import 'dotenv/config'; // Load environment variables
import arsenalRoutes from './routes/arsenal.js';
import authRoutes from './routes/auth.js';
import homepageRoutes from './routes/homepage.js';
import oracleRoutes from './routes/oracle.js';
import paymentRoutes from './routes/payment.js';
import referralRoutes from './routes/referral.js';
import sseRoutes, { startSSEKeepalive } from './routes/sse.js';
import { startBackgroundTasks } from './utils/backgroundTasks.js';
import { startScanning } from './utils/oracle.js';
import { initTimeManager } from './utils/timeManager.js';
import { initHomepageStorage } from './utils/homepageStorage.js';
import connectDB from './config/db.js';
import { securityMiddleware } from './middleware/security.js';
import { initializeBotUsers } from './utils/botBehaviorSimulator.js';
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
