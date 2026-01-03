import express from 'express';
import { ethers } from 'ethers';
import { authenticate } from '../middleware/auth.js';
import { 
  verifyUSDTTransfer, 
  getUSDTBalance, 
  createPaymentOrder, 
  verifyPaymentCallback 
} from '../utils/payment.js';
import { put, get, NAMESPACES } from '../utils/rocksdb.js';

const router = express.Router();

// POST /api/payment/create-order - 创建支付订单（需要认证）
router.post('/create-order', authenticate, async (req, res) => {
  try {
    const { assetId, amount, description } = req.body;
    
    if (!assetId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'assetId and amount are required'
      });
    }
    
    const order = createPaymentOrder({
      userId: req.user.address,
      assetId,
      amount,
      description: description || `Purchase asset ${assetId}`
    });
    
    // 保存订单到 RocksDB
    await put(NAMESPACES.PAYMENT_ORDERS, order.orderId, order);
    
    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order',
      message: error.message
    });
  }
});

// POST /api/payment/verify - 验证支付（需要认证）
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { txHash, orderId, fromAddress, toAddress, amount } = req.body;
    
    if (!txHash || !orderId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'txHash and orderId are required'
      });
    }
    
    // 从 RocksDB 获取订单
    const order = await get(NAMESPACES.PAYMENT_ORDERS, orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    // 验证订单所有者
    if (order.userId !== req.user.address) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'This order does not belong to you'
      });
    }
    
    // 验证支付
    const platformWallet = process.env.PLATFORM_WALLET || process.env.CONTRACT_ADDRESS;
    const result = await verifyPaymentCallback({
      txHash,
      orderId,
      fromAddress: fromAddress || req.user.address,
      toAddress: toAddress || platformWallet,
      amount: amount || order.amount
    });
    
    if (result.success) {
      // 更新订单状态
      order.status = 'paid';
      order.paidAt = new Date().toISOString();
      order.txHash = result.txHash;
      // 保存更新后的订单到 RocksDB
      await put(NAMESPACES.PAYMENT_ORDERS, orderId, order);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment',
      message: error.message
    });
  }
});

// GET /api/payment/balance/:address - 查询USDT余额
router.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address'
      });
    }
    
    const balance = await getUSDTBalance(address);
    
    res.json({
      success: true,
      address,
      balance,
      currency: 'USDT'
    });
  } catch (error) {
    console.error('Error getting balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get balance',
      message: error.message
    });
  }
});

// GET /api/payment/order/:orderId - 查询订单状态（需要认证）
router.get('/order/:orderId', authenticate, (req, res) => {
  try {
    const { orderId } = req.params;
    const order = orders.get(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    // 验证订单所有者
    if (order.userId !== req.user.address) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get order',
      message: error.message
    });
  }
});

export default router;

