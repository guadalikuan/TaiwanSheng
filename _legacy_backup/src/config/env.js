// 环境变量配置管理
// 所有环境变量通过 Vite 的 import.meta.env 访问

const env = {
  // 应用配置
  appName: import.meta.env.VITE_APP_NAME || 'TWS Protocol',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
  appEnv: import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development',
  
  // API 配置
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  apiTimeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10),
  
  // 区块链配置
  chainId: parseInt(import.meta.env.VITE_CHAIN_ID || '56', 10),
  rpcUrl: import.meta.env.VITE_RPC_URL || 'https://bsc-dataseed.binance.org',
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS || '',
  
  // 倒计时目标日期（Unix 时间戳，毫秒）
  countdownTarget: parseInt(import.meta.env.VITE_COUNTDOWN_TARGET || '0', 10),
  
  // Telegram 配置
  telegramBotToken: import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '',
  telegramChannelId: import.meta.env.VITE_TELEGRAM_CHANNEL_ID || '',
  
  // 功能开关
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  enableErrorTracking: import.meta.env.VITE_ENABLE_ERROR_TRACKING === 'true',
  
  // 安全配置
  enableHttpsRedirect: import.meta.env.VITE_ENABLE_HTTPS_REDIRECT !== 'false',
  
  // 是否为生产环境
  isProduction: import.meta.env.PROD,
  isDevelopment: import.meta.env.DEV,
};

export default env;

