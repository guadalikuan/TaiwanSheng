#!/usr/bin/env node

/**
 * 服务器状态检查脚本
 * 用于检查服务器是否正在运行，端口是否被占用等
 */

import http from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';
const PORT = 3001;

// 检查端口是否被占用
const checkPort = (port) => {
  return new Promise((resolve) => {
    const server = http.createServer();
    
    server.listen(port, () => {
      server.close(() => {
        resolve({ available: true, message: `端口 ${port} 可用` });
      });
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve({ available: false, message: `端口 ${port} 已被占用` });
      } else {
        resolve({ available: false, message: `端口检查失败: ${err.message}` });
      }
    });
  });
};

// 检查服务器是否响应
const checkServerHealth = async () => {
  return new Promise((resolve) => {
    const req = http.get(`${API_BASE_URL}/health`, { timeout: 2000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const health = JSON.parse(data);
          resolve({
            online: true,
            status: health.status,
            uptime: health.uptime,
            port: health.port
          });
        } catch (e) {
          resolve({
            online: true,
            status: 'unknown',
            message: '服务器响应但无法解析健康检查数据'
          });
        }
      });
    });
    
    req.on('error', (err) => {
      resolve({
        online: false,
        error: err.message,
        code: err.code
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        online: false,
        error: '连接超时',
        message: '服务器可能未运行或响应缓慢'
      });
    });
  });
};

// 检查服务器状态 API
const checkServerStatus = async () => {
  return new Promise((resolve) => {
    const req = http.get(`${API_BASE_URL}/api/server/status`, { timeout: 2000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const status = JSON.parse(data);
          resolve({
            success: true,
            data: status
          });
        } catch (e) {
          resolve({
            success: false,
            error: '无法解析服务器状态'
          });
        }
      });
    });
    
    req.on('error', (err) => {
      resolve({
        success: false,
        error: err.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: '连接超时'
      });
    });
  });
};

// 主函数
const main = async () => {
  console.log('🔍 检查服务器状态...\n');
  
  // 检查端口
  console.log('1. 检查端口状态...');
  const portCheck = await checkPort(PORT);
  if (portCheck.available) {
    console.log(`   ✅ ${portCheck.message}`);
  } else {
    console.log(`   ❌ ${portCheck.message}`);
    console.log('\n   解决方案：');
    console.log('   - Windows: netstat -ano | findstr :' + PORT);
    console.log('   - Linux/Mac: lsof -i :' + PORT);
    console.log('   - 或使用其他端口: PORT=3002 npm run dev:backend\n');
  }
  
  // 检查服务器健康状态
  console.log('\n2. 检查服务器健康状态...');
  const healthCheck = await checkServerHealth();
  if (healthCheck.online) {
    console.log(`   ✅ 服务器在线`);
    console.log(`   - 状态: ${healthCheck.status}`);
    if (healthCheck.uptime) {
      console.log(`   - 运行时间: ${Math.round(healthCheck.uptime)} 秒`);
    }
    if (healthCheck.port) {
      console.log(`   - 端口: ${healthCheck.port}`);
    }
  } else {
    console.log(`   ❌ 服务器离线`);
    console.log(`   - 错误: ${healthCheck.error || healthCheck.message}`);
    console.log('\n   解决方案：');
    console.log('   - 启动服务器: npm run dev:backend');
    console.log('   - 或: cd server && node server.js');
    console.log('   - 检查服务器日志是否有错误\n');
  }
  
  // 检查服务器详细状态
  if (healthCheck.online) {
    console.log('\n3. 获取服务器详细状态...');
    const statusCheck = await checkServerStatus();
    if (statusCheck.success) {
      console.log('   ✅ 服务器状态 API 正常');
      const server = statusCheck.data.server;
      console.log(`   - 环境: ${server.environment}`);
      console.log(`   - Node 版本: ${server.nodeVersion}`);
      console.log(`   - 内存使用: ${server.memory.used} / ${server.memory.total}`);
      console.log(`   - 已注册路由数: ${Object.keys(statusCheck.data.routes).length}`);
    } else {
      console.log(`   ⚠️  无法获取详细状态: ${statusCheck.error}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  if (healthCheck.online) {
    console.log('✅ 服务器运行正常');
    process.exit(0);
  } else {
    console.log('❌ 服务器未运行或无法连接');
    console.log('\n启动服务器:');
    console.log('  npm run dev:backend');
    console.log('  或');
    console.log('  cd server && node server.js');
    process.exit(1);
  }
};

main().catch((error) => {
  console.error('❌ 检查过程中发生错误:', error);
  process.exit(1);
});

