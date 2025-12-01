import express from 'express';
import cors from 'cors';
import arsenalRoutes from './routes/arsenal.js';
import authRoutes from './routes/auth.js';
import homepageRoutes from './routes/homepage.js';
import { startBackgroundTasks } from './utils/backgroundTasks.js';
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

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 提供上传的文件
app.use('/uploads', express.static(uploadsDir));

// API 路由
app.use('/api/arsenal', arsenalRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/homepage', homepageRoutes);

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
        homepage: '/api/homepage'
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

// 启动后台任务
startBackgroundTasks();

app.listen(PORT, () => {
  console.log(`🚀 TWS Arsenal Server running on http://localhost:${PORT}`);
});

