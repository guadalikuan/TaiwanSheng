import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../data');
const REFERRALS_FILE = join(DATA_DIR, 'referrals.json');
const PENDING_COMMISSIONS_FILE = join(DATA_DIR, 'pending_commissions.json');

// 批量转账阈值（TOT数量）
const BATCH_TRANSFER_THRESHOLD = 100; // 累积到100 TOT再转账

// 初始化推荐数据文件
const initReferralsFile = () => {
  if (!existsSync(REFERRALS_FILE)) {
    writeFileSync(REFERRALS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
};

// 读取推荐数据
const readReferrals = () => {
  initReferralsFile();
  try {
    const data = readFileSync(REFERRALS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading referrals:', error);
    return [];
  }
};

// 写入推荐数据
const writeReferrals = (referrals) => {
  initReferralsFile();
  try {
    writeFileSync(REFERRALS_FILE, JSON.stringify(referrals, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing referrals:', error);
    throw error;
  }
};

// 读取待处理佣金
const readPendingCommissions = () => {
  if (!existsSync(PENDING_COMMISSIONS_FILE)) {
    return [];
  }
  try {
    const data = readFileSync(PENDING_COMMISSIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading pending commissions:', error);
    return [];
  }
};

// 写入待处理佣金
const writePendingCommissions = (commissions) => {
  try {
    writeFileSync(PENDING_COMMISSIONS_FILE, JSON.stringify(commissions, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing pending commissions:', error);
    throw error;
  }
};

/**
 * 记录推荐关系
 * @param {string} userId - 用户ID
 * @param {string} referrerId - 推荐人ID
 * @returns {Object} 推荐记录
 */
export const recordReferral = (userId, referrerId) => {
  const referrals = readReferrals();
  
  // 检查是否已存在
  const existing = referrals.find(r => r.userId === userId);
  if (existing) {
    return existing;
  }
  
  const referral = {
    userId,
    referrerId,
    createdAt: Date.now(),
    totalEarnings: 0,
    totalReferrals: 0,
    status: 'active'
  };
  
  referrals.push(referral);
  writeReferrals(referrals);
  
  return referral;
};

/**
 * 获取用户的推荐信息
 * @param {string} userId - 用户ID
 * @returns {Object|null} 推荐信息
 */
export const getReferralInfo = (userId) => {
  const referrals = readReferrals();
  return referrals.find(r => r.userId === userId) || null;
};

/**
 * 获取推荐人的所有下线
 * @param {string} referrerId - 推荐人ID
 * @returns {Array} 下线列表
 */
export const getReferrals = (referrerId) => {
  const referrals = readReferrals();
  return referrals.filter(r => r.referrerId === referrerId);
};

/**
 * 记录推荐收益并执行链上转账
 * @param {string} userId - 用户ID（下线）
 * @param {number} amount - 收益金额（TOT数量）
 * @param {number} commissionRate - 佣金比例（默认5%）
 * @param {Object} options - 选项
 * @param {boolean} options.immediateTransfer - 是否立即转账（默认true）
 * @returns {Promise<Object>} 收益记录
 */
export const recordCommission = async (userId, amount, commissionRate = 0.05, options = {}) => {
  const { immediateTransfer = true } = options;
  const referrals = readReferrals();
  const referral = referrals.find(r => r.userId === userId);
  
  if (!referral || !referral.referrerId) {
    return null;
  }
  
  const commission = amount * commissionRate;
  
  // 更新推荐人收益
  const referrer = referrals.find(r => r.userId === referral.referrerId);
  if (referrer) {
    referrer.totalEarnings += commission;
    referrer.totalReferrals += 1;
  }
  
  // 更新下线记录
  referral.totalEarnings += commission;
  
  writeReferrals(referrals);
  
  // 执行链上转账（如果启用且佣金大于0）
  let transferResult = null;
  if (commission > 0 && referrer) {
    if (immediateTransfer) {
      // 立即转账模式
      try {
        const { platformTransfer } = await import('./solanaBlockchain.js');
        transferResult = await platformTransfer(referrer.userId, commission);
        console.log(`✅ 推荐佣金转账成功: ${commission} TOT 到 ${referrer.userId}, Tx: ${transferResult.txHash}`);
      } catch (error) {
        console.error(`❌ 推荐佣金转账失败: ${referrer.userId}, 金额: ${commission} TOT`, error);
        // 转账失败，添加到待处理队列
        addPendingCommission(referrer.userId, commission);
        transferResult = {
          success: false,
          error: error.message
        };
      }
    } else {
      // 延迟转账模式：添加到待处理队列
      addPendingCommission(referrer.userId, commission);
      transferResult = {
        success: false,
        pending: true,
        message: 'Commission added to pending queue'
      };
    }
  }
  
  return {
    referrerId: referral.referrerId,
    commission,
    timestamp: Date.now(),
    transferResult: transferResult
  };
};

/**
 * 生成邀请链接
 * @param {string} userId - 用户ID
 * @param {string} botUsername - Bot用户名
 * @returns {string} 邀请链接
 */
export const generateInviteLink = (userId, botUsername) => {
  return `https://t.me/${botUsername}?start=ref_${userId}`;
};

/**
 * 添加待处理佣金到队列
 * @param {string} referrerId - 推荐人ID
 * @param {number} commission - 佣金金额
 */
const addPendingCommission = (referrerId, commission) => {
  const pending = readPendingCommissions();
  const existing = pending.find(p => p.referrerId === referrerId);
  
  if (existing) {
    existing.amount += commission;
    existing.updatedAt = Date.now();
  } else {
    pending.push({
      referrerId,
      amount: commission,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
  
  writePendingCommissions(pending);
};

/**
 * 批量处理待处理佣金（达到阈值或手动触发）
 * @param {Object} options - 选项
 * @param {boolean} options.force - 是否强制处理所有待处理佣金（忽略阈值）
 * @param {number} options.threshold - 自定义阈值（默认使用BATCH_TRANSFER_THRESHOLD）
 * @returns {Promise<Object>} 处理结果
 */
export const processPendingCommissions = async (options = {}) => {
  const { force = false, threshold = BATCH_TRANSFER_THRESHOLD } = options;
  const pending = readPendingCommissions();
  
  if (pending.length === 0) {
    return {
      success: true,
      message: 'No pending commissions',
      processed: 0,
      results: []
    };
  }
  
  const results = [];
  const remaining = [];
  
  for (const item of pending) {
    // 检查是否达到阈值或强制处理
    const shouldProcess = force || item.amount >= threshold;
    
    if (shouldProcess && item.amount > 0) {
      try {
        const { platformTransfer } = await import('./solanaBlockchain.js');
        const transferResult = await platformTransfer(item.referrerId, item.amount);
        console.log(`✅ 批量推荐佣金转账成功: ${item.amount} TOT 到 ${item.referrerId}, Tx: ${transferResult.txHash}`);
        results.push({
          referrerId: item.referrerId,
          amount: item.amount,
          success: true,
          txHash: transferResult.txHash
        });
      } catch (error) {
        console.error(`❌ 批量推荐佣金转账失败: ${item.referrerId}, 金额: ${item.amount} TOT`, error);
        // 转账失败，保留在队列中
        remaining.push({
          ...item,
          lastError: error.message,
          retryCount: (item.retryCount || 0) + 1
        });
        results.push({
          referrerId: item.referrerId,
          amount: item.amount,
          success: false,
          error: error.message
        });
      }
    } else {
      // 未达到阈值，保留在队列中
      remaining.push(item);
    }
  }
  
  // 更新待处理队列
  writePendingCommissions(remaining);
  
  return {
    success: true,
    processed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    remaining: remaining.length,
    results
  };
};

/**
 * 获取待处理佣金统计
 * @returns {Object} 统计信息
 */
export const getPendingCommissionsStats = () => {
  const pending = readPendingCommissions();
  const totalAmount = pending.reduce((sum, item) => sum + item.amount, 0);
  const readyToProcess = pending.filter(item => item.amount >= BATCH_TRANSFER_THRESHOLD);
  
  return {
    totalPending: pending.length,
    totalAmount,
    readyToProcess: readyToProcess.length,
    readyAmount: readyToProcess.reduce((sum, item) => sum + item.amount, 0),
    threshold: BATCH_TRANSFER_THRESHOLD
  };
};

/**
 * 获取推荐排行榜
 * @param {number} limit - 返回数量
 * @returns {Array} 排行榜
 */
export const getReferralLeaderboard = (limit = 10) => {
  const referrals = readReferrals();
  
  return referrals
    .filter(r => r.totalEarnings > 0)
    .sort((a, b) => b.totalEarnings - a.totalEarnings)
    .slice(0, limit)
    .map((r, index) => ({
      rank: index + 1,
      userId: r.userId,
      totalEarnings: r.totalEarnings,
      totalReferrals: r.totalReferrals
    }));
};


