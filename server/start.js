#!/usr/bin/env node

/**
 * 服务器启动包装脚本
 * 在启动服务器前执行所有必要的检查和验证
 */

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

console.log('🔍 启动前检查...\n');

// 检查必要的目录
const requiredDirs = [
  join(__dirname, 'uploads'),
  join(__dirname, 'data'),
  join(__dirname, 'routes'),
  join(__dirname, 'utils'),
  join(__dirname, 'middleware')
];

console.log('1. 检查必要的目录...');
let allDirsExist = true;
for (const dir of requiredDirs) {
  if (!existsSync(dir)) {
    console.error(`   ❌ 目录不存在: ${dir}`);
    allDirsExist = false;
  } else {
    console.log(`   ✅ ${dir}`);
  }
}

if (!allDirsExist) {
  console.error('\n❌ 缺少必要的目录，请检查项目结构');
  process.exit(1);
}

// 检查必要的文件
const requiredFiles = [
  join(__dirname, 'server.js'),
  join(__dirname, 'routes', 'sse.js'),
  join(__dirname, 'routes', 'homepage.js'),
  join(__dirname, 'utils', 'sseManager.js'),
  join(__dirname, 'middleware', 'security.js')
];

console.log('\n2. 检查必要的文件...');
let allFilesExist = true;
for (const file of requiredFiles) {
  if (!existsSync(file)) {
    console.error(`   ❌ 文件不存在: ${file}`);
    allFilesExist = false;
  } else {
    console.log(`   ✅ ${file.split('/').pop()}`);
  }
}

if (!allFilesExist) {
  console.error('\n❌ 缺少必要的文件，请检查项目结构');
  process.exit(1);
}

// 检查 Node.js 版本
console.log('\n3. 检查 Node.js 版本...');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
if (majorVersion < 18) {
  console.error(`   ❌ Node.js 版本过低: ${nodeVersion}`);
  console.error('   需要 Node.js 18 或更高版本');
  process.exit(1);
} else {
  console.log(`   ✅ Node.js ${nodeVersion}`);
}

// 检查必要的 npm 包
console.log('\n4. 检查必要的依赖...');
try {
  const packageJson = require(join(__dirname, 'package.json'));
  const requiredDeps = [
    'express',
    'cors',
    'express-rate-limit',
    'helmet'
  ];
  
  let allDepsExist = true;
  for (const dep of requiredDeps) {
    if (!packageJson.dependencies[dep] && !packageJson.devDependencies[dep]) {
      console.error(`   ❌ 缺少依赖: ${dep}`);
      allDepsExist = false;
    } else {
      console.log(`   ✅ ${dep}`);
    }
  }
  
  if (!allDepsExist) {
    console.error('\n❌ 缺少必要的依赖，请运行: npm install');
    process.exit(1);
  }
} catch (error) {
  console.error('   ⚠️  无法检查依赖:', error.message);
  console.log('   继续启动...');
}

// 检查端口
console.log('\n5. 检查端口配置...');
const PORT = process.env.PORT || 3001;
console.log(`   ✅ 使用端口: ${PORT}`);

// 所有检查通过，启动服务器
console.log('\n✅ 所有检查通过，正在启动服务器...\n');
console.log('='.repeat(50));

// 导入并启动服务器
try {
  // 动态导入 server.js
  await import('./server.js');
} catch (error) {
  console.error('\n❌ 服务器启动失败:');
  console.error(error);
  console.error('\n请检查：');
  console.error('1. 服务器代码是否有语法错误');
  console.error('2. 所有依赖是否已安装 (npm install)');
  console.error('3. 环境变量配置是否正确');
  process.exit(1);
}

