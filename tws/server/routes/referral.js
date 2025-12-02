import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  recordReferral,
  getReferralInfo,
  getReferrals,
  recordCommission,
  generateInviteLink,
  getReferralLeaderboard
} from '../utils/referral.js';

const router = express.Router();

// GET /api/referral/info - 获取我的推荐信息（需要认证）
router.get('/info', authenticate, (req, res) => {
  try {
    const userId = req.user.address || req.user.username;
    const info = getReferralInfo(userId);
    
    if (!info) {
      return res.json({
        success: true,
        hasReferral: false,
        message: '您还没有推荐关系'
      });
    }
    
    const referrals = getReferrals(userId);
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'tws_bot';
    const inviteLink = generateInviteLink(userId, botUsername);
    
    res.json({
      success: true,
      hasReferral: true,
      info: {
        ...info,
        inviteLink,
        referralsCount: referrals.length,
        referrals
      }
    });
  } catch (error) {
    console.error('Error getting referral info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get referral info',
      message: error.message
    });
  }
});

// POST /api/referral/register - 注册推荐关系（需要认证）
router.post('/register', authenticate, (req, res) => {
  try {
    const { referrerId } = req.body;
    const userId = req.user.address || req.user.username;
    
    if (!referrerId) {
      return res.status(400).json({
        success: false,
        error: 'Referrer ID is required'
      });
    }
    
    if (referrerId === userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot refer yourself'
      });
    }
    
    const referral = recordReferral(userId, referrerId);
    
    res.json({
      success: true,
      message: 'Referral registered successfully',
      referral
    });
  } catch (error) {
    console.error('Error registering referral:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register referral',
      message: error.message
    });
  }
});

// GET /api/referral/leaderboard - 获取推荐排行榜
router.get('/leaderboard', (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '10');
    const leaderboard = getReferralLeaderboard(limit);
    
    res.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard',
      message: error.message
    });
  }
});

// POST /api/referral/commission - 记录推荐佣金（内部调用）
router.post('/commission', authenticate, (req, res) => {
  try {
    const { userId, amount, commissionRate } = req.body;
    
    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'userId and amount are required'
      });
    }
    
    const result = recordCommission(userId, amount, commissionRate);
    
    if (!result) {
      return res.json({
        success: true,
        message: 'No referral relationship found',
        commission: null
      });
    }
    
    res.json({
      success: true,
      message: 'Commission recorded',
      commission: result
    });
  } catch (error) {
    console.error('Error recording commission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record commission',
      message: error.message
    });
  }
});

export default router;

