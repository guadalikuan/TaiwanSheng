/**
 * Solana 网络配置
 * 
 * ⚠️ 重要: 修改此文件中的 CLUSTER 来切换 devnet 和 mainnet
 * 
 * 使用方法:
 * 1. 修改下面的 CLUSTER 值为 'devnet' 或 'mainnet-beta'
 * 2. 运行: npm run solana:config
 * 3. 部署: npm run solana:deploy
 */

module.exports = {
  // 网络模式: 'devnet' 或 'mainnet-beta'
  // 默认设置为 mainnet-beta (主网)
  CLUSTER: process.env.SOLANA_CLUSTER || 'mainnet-beta',
  
  // RPC 端点（如果使用自定义 RPC，设置此值）
  // null 表示使用默认端点
  RPC_URL: process.env.SOLANA_RPC_URL || null,
  
  // 钱包路径
  WALLET_PATH: process.env.SOLANA_WALLET_PATH || '~/.config/solana/id.json',
  
  // 默认 RPC 端点
  DEFAULT_RPC: {
    'devnet': 'https://api.devnet.solana.com',
    'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  },
  
  // 获取当前 RPC URL
  getRpcUrl() {
    return this.RPC_URL || this.DEFAULT_RPC[this.CLUSTER] || this.DEFAULT_RPC['mainnet-beta'];
  },
  
  // 是否为生产环境
  isProduction() {
    return this.CLUSTER === 'mainnet-beta';
  },
  
  // 获取网络显示名称
  getNetworkName() {
    return this.isProduction() ? '主网 (Mainnet)' : '测试网 (Devnet)';
  }
};


