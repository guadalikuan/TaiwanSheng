/**
 * 网络切换脚本
 * 支持跨平台环境变量设置
 */

const config = require('../solana.config.js');
const { execSync } = require('child_process');
const path = require('path');

const targetCluster = process.argv[2] || process.env.SOLANA_CLUSTER || config.CLUSTER;

if (!['devnet', 'mainnet-beta'].includes(targetCluster)) {
  console.error('❌ 无效的网络模式，必须是 devnet 或 mainnet-beta');
  process.exit(1);
}

// 更新配置文件
const fs = require('fs');
const configPath = path.join(__dirname, '../solana.config.js');
let configContent = fs.readFileSync(configPath, 'utf-8');

// 更新 CLUSTER 值
configContent = configContent.replace(
  /CLUSTER: process\.env\.SOLANA_CLUSTER \|\| '[^']+'/,
  `CLUSTER: process.env.SOLANA_CLUSTER || '${targetCluster}'`
);

fs.writeFileSync(configPath, configContent, 'utf-8');
console.log(`✅ solana.config.js 已更新为: ${targetCluster}\n`);

// 运行配置脚本
const setupScript = path.join(__dirname, 'setup-solana-network.js');
try {
  execSync(`node ${setupScript}`, { stdio: 'inherit', env: { ...process.env, SOLANA_CLUSTER: targetCluster } });
} catch (error) {
  console.error('❌ 配置更新失败');
  process.exit(1);
}

