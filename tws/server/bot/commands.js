/**
 * Telegram Bot命令处理
 */

/**
 * 设置所有命令
 * @param {TelegramBot} bot - Bot实例
 */
export const setupCommands = (bot) => {
  // /start 命令 - 处理邀请链接
  bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const startParam = match[1]; // 邀请参数 (ref_12345)
    
    try {
      let welcomeMessage = `🎯 欢迎来到 TWS 天河计划！\n\n`;
      welcomeMessage += `这是一个战略资产交易平台，为台海地区提供避险资产。\n\n`;
      
      if (startParam && startParam.startsWith('ref_')) {
        const referrerId = startParam.replace('ref_', '');
        welcomeMessage += `📎 您通过邀请链接进入 (推荐人: ${referrerId})\n\n`;
        
        // 这里应该记录推荐关系
        // await recordReferral(chatId, referrerId);
      }
      
      welcomeMessage += `使用以下命令开始：\n`;
      welcomeMessage += `/market - 查看市场\n`;
      welcomeMessage += `/assets - 我的资产\n`;
      welcomeMessage += `/help - 帮助信息`;
      
      await bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: {
          inline_keyboard: [[
            { text: '🚀 打开应用', web_app: { url: process.env.WEB_APP_URL || 'https://tws-project.io' } }
          ]]
        }
      });
    } catch (error) {
      console.error('处理/start命令失败:', error);
    }
  });

  // /help 命令
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpText = `📖 TWS 命令帮助\n\n` +
      `/start - 开始使用\n` +
      `/market - 查看市场资产\n` +
      `/assets - 查看我的资产\n` +
      `/price - 查看价格趋势\n` +
      `/referral - 我的推荐\n` +
      `/help - 显示此帮助`;
    
    await bot.sendMessage(chatId, helpText);
  });

  // /market 命令
  bot.onText(/\/market/, async (msg) => {
    const chatId = msg.chat.id;
    // 这里应该从API获取市场数据
    const message = `🏪 市场资产\n\n` +
      `当前有 0 个可用资产\n` +
      `点击下方按钮查看详情`;
    
    await bot.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [[
          { text: '查看市场', web_app: { url: `${process.env.WEB_APP_URL}/market` } }
        ]]
      }
    });
  });

  // /assets 命令
  bot.onText(/\/assets/, async (msg) => {
    const chatId = msg.chat.id;
    const message = `💼 我的资产\n\n` +
      `您当前持有 0 个资产\n` +
      `总价值: $0 USDT`;
    
    await bot.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [[
          { text: '查看资产', web_app: { url: `${process.env.WEB_APP_URL}/loadout` } }
        ]]
      }
    });
  });

  // /referral 命令
  bot.onText(/\/referral/, async (msg) => {
    const chatId = msg.chat.id;
    const referralLink = `https://t.me/${bot.token.split(':')[0]}?start=ref_${chatId}`;
    
    const message = `🔗 我的推荐\n\n` +
      `邀请链接：\n\`${referralLink}\`\n\n` +
      `已邀请: 0 人\n` +
      `总返佣: 0 USDT`;
    
    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '复制链接', callback_data: 'copy_referral' }
        ]]
      }
    });
  });

  // 处理回调查询
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === 'copy_referral') {
      await bot.answerCallbackQuery(query.id, {
        text: '链接已复制到剪贴板'
      });
    }
  });

  console.log('✅ Bot命令已设置完成');
};

/**
 * 发送每日推送
 * @param {TelegramBot} bot - Bot实例
 * @param {number} chatId - 聊天ID
 * @param {string} message - 消息内容
 */
export const sendDailyPush = async (bot, chatId, message) => {
  try {
    await bot.sendMessage(chatId, message, {
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('发送推送失败:', error);
  }
};

/**
 * 发送价格提醒
 * @param {TelegramBot} bot - Bot实例
 * @param {number} chatId - 聊天ID
 * @param {Object} priceData - 价格数据
 */
export const sendPriceAlert = async (bot, chatId, priceData) => {
  const message = `📊 价格提醒\n\n` +
    `资产: ${priceData.assetName}\n` +
    `当前价格: $${priceData.price} USDT\n` +
    `变化: ${priceData.change > 0 ? '+' : ''}${priceData.change}%`;
  
  await bot.sendMessage(chatId, message);
};


