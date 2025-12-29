const fs = require('fs');
const path = require('path');
const config = require('../solana.config.js');

/**
 * 设置 Solana 网络配置
 * 自动更新 Anchor.toml 中的 cluster 设置
 */

function updateAnchorToml() {
  const anchorTomlPath = path.join(__dirname, '../Anchor.toml');
  
  if (!fs.existsSync(anchorTomlPath)) {
    console.error('❌ Anchor.toml 文件不存在');
    process.exit(1);
  }
  
  let content = fs.readFileSync(anchorTomlPath, 'utf-8');
  
  // 更新 provider cluster
  const clusterPattern = /cluster = ".*"/;
  if (clusterPattern.test(content)) {
    content = content.replace(
      clusterPattern,
      `cluster = "${config.CLUSTER}"`
    );
    fs.writeFileSync(anchorTomlPath, content, 'utf-8');
    console.log(`✅ Anchor.toml 已更新为: ${config.CLUSTER}`);
  } else {
    console.warn('⚠️  未找到 cluster 配置，请手动检查 Anchor.toml');
  }
}

function displayConfig() {
  console.log('\n📋 当前 Solana 配置:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   网络模式: ${config.CLUSTER}`);
  console.log(`   网络名称: ${config.getNetworkName()}`);
  console.log(`   RPC URL:  ${config.getRpcUrl()}`);
  console.log(`   生产模式: ${config.isProduction() ? '是 ⚠️' : '否'}`);
  console.log(`   钱包路径: ${config.WALLET_PATH}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function showNextSteps() {
  console.log('📝 下一步操作:');
  
  if (config.isProduction()) {
    console.log('\n   ⚠️  警告: 您正在配置主网模式!');
    console.log('   ⚠️  主网部署需要真实 SOL，且不可撤销!\n');
    console.log('   1. 确保有足够的 SOL (约 2-3 SOL)');
    console.log('   2. 运行: solana config set --url mainnet-beta');
    console.log('   3. 检查余额: solana balance');
    console.log('   4. 构建程序: npm run solana:build');
    console.log('   5. 部署程序: npm run solana:deploy:mainnet');
  } else {
    console.log('\n   ✅ 测试网模式 - 安全测试环境\n');
    console.log('   1. 运行: solana config set --url devnet');
    console.log('   2. 获取测试 SOL: solana airdrop 2');
    console.log('   3. 构建程序: npm run solana:build');
    console.log('   4. 部署程序: npm run solana:deploy:devnet');
  }
  
  console.log('\n💡 提示:');
  console.log('   - 修改网络: 编辑 solana.config.js 中的 CLUSTER 值');
  console.log('   - 快速切换: npm run solana:switch:mainnet 或 npm run solana:switch:devnet');
  console.log('');
}

function main() {
  console.log('🔧 配置 Solana 网络...\n');
  
  displayConfig();
  updateAnchorToml();
  showNextSteps();
  
  console.log('✅ 配置完成!\n');
}

main();


