import express from 'express';
import cors from 'cors';
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
import { getBotUserStats, getActiveBotUsers } from './utils/botUserManager.js';
import { getCurrentPrice, submitOrder, matchOrders } from './utils/orderMatchingEngine.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import http from 'http';
import net from 'net';

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
const allowedOrigins = [
  'http://localhost:5173',  // Vite开发服务器
  'http://localhost:5174',  // Vite开发服务器（备用端口）
  'http://localhost:4173',  // Vite预览服务器
  'http://localhost:3000',   // 备用端口
  'https://tws-backend.onrender.com' // Render 后端地址
];
// ... (rest of the file remains similar)

// ... inside startServer ...
// 启动服务器
// ... 前面的代码保持不变 (直到 app.listen 之前)

const startServer = async () => {
  try {
    // 1. 连接数据库
    await connectDB();
    console.log('✅ Connected to MongoDB Atlas');

    // 2. 初始化服务
    await initTimeManager();
    await initHomepageStorage();

    // 3. 启动后台任务与机器人
    // 注意：确保这些函数在你的 imports 中已正确导入
    if (typeof initializeBotUsers === 'function') {
      await initializeBotUsers();
    }
    startBackgroundTasks();
    startScanning();

    // 4. 真正启动监听
    const FINAL_PORT = process.env.PORT || 10000;
    app.listen(FINAL_PORT, '0.0.0.0', () => {
      console.log(`\n🚀 TWS Arsenal Server is LIVE`);
      console.log(`📡 Listening on port: ${FINAL_PORT}`);
    });

  } catch (error) {
    console.error('\n❌ Server startup failed:', error);
    process.exit(1);
  }
};

// 执行启动
startServer();