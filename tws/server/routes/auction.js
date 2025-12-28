import express from 'express';
import {
  getAuctionState,
  updateAuctionState,
  addBid,
  getBidHistory,
  getAllBidHistory
} from '../utils/auctionStorage.js';
import { homepageRateLimiter } from '../middleware/security.js';

const router = express.Router();

// 为所有拍卖路由应用速率限制器
router.use(homepageRateLimiter);

// GET /api/auction/state - 获取当前拍卖状态
router.get('/state', (req, res) => {
  try {
    const state = getAuctionState();
    res.json({
      success: true,
      data: state
    });
  } catch (error) {
    console.error('Error getting auction state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get auction state',
      message: error.message
    });
  }
});

// POST /api/auction/bid - 添加出价记录（在链上交易成功后调用）
router.post('/bid', (req, res) => {
  try {
    const { bidder, amount, taunt, transactionSignature } = req.body;
    
    if (!bidder || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Bidder and amount are required'
      });
    }
    
    const bid = addBid({
      bidder,
      amount: Number(amount),
      taunt: taunt || '',
      transactionSignature: transactionSignature || null
    });
    
    if (bid) {
      res.json({
        success: true,
        data: bid
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to add bid'
      });
    }
  } catch (error) {
    console.error('Error adding bid:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add bid',
      message: error.message
    });
  }
});

// GET /api/auction/history - 获取出价历史
router.get('/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = getBidHistory(limit);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error getting bid history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bid history',
      message: error.message
    });
  }
});

// PUT /api/auction/state - 更新拍卖状态（用于管理员操作等）
router.put('/state', (req, res) => {
  try {
    const updates = req.body;
    const updatedState = updateAuctionState(updates);
    
    if (updatedState) {
      res.json({
        success: true,
        data: updatedState
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update auction state'
      });
    }
  } catch (error) {
    console.error('Error updating auction state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update auction state',
      message: error.message
    });
  }
});

export default router;

