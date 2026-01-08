/**
 * RWA交易路由
 * 处理购买需求、推荐、锁定、购买、二级市场交易
 */

import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ROLES } from '../utils/roles.js';
import { put, get, getAll, del, NAMESPACES } from '../utils/rocksdb.js';
import { getApprovedAssets, getAssetById, updateAssetStatus, getAllAssets } from '../utils/storage.js';
import { recommendAssets } from '../utils/rwaRecommendationEngine.js';
import { 
  createOrder, 
  getOrder, 
  getUserOrders, 
  getOrderBook, 
  cancelOrder,
  getAssetSellOrders
} from '../utils/rwaOrderBook.js';
import { 
  matchOrders, 
  getTradeHistory, 
  getTradeStats 
} from '../utils/rwaMatchingEngine.js';
import {
  createLock,
  getLock,
  getAssetLock,
  getUserLocks,
  releaseLock,
  confirmLock
} from '../utils/rwaLockManager.js';
import {
  checkBalance,
  calculateLockFee,
  processPayment,
  verifyPaymentTransaction
} from '../utils/rwaPaymentHandler.js';
import {
  recordShareHolding,
  getUserAssetShares,
  getUserHoldings,
  getAssetHolders,
  calculateUserTotalValue,
  formatShares,
  SHARE_PRECISION
} from '../utils/rwaShareTracker.js';
import {
  createEtfBasket,
  getEtfBasket,
  getAllEtfBaskets,
  recommendEtfByCities,
  calculateEtfAllocation,
  autoGenerateEtf,
  updateEtfBasket,
  deleteEtfBasket
} from '../utils/rwaEtfManager.js';
import blockchainService from '../utils/blockchain.js';

const router = express.Router();

// ==================== 购买需求API ====================

// POST /api/rwa-trade/buy-request - 创建购买需求
router.post('/buy-request', authenticate, async (req, res) => {
  try {
    const {
      preferredCity,
      preferredDistrict = '',
      minArea = 0,
      maxArea = 0,
      maxPrice = 0,
      urgency = 'medium'
    } = req.body;
    
    if (!preferredCity) {
      return res.status(400).json({
        success: false,
        error: 'preferredCity is required'
      });
    }
    
    const userId = req.user?.address || req.user?.username || req.user?.id;
    
    const buyRequest = {
      id: `buy_req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      preferredCity,
      preferredDistrict,
      minArea: Number(minArea),
      maxArea: Number(maxArea),
      maxPrice: Number(maxPrice),
      urgency: urgency || 'medium',
      status: 'active',
      createdAt: Date.now(),
      fulfilledAt: null,
      fulfilledAssetId: null
    };
    
    await put(NAMESPACES.BUY_REQUESTS, buyRequest.id, buyRequest);
    
    res.json({
      success: true,
      buyRequest
    });
  } catch (error) {
    console.error('Error creating buy request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create buy request',
      message: error.message
    });
  }
});

// GET /api/rwa-trade/buy-requests - 获取我的购买需求列表
router.get('/buy-requests', authenticate, async (req, res) => {
  try {
    const userId = req.user?.address || req.user?.username || req.user?.id;
    
    const allRequests = await getAll(NAMESPACES.BUY_REQUESTS);
    const requestValues = allRequests.map(r => r.value);
    
    const myRequests = requestValues
      .filter(req => req.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
    
    res.json({
      success: true,
      count: myRequests.length,
      buyRequests: myRequests
    });
  } catch (error) {
    console.error('Error getting buy requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get buy requests',
      message: error.message
    });
  }
});

// GET /api/rwa-trade/buy-request/:id - 获取购买需求详情
router.get('/buy-request/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.address || req.user?.username || req.user?.id;
    
    const result = await get(NAMESPACES.BUY_REQUESTS, id);
    const buyRequest = result?.value;
    
    if (!buyRequest) {
      return res.status(404).json({
        success: false,
        error: 'Buy request not found'
      });
    }
    
    // 检查权限
    if (buyRequest.userId !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    res.json({
      success: true,
      buyRequest
    });
  } catch (error) {
    console.error('Error getting buy request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get buy request',
      message: error.message
    });
  }
});

// PUT /api/rwa-trade/buy-request/:id - 更新购买需求
router.put('/buy-request/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.address || req.user?.username || req.user?.id;
    
    const result = await get(NAMESPACES.BUY_REQUESTS, id);
    const buyRequest = result?.value;
    
    if (!buyRequest) {
      return res.status(404).json({
        success: false,
        error: 'Buy request not found'
      });
    }
    
    if (buyRequest.userId !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    if (buyRequest.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Can only update active buy requests'
      });
    }
    
    const updatedRequest = {
      ...buyRequest,
      ...req.body,
      updatedAt: Date.now()
    };
    
    await put(NAMESPACES.BUY_REQUESTS, id, updatedRequest);
    
    res.json({
      success: true,
      buyRequest: updatedRequest
    });
  } catch (error) {
    console.error('Error updating buy request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update buy request',
      message: error.message
    });
  }
});

// DELETE /api/rwa-trade/buy-request/:id - 取消购买需求
router.delete('/buy-request/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.address || req.user?.username || req.user?.id;
    
    const result = await get(NAMESPACES.BUY_REQUESTS, id);
    const buyRequest = result?.value;
    
    if (!buyRequest) {
      return res.status(404).json({
        success: false,
        error: 'Buy request not found'
      });
    }
    
    if (buyRequest.userId !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    const updatedRequest = {
      ...buyRequest,
      status: 'cancelled',
      cancelledAt: Date.now()
    };
    
    await put(NAMESPACES.BUY_REQUESTS, id, updatedRequest);
    
    res.json({
      success: true,
      message: 'Buy request cancelled'
    });
  } catch (error) {
    console.error('Error cancelling buy request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel buy request',
      message: error.message
    });
  }
});

// ==================== 推荐API ====================

// POST /api/rwa-trade/recommend - 获取推荐房源
router.post('/recommend', authenticate, async (req, res) => {
  try {
    const { buyRequestId, buyRequest, limit = 10 } = req.body;
    
    let requestData = buyRequest;
    
    // 如果提供了buyRequestId，从数据库获取
    if (buyRequestId && !buyRequest) {
      const result = await get(NAMESPACES.BUY_REQUESTS, buyRequestId);
      if (!result?.value) {
        return res.status(404).json({
          success: false,
          error: 'Buy request not found'
        });
      }
      requestData = result.value;
    }
    
    if (!requestData) {
      return res.status(400).json({
        success: false,
        error: 'buyRequestId or buyRequest is required'
      });
    }
    
    const recommendations = await recommendAssets(requestData, limit);
    
    res.json({
      success: true,
      count: recommendations.length,
      recommendations
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations',
      message: error.message
    });
  }
});

// GET /api/rwa-trade/recommendations/:requestId - 获取特定需求的推荐
router.get('/recommendations/:requestId', authenticate, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { limit = 10 } = req.query;
    
    const result = await get(NAMESPACES.BUY_REQUESTS, requestId);
    const buyRequest = result?.value;
    
    if (!buyRequest) {
      return res.status(404).json({
        success: false,
        error: 'Buy request not found'
      });
    }
    
    const recommendations = await recommendAssets(buyRequest, Number(limit));
    
    res.json({
      success: true,
      count: recommendations.length,
      recommendations
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations',
      message: error.message
    });
  }
});

// ==================== 锁定和购买API ====================

// POST /api/rwa-trade/lock/:assetId - 锁定资产
router.post('/lock/:assetId', authenticate, async (req, res) => {
  try {
    const { assetId } = req.params;
    const { txSignature } = req.body;
    const userId = req.user?.address || req.user?.username || req.user?.id;
    
    // 获取资产数据
    const assetData = await getAssetById(assetId);
    if (!assetData.sanitized) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }
    
    // 检查资产状态
    if (assetData.sanitized.status !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        error: 'Asset is not available',
        message: `Asset status is ${assetData.sanitized.status}`
      });
    }
    
    // 检查是否已被锁定
    const existingLock = await getAssetLock(assetId);
    if (existingLock) {
      return res.status(400).json({
        success: false,
        error: 'Asset is already locked',
        message: `Locked by ${existingLock.userId} until ${new Date(existingLock.lockExpiresAt).toISOString()}`
      });
    }
    
    // 计算锁定费用
    const assetPrice = assetData.sanitized.financials?.totalTokens || 
                      assetData.sanitized.tokenPrice || 
                      assetData.raw?.debtAmount || 0;
    const lockFee = calculateLockFee(assetPrice);
    
    // 检查余额
    const balanceCheck = await checkBalance(userId, lockFee);
    if (!balanceCheck.sufficient) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        message: balanceCheck.message || `需要 ${lockFee} TOT，当前余额 ${balanceCheck.balance} TOT`
      });
    }
    
    // 处理支付
    const paymentResult = await processPayment({
      userAddress: userId,
      amount: lockFee,
      txSignature,
      paymentType: 'lock_fee',
      to: 'platform',
      extra: { assetId, lockFee }
    });
    
    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Payment failed',
        message: paymentResult.message
      });
    }
    
    // 创建锁定记录
    const lock = await createLock({
      assetId,
      userId,
      lockFee,
      lockExpiresAt: Date.now() + 48 * 60 * 60 * 1000, // 48小时
      txHash: paymentResult.txHash
    });
    
    // 更新资产状态
    await updateAssetStatus(assetId, 'RESERVED', {
      lockedBy: userId,
      lockedAt: Date.now(),
      lockExpiresAt: lock.lockExpiresAt,
      lockFee: lockFee
    });
    
    res.json({
      success: true,
      message: 'Asset locked successfully',
      lock,
      lockExpiresAt: lock.lockExpiresAt
    });
  } catch (error) {
    console.error('Error locking asset:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to lock asset',
      message: error.message
    });
  }
});

// POST /api/rwa-trade/confirm/:assetId - 确认购买（支付全款）
router.post('/confirm/:assetId', authenticate, async (req, res) => {
  try {
    const { assetId } = req.params;
    const { txSignature } = req.body;
    const userId = req.user?.address || req.user?.username || req.user?.id;
    
    // 获取资产数据
    const assetData = await getAssetById(assetId);
    if (!assetData.sanitized) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }
    
    // 检查锁定状态
    const lock = await getAssetLock(assetId);
    if (!lock) {
      return res.status(400).json({
        success: false,
        error: 'Asset is not locked'
      });
    }
    
    if (lock.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: '只能确认自己锁定的资产'
      });
    }
    
    if (lock.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Lock is not active',
        message: `Lock status is ${lock.status}`
      });
    }
    
    const now = Date.now();
    if (lock.lockExpiresAt < now) {
      return res.status(400).json({
        success: false,
        error: 'Lock has expired'
      });
    }
    
    // 计算全款（资产价格 - 已支付的锁定费用）
    const assetPrice = assetData.sanitized.financials?.totalTokens || 
                      assetData.sanitized.tokenPrice || 
                      assetData.raw?.debtAmount || 0;
    const remainingAmount = assetPrice - lock.lockFee;
    
    // 检查余额
    const balanceCheck = await checkBalance(userId, remainingAmount);
    if (!balanceCheck.sufficient) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        message: `需要 ${remainingAmount} TOT，当前余额 ${balanceCheck.balance} TOT`
      });
    }
    
    // 处理支付
    const paymentResult = await processPayment({
      userAddress: userId,
      amount: remainingAmount,
      txSignature,
      paymentType: 'purchase',
      to: 'platform',
      extra: { assetId, totalPrice: assetPrice, lockFee: lock.lockFee }
    });
    
    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Payment failed',
        message: paymentResult.message
      });
    }
    
    // 确认锁定
    await confirmLock(lock.id);
    
    // 更新资产状态
    const updatedAsset = await updateAssetStatus(assetId, 'LOCKED', {
      purchasedBy: userId,
      purchasedAt: Date.now(),
      purchasePrice: assetPrice,
      purchaseTxHash: paymentResult.txHash
    });
    
    // 可选：触发NFT铸造
    let mintResult = null;
    if (process.env.CONTRACT_ADDRESS) {
      try {
        mintResult = await blockchainService.mintAsset(assetData, userId);
        await updateAssetStatus(assetId, 'LOCKED', {
          nftMinted: true,
          nftTokenId: mintResult.tokenId,
          nftTxHash: mintResult.txHash,
          nftMintedAt: Date.now()
        });
      } catch (mintError) {
        console.error('⚠️ NFT铸造失败（但购买已确认）:', mintError);
      }
    }
    
    res.json({
      success: true,
      message: 'Purchase confirmed successfully',
      asset: updatedAsset,
      blockchain: mintResult ? {
        txHash: mintResult.txHash,
        tokenId: mintResult.tokenId
      } : null
    });
  } catch (error) {
    console.error('Error confirming purchase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm purchase',
      message: error.message
    });
  }
});

// POST /api/rwa-trade/release/:assetId - 释放锁定
router.post('/release/:assetId', authenticate, async (req, res) => {
  try {
    const { assetId } = req.params;
    const userId = req.user?.address || req.user?.username || req.user?.id;
    
    const lock = await getAssetLock(assetId);
    if (!lock) {
      return res.status(404).json({
        success: false,
        error: 'Lock not found'
      });
    }
    
    if (lock.userId !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    // 释放锁定（退还费用如果未过期）
    const now = Date.now();
    const refundFee = lock.lockExpiresAt > now;
    
    await releaseLock(lock.id, refundFee);
    
    res.json({
      success: true,
      message: 'Lock released successfully',
      refundFee: refundFee ? lock.lockFee : 0
    });
  } catch (error) {
    console.error('Error releasing lock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to release lock',
      message: error.message
    });
  }
});

// GET /api/rwa-trade/locks - 获取我的锁定列表
router.get('/locks', authenticate, async (req, res) => {
  try {
    const userId = req.user?.address || req.user?.username || req.user?.id;
    const locks = await getUserLocks(userId);
    
    // 获取资产信息
    const locksWithAssets = await Promise.all(locks.map(async (lock) => {
      try {
        const assetData = await getAssetById(lock.assetId);
        return {
          ...lock,
          asset: assetData.sanitized
        };
      } catch (error) {
        return {
          ...lock,
          asset: null
        };
      }
    }));
    
    res.json({
      success: true,
      count: locksWithAssets.length,
      locks: locksWithAssets
    });
  } catch (error) {
    console.error('Error getting locks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get locks',
      message: error.message
    });
  }
});

// ==================== 二级市场API ====================

// POST /api/rwa-trade/sell-order - 创建卖单
router.post('/sell-order', authenticate, async (req, res) => {
  try {
    const { assetId, price, amount = 1, expiresAt } = req.body;
    const userId = req.user?.address || req.user?.username || req.user?.id;
    
    if (!assetId || !price) {
      return res.status(400).json({
        success: false,
        error: 'assetId and price are required'
      });
    }
    
    // 验证资产所有权
    const assetData = await getAssetById(assetId);
    if (!assetData.sanitized) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }
    
    if (assetData.sanitized.status !== 'LOCKED') {
      return res.status(400).json({
        success: false,
        error: 'Asset must be LOCKED to create sell order'
      });
    }
    
    if (assetData.sanitized.purchasedBy !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: '只能出售自己拥有的资产'
      });
    }
    
    const order = await createOrder({
      id: `sell_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      assetId,
      userId,
      orderType: 'sell',
      price: Number(price),
      amount: Number(amount),
      expiresAt: expiresAt ? Number(expiresAt) : undefined
    });
    
    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Error creating sell order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create sell order',
      message: error.message
    });
  }
});

// POST /api/rwa-trade/buy-order - 创建买单
router.post('/buy-order', authenticate, async (req, res) => {
  try {
    const { preferredCity, maxPrice, amount = 1, expiresAt } = req.body;
    const userId = req.user?.address || req.user?.username || req.user?.id;
    
    if (!preferredCity || !maxPrice) {
      return res.status(400).json({
        success: false,
        error: 'preferredCity and maxPrice are required'
      });
    }
    
    const order = await createOrder({
      id: `buy_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      orderType: 'buy',
      preferredCity,
      price: Number(maxPrice),
      amount: Number(amount),
      expiresAt: expiresAt ? Number(expiresAt) : undefined
    });
    
    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Error creating buy order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create buy order',
      message: error.message
    });
  }
});

// GET /api/rwa-trade/order-book - 获取订单簿
router.get('/order-book', async (req, res) => {
  try {
    const { city, limit = 20 } = req.query;
    const orderBook = await getOrderBook(city || null, Number(limit));
    
    res.json({
      success: true,
      orderBook
    });
  } catch (error) {
    console.error('Error getting order book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get order book',
      message: error.message
    });
  }
});

// GET /api/rwa-trade/orders - 获取我的订单
router.get('/orders', authenticate, async (req, res) => {
  try {
    const userId = req.user?.address || req.user?.username || req.user?.id;
    const { orderType, status } = req.query;
    
    const orders = await getUserOrders(userId, orderType, status);
    
    res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get orders',
      message: error.message
    });
  }
});

// DELETE /api/rwa-trade/order/:id - 取消订单
router.delete('/order/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.address || req.user?.username || req.user?.id;
    
    await cancelOrder(id, userId);
    
    res.json({
      success: true,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel order',
      message: error.message
    });
  }
});

// POST /api/rwa-trade/match - 手动触发撮合
router.post('/match', authenticate, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { city, maxMatches = 10 } = req.body;
    const trades = await matchOrders({ city, maxMatches });
    
    res.json({
      success: true,
      count: trades.length,
      trades
    });
  } catch (error) {
    console.error('Error matching orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to match orders',
      message: error.message
    });
  }
});

// GET /api/rwa-trade/trades - 获取交易历史
router.get('/trades', async (req, res) => {
  try {
    const { userId, assetId, limit = 50 } = req.query;
    const trades = await getTradeHistory({
      userId: userId || null,
      assetId: assetId || null,
      limit: Number(limit)
    });
    
    res.json({
      success: true,
      count: trades.length,
      trades
    });
  } catch (error) {
    console.error('Error getting trades:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trades',
      message: error.message
    });
  }
});

// GET /api/rwa-trade/stats - 获取交易统计
router.get('/stats', async (req, res) => {
  try {
    const { timeWindow = 24 * 60 * 60 * 1000 } = req.query;
    const stats = await getTradeStats({ timeWindow: Number(timeWindow) });
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting trade stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trade stats',
      message: error.message
    });
  }
});

// ==================== 份额购买API ====================

// POST /api/rwa-trade/buy-shares - 直接购买指定资产的份额
router.post('/buy-shares', authenticate, async (req, res) => {
  try {
    const { assetId, shares, txSignature } = req.body;
    const userId = req.user?.address || req.user?.username || req.user?.id;
    
    if (!assetId || !shares) {
      return res.status(400).json({
        success: false,
        error: 'assetId and shares are required'
      });
    }
    
    if (shares < SHARE_PRECISION) {
      return res.status(400).json({
        success: false,
        error: `Shares must be at least ${SHARE_PRECISION}`
      });
    }
    
    // 获取资产数据
    const assetData = await getAssetById(assetId);
    if (!assetData.sanitized && !assetData.raw) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }
    
    const asset = assetData.sanitized || assetData.raw;
    
    // 计算资产总价和总份额
    const totalPrice = asset.financials?.totalTokens || asset.tokenPrice || asset.debtAmount || 0;
    const totalShares = asset.totalShares || 10000; // 默认10000份
    const pricePerShare = totalPrice / totalShares;
    const requiredAmount = formatShares(shares) * pricePerShare;
    
    // 检查余额
    const balanceCheck = await checkBalance(userId, requiredAmount);
    if (!balanceCheck.sufficient) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        message: balanceCheck.message || `需要 ${requiredAmount} TOT，当前余额 ${balanceCheck.balance} TOT`
      });
    }
    
    // 处理支付
    const paymentResult = await processPayment({
      userAddress: userId,
      amount: requiredAmount,
      txSignature,
      paymentType: 'share_purchase',
      to: 'platform',
      extra: { assetId, shares: formatShares(shares) }
    });
    
    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Payment failed',
        message: paymentResult.message
      });
    }
    
    // 记录份额持有
    const holding = await recordShareHolding(userId, assetId, formatShares(shares));
    
    res.json({
      success: true,
      message: 'Shares purchased successfully',
      holding,
      shares: formatShares(shares),
      pricePerShare,
      totalAmount: requiredAmount,
      txHash: paymentResult.txHash
    });
  } catch (error) {
    console.error('Error buying shares:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to buy shares',
      message: error.message
    });
  }
});

// ==================== ETF购买API ====================

// POST /api/rwa-trade/etf/buy - 购买ETF
router.post('/etf/buy', authenticate, async (req, res) => {
  try {
    const { etfId, investmentAmount, txSignature } = req.body;
    const userId = req.user?.address || req.user?.username || req.user?.id;
    
    if (!etfId || !investmentAmount) {
      return res.status(400).json({
        success: false,
        error: 'etfId and investmentAmount are required'
      });
    }
    
    // 获取ETF篮子
    const etf = await getEtfBasket(etfId);
    if (!etf) {
      return res.status(404).json({
        success: false,
        error: 'ETF not found'
      });
    }
    
    // 检查最小投资额
    if (investmentAmount < etf.minInvestment) {
      return res.status(400).json({
        success: false,
        error: `Minimum investment is ${etf.minInvestment} TOT`
      });
    }
    
    // 计算分配
    const allocations = await calculateEtfAllocation(etfId, investmentAmount);
    
    // 检查余额
    const balanceCheck = await checkBalance(userId, investmentAmount);
    if (!balanceCheck.sufficient) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        message: balanceCheck.message || `需要 ${investmentAmount} TOT，当前余额 ${balanceCheck.balance} TOT`
      });
    }
    
    // 处理支付
    const paymentResult = await processPayment({
      userAddress: userId,
      amount: investmentAmount,
      txSignature,
      paymentType: 'etf_purchase',
      to: 'platform',
      extra: { etfId, investmentAmount }
    });
    
    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Payment failed',
        message: paymentResult.message
      });
    }
    
    // 为每个资产购买对应份额
    const purchaseResults = [];
    for (const allocation of allocations) {
      try {
        // 获取资产信息以计算份额
        const assetData = await getAssetById(allocation.assetId);
        if (!assetData.sanitized && !assetData.raw) {
          console.error(`Asset ${allocation.assetId} not found`);
          continue;
        }
        
        const asset = assetData.sanitized || assetData.raw;
        const totalPrice = asset.financials?.totalTokens || asset.tokenPrice || asset.debtAmount || 0;
        const totalShares = asset.totalShares || 10000;
        const pricePerShare = totalPrice / totalShares;
        
        // 计算应购买的份额
        const shares = formatShares(allocation.investmentAmount / pricePerShare);
        
        // 记录份额持有
        const holding = await recordShareHolding(userId, allocation.assetId, shares);
        
        purchaseResults.push({
          assetId: allocation.assetId,
          shares,
          investmentAmount: allocation.investmentAmount,
          pricePerShare,
          holding
        });
      } catch (error) {
        console.error(`Error purchasing asset ${allocation.assetId}:`, error);
        // 继续处理其他资产
      }
    }
    
    res.json({
      success: true,
      message: 'ETF purchase completed',
      etf: etf,
      allocations: purchaseResults,
      txHash: paymentResult.txHash
    });
  } catch (error) {
    console.error('Error buying ETF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to buy ETF',
      message: error.message
    });
  }
});

// ==================== ETF管理API ====================

// POST /api/rwa-trade/etf/create - 创建ETF（管理员）
router.post('/etf/create', authenticate, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const etf = await createEtfBasket(req.body);
    
    res.json({
      success: true,
      etf
    });
  } catch (error) {
    console.error('Error creating ETF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create ETF',
      message: error.message
    });
  }
});

// GET /api/rwa-trade/etf/list - 获取ETF列表
router.get('/etf/list', async (req, res) => {
  try {
    const { cities } = req.query;
    const cityList = cities ? cities.split(',') : [];
    
    const etfs = cityList.length > 0 
      ? await recommendEtfByCities(cityList)
      : await getAllEtfBaskets();
    
    res.json({
      success: true,
      count: etfs.length,
      etfs
    });
  } catch (error) {
    console.error('Error getting ETF list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ETF list',
      message: error.message
    });
  }
});

// GET /api/rwa-trade/etf/:id - 获取ETF详情
router.get('/etf/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const etf = await getEtfBasket(id);
    
    if (!etf) {
      return res.status(404).json({
        success: false,
        error: 'ETF not found'
      });
    }
    
    // 获取ETF中每个资产的详细信息
    const assets = await Promise.all(
      etf.assetIds.map(async (assetId) => {
        try {
          const assetData = await getAssetById(assetId);
          return assetData.sanitized || assetData.raw || null;
        } catch (error) {
          return null;
        }
      })
    );
    
    res.json({
      success: true,
      etf: {
        ...etf,
        assets: assets.filter(a => a !== null)
      }
    });
  } catch (error) {
    console.error('Error getting ETF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ETF',
      message: error.message
    });
  }
});

// POST /api/rwa-trade/etf/auto-generate - 自动生成ETF（根据城市）
router.post('/etf/auto-generate', authenticate, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { cities, assetCount = 5 } = req.body;
    
    if (!cities || !Array.isArray(cities) || cities.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'cities array is required'
      });
    }
    
    const etf = await autoGenerateEtf(cities, assetCount);
    
    res.json({
      success: true,
      etf
    });
  } catch (error) {
    console.error('Error auto-generating ETF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to auto-generate ETF',
      message: error.message
    });
  }
});

// ==================== 份额查询API ====================

// GET /api/rwa-trade/holdings - 获取我的持有份额
router.get('/holdings', authenticate, async (req, res) => {
  try {
    const userId = req.user?.address || req.user?.username || req.user?.id;
    const holdings = await getUserHoldings(userId);
    const totalValue = await calculateUserTotalValue(userId);
    
    res.json({
      success: true,
      count: holdings.length,
      holdings,
      totalValue
    });
  } catch (error) {
    console.error('Error getting holdings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get holdings',
      message: error.message
    });
  }
});

// GET /api/rwa-trade/holdings/:assetId - 获取特定资产的持有份额
router.get('/holdings/:assetId', authenticate, async (req, res) => {
  try {
    const { assetId } = req.params;
    const userId = req.user?.address || req.user?.username || req.user?.id;
    
    const shares = await getUserAssetShares(userId, assetId);
    
    res.json({
      success: true,
      assetId,
      shares
    });
  } catch (error) {
    console.error('Error getting asset holdings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get asset holdings',
      message: error.message
    });
  }
});

// GET /api/rwa-trade/asset/:assetId/holders - 获取资产的所有持有者
router.get('/asset/:assetId/holders', async (req, res) => {
  try {
    const { assetId } = req.params;
    const holders = await getAssetHolders(assetId);
    
    res.json({
      success: true,
      count: holders.length,
      holders
    });
  } catch (error) {
    console.error('Error getting asset holders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get asset holders',
      message: error.message
    });
  }
});

export default router;

