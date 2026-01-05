import TelegramBot from 'node-telegram-bot-api';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 从环境变量获取Bot Token
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

let bot = null;

if (BOT_TOKEN) {
  try {
    // 创建Bot实例
    bot = new TelegramBot(BOT_TOKEN, { polling: true });
    
    console.log('🤖 Telegram Bot 已启动');
    
    // 导入命令处理
    import('./commands.js').then(({ setupCommands }) => {
      setupCommands(bot);
    }).catch(error => {
      console.error('加载命令失败:', error);
    });
    
    // 错误处理
    bot.on('error', (error) => {
      console.error('Bot错误:', error);
    });
    
    bot.on('polling_error', (error) => {
      console.error('轮询错误:', error);
    });
  } catch (error) {
    console.error('启动Telegram Bot失败:', error);
    bot = null;
  }
} else {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN 未设置，Telegram Bot 将不会启动');
}

export default bot;

