import { put, get, getAll, NAMESPACES } from './rocksdb.js';
import { verifyPayment } from './paymentVerifier.js';

/**
 * 记录投资交易
 * @param {Object} investmentData - 投资数据
 * @returns {Promise<Object>} 保存的投资记录
 */
export const recordInvestment = async (investmentData) => {
  const investment = {
    id: investmentData.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    projectId: investmentData.projectId,
    investorAddress: investmentData.investorAddress.toLowerCase(),
    amount: Number(investmentData.amount),
    txSignature: investmentData.txSignature,
    timestamp: investmentData.timestamp || Date.now(),
    status: investmentData.status || 'PENDING',
    verified: false
  };

  await put(NAMESPACES.INVESTMENTS, investment.id, investment);
  return investment;
};

/**
 * 验证链上TWSCoin转账
 * @param {string} txSignature - 交易签名
 * @param {Object} expectedPayment - 期望的支付信息
 * @returns {Promise<Object>} 验证结果
 */
export const verifyInvestmentPayment = async (txSignature, expectedPayment) => {
  try {
    // 检查是否已经验证过
    const existingInvestments = await getAll(NAMESPACES.INVESTMENTS);
    const existing = existingInvestments.find(inv => 
      inv.value.txSignature === txSignature && inv.value.status === 'CONFIRMED'
    );

    if (existing) {
      return {
        valid: false,
        message: 'Transaction already verified',
        existing: existing.value
      };
    }

    // 调用paymentVerifier验证
    const verification = await verifyPayment(txSignature, expectedPayment);
    
    if (verification.valid) {
      // 更新投资记录状态
      const investment = existingInvestments.find(inv => inv.value.txSignature === txSignature);
      if (investment) {
        investment.value.status = 'CONFIRMED';
        investment.value.verified = true;
        investment.value.verifiedAt = Date.now();
        await put(NAMESPACES.INVESTMENTS, investment.value.id, investment.value);
      }
    }

    return verification;
  } catch (error) {
    console.error('Error verifying investment payment:', error);
    return {
      valid: false,
      message: error.message
    };
  }
};

/**
 * 计算投资份额
 * @param {Object} project - 项目数据
 * @param {number} investmentAmount - 投资金额
 * @returns {number} 投资份额（百分比）
 */
export const calculateInvestmentShare = (project, investmentAmount) => {
  if (!project.targetAmount || project.targetAmount === 0) {
    return 0;
  }
  return (investmentAmount / project.targetAmount) * 100;
};

/**
 * 计算预估收益
 * @param {Object} project - 项目数据
 * @param {number} investmentAmount - 投资金额
 * @returns {number} 预估收益
 */
export const calculateEstimatedReturn = (project, investmentAmount) => {
  // 从yield字符串中提取百分比
  const yieldMatch = project.yield?.match(/(\d+\.?\d*)%/);
  const yieldPercent = yieldMatch ? parseFloat(yieldMatch[1]) : 0;
  
  // 假设投资期为项目周期
  const duration = project.duration || 12; // 月
  const annualReturn = (investmentAmount * yieldPercent) / 100;
  const totalReturn = (annualReturn * duration) / 12;
  
  return {
    investmentAmount,
    annualReturn,
    totalReturn,
    yieldPercent,
    duration
  };
};

/**
 * 获取用户的所有投资记录
 * @param {string} walletAddress - 钱包地址
 * @returns {Promise<Array>} 投资记录数组
 */
export const getUserInvestments = async (walletAddress) => {
  const allInvestments = await getAll(NAMESPACES.INVESTMENTS);
  return allInvestments
    .filter(inv => inv.value.investorAddress.toLowerCase() === walletAddress.toLowerCase())
    .map(inv => inv.value)
    .sort((a, b) => b.timestamp - a.timestamp);
};

/**
 * 获取项目的所有投资记录
 * @param {string} projectId - 项目ID
 * @returns {Promise<Array>} 投资记录数组
 */
export const getProjectInvestments = async (projectId) => {
  const allInvestments = await getAll(NAMESPACES.INVESTMENTS);
  return allInvestments
    .filter(inv => inv.value.projectId === projectId)
    .map(inv => inv.value)
    .sort((a, b) => b.timestamp - a.timestamp);
};

/**
 * 获取投资统计信息
 * @param {string} walletAddress - 钱包地址（可选）
 * @param {string} projectId - 项目ID（可选）
 * @returns {Promise<Object>} 统计信息
 */
export const getInvestmentStats = async (walletAddress = null, projectId = null) => {
  const allInvestments = await getAll(NAMESPACES.INVESTMENTS);
  
  let filtered = allInvestments.map(inv => inv.value);
  
  if (walletAddress) {
    filtered = filtered.filter(inv => inv.investorAddress.toLowerCase() === walletAddress.toLowerCase());
  }
  
  if (projectId) {
    filtered = filtered.filter(inv => inv.projectId === projectId);
  }

  const confirmed = filtered.filter(inv => inv.status === 'CONFIRMED');
  const totalAmount = confirmed.reduce((sum, inv) => sum + inv.amount, 0);
  const count = confirmed.length;

  return {
    totalInvestments: count,
    totalAmount,
    averageAmount: count > 0 ? totalAmount / count : 0,
    pending: filtered.filter(inv => inv.status === 'PENDING').length
  };
};

export default {
  recordInvestment,
  verifyInvestmentPayment,
  calculateInvestmentShare,
  calculateEstimatedReturn,
  getUserInvestments,
  getProjectInvestments,
  getInvestmentStats
};

