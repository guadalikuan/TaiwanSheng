import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  recordReferral,
  getReferralInfo,
  getReferrals,
  recordCommission,
  generateInviteLink,
  getReferralLeaderboard,
  processPendingCommissions,
  getPendingCommissionsStats
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
    
    // recordCommission现在是异步函数，需要await
    const result = await recordCommission(userId, amount, commissionRate, {
      immediateTransfer: req.body.immediateTransfer !== false // 默认立即转账
    });
    
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
      commission: result,
      transferSuccess: result.transferResult?.success !== false
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

// POST /api/referral/process-pending - 批量处理待处理佣金（管理员或定时任务）
router.post('/process-pending', authenticate, async (req, res) => {
  try {
    const { force } = req.body;
    
    // 检查是否有管理员权限（可选）
    // if (req.user.role !== 'ADMIN') {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'Unauthorized'
    //   });
    // }
    
    const result = await processPendingCommissions({ force: force === true });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error processing pending commissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process pending commissions',
      message: error.message
    });
  }
});

// GET /api/referral/pending-stats - 获取待处理佣金统计
router.get('/pending-stats', authenticate, (req, res) => {
  try {
    const stats = getPendingCommissionsStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting pending stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending stats',
      message: error.message
    });
  }
});

export default router;


