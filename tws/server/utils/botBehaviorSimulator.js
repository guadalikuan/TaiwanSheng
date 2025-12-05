import { createBotUser, getRandomBotUser, recordBotAction, getBotUserStats } from './botUserManager.js';
import { saveRawAsset, saveSanitizedAsset, getApprovedAssets, updateAssetStatus } from './storage.js';
import { wrapAsset } from './assetWrapperFactory.js';
import { addOmegaEvent } from './homepageStorage.js';
import { ROLES } from './roles.js';
import { submitOrder, getCurrentPrice, matchOrders } from './orderMatchingEngine.js';

// 城市列表
const CITIES = ['西安', '咸阳', '宝鸡', '商洛', '汉中', '安康', '延安', '榆林'];

// 生成随机数字
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * 模拟用户注册行为
 * @returns {Object|null} 创建的机器人用户或 null
 */
export const simulateUserRegistration = async () => {
  try {
    // 随机决定角色（80% USER, 20% SUBMITTER）
    const role = Math.random() > 0.2 ? ROLES.USER : ROLES.SUBMITTER;
    
    // 随机决定活跃度
    const activityLevels = ['high', 'medium', 'low'];
    const weights = [0.3, 0.5, 0.2]; // 30% high, 50% medium, 20% low
    const rand = Math.random();
    let activityLevel = 'medium';
    if (rand < weights[0]) {
      activityLevel = 'high';
    } else if (rand < weights[0] + weights[1]) {
      activityLevel = 'medium';
    } else {
      activityLevel = 'low';
    }
    
    // 根据角色设置偏好操作
    const preferredActions = role === ROLES.USER 
      ? ['purchase', 'trade'] 
      : ['submit'];
    
    const botUser = await createBotUser({
      role,
      activityLevel,
      preferredActions
    });
    
    // 生成Omega事件
    const eventText = `[TRIGGER] New user registered: ${botUser.username} (${role})`;
    addOmegaEvent(eventText);
    
    console.log(`🤖 Bot user registered: ${botUser.username} (${role})`);
    return botUser;
  } catch (error) {
    console.error('Error simulating user registration:', error);
    return null;
  }
};

/**
 * 模拟资产提交行为
 * @returns {Object|null} 提交的资产或 null
 */
export const simulateAssetSubmission = async () => {
  try {
    // 从SUBMITTER机器人池中选择一个
    const botUser = getRandomBotUser({ role: ROLES.SUBMITTER });
    
    if (!botUser) {
      // 如果没有SUBMITTER机器人，创建一个
      const newBot = await createBotUser({ role: ROLES.SUBMITTER });
      if (!newBot) return null;
      return await simulateAssetSubmission(); // 递归重试
    }
    
    // 生成随机资产数据
    const city = CITIES[random(0, CITIES.length - 1)];
    const area = random(80, 200);
    const debtPrice = random(50, 500);
    const ownerName = `Owner_${Math.random().toString(36).substring(2, 8)}`;
    
    const rawAsset = {
      id: `bot_asset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      ownerName,
      ownerId: String(random(1000, 9999)),
      contactPhone: `139${String(random(10000000, 99999999))}`,
      projectName: `${city}·项目${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      city,
      district: '开发区',
      address: `${city}路${random(1, 999)}号`,
      roomNumber: `${random(1, 30)}${random(1, 3)}${random(1, 4)}`,
      area,
      marketValuation: debtPrice * 1.5,
      debtAmount: debtPrice,
      proofDocs: [],
      timestamp: Date.now(),
      submittedBy: botUser.address
    };
    
    // 保存原始资产
    saveRawAsset(rawAsset);
    
    // 包装并保存脱敏资产
    const sanitizedAsset = wrapAsset(rawAsset);
    sanitizedAsset.id = rawAsset.id;
    sanitizedAsset.status = 'MINTING';
    saveSanitizedAsset(sanitizedAsset);
    
    // 随机决定是否自动审核为AVAILABLE（70%概率）
    if (Math.random() > 0.3) {
      // 延迟一小段时间后自动审核（模拟审核流程）
      setTimeout(() => {
        try {
          updateAssetStatus(sanitizedAsset.id, 'AVAILABLE', {
            reviewedBy: 'system',
            reviewNotes: 'Auto-approved by bot system',
            reviewedAt: Date.now()
          });
          console.log(`✅ Bot asset auto-approved: ${sanitizedAsset.codeName}`);
        } catch (error) {
          console.error('Error auto-approving asset:', error);
        }
      }, Math.random() * 5000 + 2000); // 2-7秒后审核
    }
    
    // 记录机器人行为
    recordBotAction(botUser.id, 'submit_asset');
    
    // 生成Omega事件
    const eventText = `[TRIGGER] Asset submitted: ${sanitizedAsset.codeName} from ${city}`;
    addOmegaEvent(eventText);
    
    console.log(`📦 Bot asset submitted: ${sanitizedAsset.codeName} by ${botUser.username}`);
    return sanitizedAsset;
  } catch (error) {
    console.error('Error simulating asset submission:', error);
    return null;
  }
};

/**
 * 模拟资产购买行为
 * @returns {Object|null} 购买的资产信息或 null
 */
export const simulateAssetPurchase = async () => {
  try {
    // 从USER机器人池中选择一个
    const botUser = getRandomBotUser({ role: ROLES.USER });
    
    if (!botUser) {
      // 如果没有USER机器人，创建一个
      const newBot = await createBotUser({ role: ROLES.USER });
      if (!newBot) return null;
      return await simulateAssetPurchase(); // 递归重试
    }
    
    // 获取已审核的可用资产
    const approvedAssets = getApprovedAssets();
    const availableAssets = approvedAssets.filter(
      asset => asset.status === 'AVAILABLE'
    );
    
    if (availableAssets.length === 0) {
      // 没有可用资产，不执行购买
      return null;
    }
    
    // 随机选择一个资产
    const selectedAsset = availableAssets[random(0, availableAssets.length - 1)];
    
    // 更新资产状态为RESERVED
    updateAssetStatus(selectedAsset.id, 'RESERVED', {
      reviewedBy: 'system',
      reviewNotes: `Purchased by bot user ${botUser.username}`,
      reviewedAt: Date.now(),
      purchasedBy: botUser.address,
      purchasedAt: Date.now()
    });
    
    // 记录机器人行为
    recordBotAction(botUser.id, 'purchase_asset');
    
    // 生成Omega事件
    const eventText = `[TRIGGER] Asset purchased: ${selectedAsset.codeName || selectedAsset.id} by ${botUser.username}`;
    addOmegaEvent(eventText);
    
    console.log(`💰 Bot asset purchased: ${selectedAsset.codeName || selectedAsset.id} by ${botUser.username}`);
    return {
      asset: selectedAsset,
      buyer: botUser
    };
  } catch (error) {
    console.error('Error simulating asset purchase:', error);
    return null;
  }
};

/**
 * 模拟机器人提交买卖订单
 * @returns {Object|null} 提交的订单信息或 null
 */
export const simulateOrderSubmission = async () => {
  try {
    // 从USER机器人池中选择一个
    const botUser = getRandomBotUser({ role: ROLES.USER });
    
    if (!botUser) {
      // 如果没有USER机器人，创建一个
      const newBot = await createBotUser({ role: ROLES.USER });
      if (!newBot) return null;
      return await simulateOrderSubmission(); // 递归重试
    }
    
    // 获取当前市场价格
    let currentPrice = getCurrentPrice();
    
    // 如果没有当前价格，使用默认价格（100）
    if (!currentPrice) {
      currentPrice = 100;
    }
    
    // 随机决定是买单还是卖单（60%买单，40%卖单，模拟市场偏向买入）
    const isBuy = Math.random() > 0.4;
    
    // 生成订单价格（基于当前价格，允许±5%的波动）
    const priceVariation = (Math.random() - 0.5) * 0.1; // -5% 到 +5%
    const orderPrice = Number((currentPrice * (1 + priceVariation)).toFixed(2));
    
    // 生成订单数量（随机，但确保合理）
    const orderAmount = Number((Math.random() * 100 + 10).toFixed(4)); // 10-110
    
    // 创建订单
    const order = {
      id: `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId: botUser.id,
      username: botUser.username,
      type: isBuy ? 'buy' : 'sell',
      price: orderPrice,
      amount: orderAmount,
      timestamp: Date.now()
    };
    
    // 提交订单到订单簿
    submitOrder(order);
    
    // 立即尝试撮合订单
    const matchedTrades = matchOrders();
    
    // 记录机器人行为
    recordBotAction(botUser.id, isBuy ? 'submit_buy_order' : 'submit_sell_order');
    
    // 如果有成交，生成Omega事件
    if (matchedTrades.length > 0) {
      const trade = matchedTrades[0];
      const eventText = `[TRIGGER] Trade executed: ${trade.amount.toFixed(2)} @ ${trade.price.toFixed(2)} by ${botUser.username}`;
      addOmegaEvent(eventText);
      console.log(`💱 Bot order matched: ${order.type} ${order.amount} @ ${order.price} by ${botUser.username}`);
    } else {
      console.log(`📝 Bot order submitted: ${order.type} ${order.amount} @ ${order.price} by ${botUser.username}`);
    }
    
    return {
      order,
      matched: matchedTrades.length > 0,
      trades: matchedTrades
    };
  } catch (error) {
    console.error('Error simulating order submission:', error);
    return null;
  }
};

/**
 * 生成Omega事件（基于系统状态）
 * @returns {Object|null} 生成的事件或 null
 */
export const generateOmegaEvent = () => {
  try {
    const stats = getBotUserStats();
    
    // 事件模板
    const eventTemplates = [
      `[TRIGGER] ${stats.active} active users online`,
      `[TRIGGER] Market activity spike detected`,
      `[TRIGGER] ${stats.byRole.USER} users browsing assets`,
      `[TRIGGER] ${stats.byRole.SUBMITTER} submitters active`,
      `[TRIGGER] Network traffic increase: +${random(5, 25)}%`,
      `[TRIGGER] New asset pool growth: +${random(1, 5)} units`,
      `[TRIGGER] User engagement level: ${stats.byActivityLevel.high > 0 ? 'HIGH' : 'NORMAL'}`,
      `[TRIGGER] System load: ${random(40, 85)}% capacity`,
      `[TRIGGER] Data sync: ${random(100, 500)} transactions processed`,
      `[TRIGGER] Geographic distribution: ${CITIES.length} regions active`
    ];
    
    // 随机选择一个模板
    const template = eventTemplates[random(0, eventTemplates.length - 1)];
    const event = addOmegaEvent(template);
    
    console.log(`⚡ Omega event generated: ${template}`);
    return event;
  } catch (error) {
    console.error('Error generating omega event:', error);
    return null;
  }
};

/**
 * 批量初始化机器人用户（用于系统启动时）
 * @param {number} count - 要创建的机器人数量
 * @returns {Array} 创建的机器人用户数组
 */
export const initializeBotUsers = async (count = 25) => {
  console.log(`🤖 Initializing ${count} bot users...`);
  const createdBots = [];
  
  for (let i = 0; i < count; i++) {
    try {
      // 80% USER, 20% SUBMITTER
      const role = Math.random() > 0.2 ? ROLES.USER : ROLES.SUBMITTER;
      
      // 随机活跃度
      const activityLevels = ['high', 'medium', 'low'];
      const activityLevel = activityLevels[random(0, activityLevels.length - 1)];
      
      const preferredActions = role === ROLES.USER 
        ? ['purchase', 'trade'] 
        : ['submit'];
      
      const botUser = await createBotUser({
        role,
        activityLevel,
        preferredActions
      });
      
      createdBots.push(botUser);
      
      // 添加小延迟，避免时间戳冲突
      await new Promise(resolve => setTimeout(resolve, 10));
    } catch (error) {
      console.error(`Error creating bot user ${i + 1}:`, error);
    }
  }
  
  console.log(`✅ Initialized ${createdBots.length} bot users`);
  return createdBots;
};

