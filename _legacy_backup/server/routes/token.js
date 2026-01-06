import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { ethers } from 'ethers';

const router = express.Router();

// TWS代币配置
const TWS_TOKEN_CONFIG = {
  // 基础价格（USDT）
  basePrice: 1.0,
  // 风险溢价系数（根据风险等级调整）
  riskMultiplier: {
    'CRITICAL': 1.8,  // 风险极高时，价格+80%
    'HIGH': 1.5,      // 高风险时，价格+50%
    'MEDIUM': 1.2,   // 中等风险时，价格+20%
    'LOW': 1.0       // 低风险时，基础价格
  },
  // 购买数量选项
  purchaseOptions: [
    { amount: 1000, label: '1,000 TWS', bonus: 0 },
    { amount: 5000, label: '5,000 TWS', bonus: 500 },  // 赠送500
    { amount: 10000, label: '10,000 TWS', bonus: 1500 } // 赠送1500
  ]
};

// 用户代币余额存储（实际应使用数据库）
const userTokenBalances = new Map();

/**
 * 计算TWS代币价格（基于风险等级）
 */
const calculateTokenPrice = (riskLevel = 'MEDIUM') => {
  const multiplier = TWS_TOKEN_CONFIG.riskMultiplier[riskLevel] || 1.2;
  return TWS_TOKEN_CONFIG.basePrice * multiplier;
};

/**
 * POST /api/token/purchase - 创建TWS代币购买订单
 */
router.post('/purchase', authenticate, async (req, res) => {
  try {
    const { amount, riskLevel } = req.body;
    
    if (!amount || amount < 1000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount',
        message: 'Minimum purchase amount is 1000 TWS'
      });
    }
    
    // 计算代币价格
    const tokenPrice = calculateTokenPrice(riskLevel || 'MEDIUM');
    const totalPrice = amount * tokenPrice;
    
    // 检查是否有购买选项的奖励
    const purchaseOption = TWS_TOKEN_CONFIG.purchaseOptions.find(
      opt => opt.amount === amount
    );
    const bonus = purchaseOption?.bonus || 0;
    const totalTokens = amount + bonus;
    
    // 创建订单
    const order = {
      orderId: `TWS_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId: req.user.address,
      username: req.user.username,
      amount: totalTokens, // 包含奖励
      price: totalPrice,
      tokenPrice: tokenPrice,
      bonus: bonus,
      status: 'pending',
      createdAt: Date.now()
    };
    
    res.json({
      success: true,
      order,
      message: bonus > 0 ? `购买${amount} TWS，赠送${bonus} TWS` : '订单创建成功'
    });
  } catch (error) {
    console.error('Error creating token purchase order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order',
      message: error.message
    });
  }
});

/**
 * POST /api/token/verify-purchase - 验证TWS代币购买（支付完成后）
 */
router.post('/verify-purchase', authenticate, async (req, res) => {
  try {
    const { orderId, txHash } = req.body;
    
    if (!orderId || !txHash) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'orderId and txHash are required'
      });
    }
    
    // TODO: 验证链上交易
    // 这里简化处理，实际应该验证USDT转账交易
    
    // 更新用户代币余额
    const currentBalance = userTokenBalances.get(req.user.address) || 0;
    // 这里应该从订单中获取amount，简化处理
    const newBalance = currentBalance + 1000; // 示例：增加1000
    
    userTokenBalances.set(req.user.address, newBalance);
    
    res.json({
      success: true,
      message: 'Purchase verified successfully',
      balance: newBalance,
      txHash
    });
  } catch (error) {
    console.error('Error verifying purchase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify purchase',
      message: error.message
    });
  }
});

/**
 * GET /api/token/balance/:address - 获取用户TWS代币余额
 */
router.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address'
      });
    }
    
    const balance = userTokenBalances.get(address) || 0;
    
    res.json({
      success: true,
      address,
      balance,
      currency: 'TWS'
    });
  } catch (error) {
    console.error('Error getting token balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get balance',
      message: error.message
    });
  }
});

/**
 * GET /api/token/price - 获取当前TWS代币价格
 */
router.get('/price', async (req, res) => {
  try {
    const { riskLevel } = req.query;
    const price = calculateTokenPrice(riskLevel || 'MEDIUM');
    
    res.json({
      success: true,
      price,
      basePrice: TWS_TOKEN_CONFIG.basePrice,
      riskLevel: riskLevel || 'MEDIUM',
      purchaseOptions: TWS_TOKEN_CONFIG.purchaseOptions
    });
  } catch (error) {
    console.error('Error getting token price:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get price',
      message: error.message
    });
  }
});

export default router;

