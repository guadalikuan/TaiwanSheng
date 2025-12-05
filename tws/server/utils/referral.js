import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../data');
const REFERRALS_FILE = join(DATA_DIR, 'referrals.json');

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
 * 记录推荐收益
 * @param {string} userId - 用户ID（下线）
 * @param {number} amount - 收益金额（USDT）
 * @param {number} commissionRate - 佣金比例（默认5%）
 * @returns {Object} 收益记录
 */
export const recordCommission = (userId, amount, commissionRate = 0.05) => {
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
  
  return {
    referrerId: referral.referrerId,
    commission,
    timestamp: Date.now()
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


