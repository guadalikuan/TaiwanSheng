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
app.listen(PORT, async () => {
  console.log(`\n🚀 TWS Arsenal Server running on http://localhost:${PORT}`);
  console.log(`📡 服务器正在监听端口 ${PORT}`);

  // 连接数据库
  await connectDB();

  // 服务器启动后，初始化机器人用户池和后台任务
  const initializeBotUserPool = async () => {
    // ...
    // 初始化机器人用户池，然后启动后台任务
    initializeBotUserPool().then(async () => {
      // 初始化市场价格
      initializeMarketPrice();

      // 初始化服务
      await initTimeManager();
      await initHomepageStorage();

      // 启动后台任务
      startBackgroundTasks();
      // ...
      // ... at the end of file ...
      if (!isVercel) {
        startServer().catch((error) => {
          console.error('\n❌ 启动前检查失败：', error);
          process.exit(1);
        });
      } else {
        // Vercel 环境下，初始化必要的服务（不启动监听）
        console.log('🚀 Running in Vercel Serverless Environment');
        // 连接数据库
        connectDB().then(async () => {
          // 初始化服务
          await initTimeManager();
          await initHomepageStorage();
        });
      }

      export { app };
      const PORT = process.env.PORT || 10000;
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
