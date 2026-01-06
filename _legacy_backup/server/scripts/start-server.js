#!/usr/bin/env node

/**
 * 服务器启动助手脚本
 * 提供友好的启动体验和错误处理
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverDir = join(__dirname, '..');

console.log('🚀 TWS Arsenal Server 启动助手\n');
console.log('='.repeat(50));

// 检查 server.js 是否存在
const serverFile = join(serverDir, 'server.js');
if (!existsSync(serverFile)) {
  console.error('❌ 找不到 server.js 文件');
  console.error(`   路径: ${serverFile}`);
  process.exit(1);
}

// 启动服务器
console.log('正在启动服务器...\n');

const serverProcess = spawn('node', ['server.js'], {
  cwd: serverDir,
  stdio: 'inherit',
  shell: true
});

// 处理进程退出
serverProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`\n❌ 服务器异常退出，退出码: ${code}`);
    console.error('\n请检查：');
    console.error('1. 服务器代码是否有错误');
    console.error('2. 端口是否被占用');
    console.error('3. 依赖是否已安装 (npm install)');
  }
  process.exit(code);
});

// 处理错误
serverProcess.on('error', (error) => {
  console.error('❌ 启动服务器时发生错误:', error.message);
  process.exit(1);
});

// 处理 Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n正在关闭服务器...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n正在关闭服务器...');
  serverProcess.kill('SIGTERM');
  process.exit(0);
});

