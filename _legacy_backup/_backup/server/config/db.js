import mongoose from 'mongoose';

const connectDB = async () => {
  // 1. 强制检查环境变量
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.error('❌ 错误: .env 文件中的 MONGODB_URI 未定义！');
    console.log('请确保 .env 文件位于项目根目录，且包含正确的连接字符串。');
    process.exit(1); // 没有数据库地址，直接停止程序
  }

  try {
    // 2. 设置连接超时，避免死等
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000 
    });

    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    // 抛出错误，让 server.mjs 的 startServer 捕获
    throw error; 
  }
};

export default connectDB;