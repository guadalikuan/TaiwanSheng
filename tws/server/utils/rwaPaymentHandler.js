/**
 * RWA支付处理
 * 处理TOT代币支付、余额检查、交易验证
 */

import { verifyPayment } from './paymentVerifier.js';
import { getTaiOneTokenBalance } from './solanaBlockchain.js';

/**
 * 检查用户余额
 * @param {string} userAddress - 用户钱包地址
 * @param {number} requiredAmount - 所需金额（TOT）
 * @returns {Promise<Object>} { sufficient: boolean, balance: number, required: number }
 */
export const checkBalance = async (userAddress, requiredAmount) => {
  try {
    const balance = await getTaiOneTokenBalance(userAddress);
    const sufficient = balance >= requiredAmount;
    
    return {
      sufficient,
      balance,
      required: requiredAmount,
      shortfall: sufficient ? 0 : (requiredAmount - balance)
    };
  } catch (error) {
    console.error('Error checking balance:', error);
    return {
      sufficient: false,
      balance: 0,
      required: requiredAmount,
      shortfall: requiredAmount,
      error: error.message
    };
  }
};

/**
 * 验证支付交易
 * @param {string} txSignature - 交易签名
 * @param {Object} paymentInfo - 支付信息
 * @returns {Promise<Object>} 验证结果
 */
export const verifyPaymentTransaction = async (txSignature, paymentInfo) => {
  try {
    const verification = await verifyPayment(txSignature, {
      from: paymentInfo.from,
      to: paymentInfo.to,
      amount: paymentInfo.amount,
      ...paymentInfo.extra
    });
    
    return {
      valid: verification.valid,
      message: verification.message,
      txHash: verification.txHash || txSignature,
      amount: verification.amount || paymentInfo.amount
    };
  } catch (error) {
    console.error('Error verifying payment:', error);
    return {
      valid: false,
      message: error.message,
      txHash: null
    };
  }
};

/**
 * 计算锁定费用
 * @param {number} assetPrice - 资产价格（TOT）
 * @param {number} fixedFee - 固定费用（可选）
 * @returns {number} 锁定费用
 */
export const calculateLockFee = (assetPrice, fixedFee = 100) => {
  const percentageFee = assetPrice * 0.05; // 5%
  return Math.max(percentageFee, fixedFee); // 取较大值
};

/**
 * 计算交易手续费
 * @param {number} tradeAmount - 交易金额
 * @param {number} feeRate - 手续费率（默认2%）
 * @returns {number} 手续费
 */
export const calculateTradeFee = (tradeAmount, feeRate = 0.02) => {
  return tradeAmount * feeRate;
};

/**
 * 处理支付
 * @param {Object} paymentData - 支付数据
 * @returns {Promise<Object>} 支付结果
 */
export const processPayment = async (paymentData) => {
  const { userAddress, amount, txSignature, paymentType } = paymentData;
  
  try {
    // 1. 检查余额
    const balanceCheck = await checkBalance(userAddress, amount);
    if (!balanceCheck.sufficient) {
      return {
        success: false,
        error: 'Insufficient balance',
        message: `余额不足，需要 ${amount} TOT，当前余额 ${balanceCheck.balance} TOT`
      };
    }
    
    // 2. 验证交易（如果提供了交易签名）
    if (txSignature) {
      const verification = await verifyPaymentTransaction(txSignature, {
        from: userAddress,
        to: paymentData.to || 'platform',
        amount: amount,
        ...paymentData.extra
      });
      
      if (!verification.valid) {
        return {
          success: false,
          error: 'Payment verification failed',
          message: verification.message
        };
      }
      
      return {
        success: true,
        txHash: verification.txHash,
        amount: verification.amount,
        paymentType
      };
    }
    
    // 如果没有交易签名，假设是链下记录（开发/测试环境）
    return {
      success: true,
      txHash: `mock_${Date.now()}`,
      amount: amount,
      paymentType,
      note: 'Mock payment (no blockchain verification)'
    };
  } catch (error) {
    console.error('Error processing payment:', error);
    return {
      success: false,
      error: 'Payment processing failed',
      message: error.message
    };
  }
};

/**
 * 记录支付记录
 * @param {Object} paymentRecord - 支付记录
 * @returns {Promise<Object>} 保存的记录
 */
export const recordPayment = async (paymentRecord) => {
  // 这里可以将支付记录保存到数据库
  // 目前简化处理，只返回记录
  return {
    id: paymentRecord.id || `payment_${Date.now()}`,
    ...paymentRecord,
    recordedAt: Date.now()
  };
};

