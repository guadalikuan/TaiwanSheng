import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tws';
    
    // 如果没有配置 MongoDB URI 且在生产环境，给出警告但尝试连接本地
    if (!process.env.MONGODB_URI && process.env.NODE_ENV === 'production') {
      console.warn('⚠️  Warning: MONGODB_URI is not defined in production. Using localhost fallback.');
    }

    const conn = await mongoose.connect(mongoURI);

    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    // 不要在连接失败时立即退出进程，因为这可能导致 Render 部署循环重启
    // 允许服务器在无数据库模式下运行（或在后续请求中重试）
    console.log('⚠️  Server running without persistent database connection.');
  }
};

export default connectDB;
