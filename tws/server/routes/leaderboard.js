// ============================================
// 文件: server/routes/leaderboard.js
// 排行榜API路由
// ============================================

import express from 'express';
import {
  getBalanceLeaderboard,
  getTransactionLeaderboard,
  getJackpotWinLeaderboard,
  getAssetValueLeaderboard,
  getTaxPaidLeaderboard,
  getConsumptionLeaderboard,
  getReferralEarningsLeaderboard,
  getHoldingTimeLeaderboard,
  getUserRanking,
  getJackpotHistory,
  LEADERBOARD_TYPES,
  LEADERBOARD_PERIODS,
} from '../utils/leaderboard.js';

const router = express.Router();

/**
 * 获取持币数排行榜
 * GET /api/leaderboard/balance
 * Query: limit (可选，默认100), period (可选，默认all)
 */
router.get('/balance', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100');
    const period = req.query.period || LEADERBOARD_PERIODS.ALL;
    const leaderboard = await getBalanceLeaderboard(limit, period);
    
    res.json({
      success: true,
      type: LEADERBOARD_TYPES.BALANCE,
      period,
      limit,
      data: leaderboard,
    });
  } catch (error) {
    console.error('Error getting balance leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get balance leaderboard',
      message: error.message,
    });
  }
});

/**
 * 获取交易数排行榜
 * GET /api/leaderboard/transactions
 * Query: limit (可选，默认100), period (可选，默认all)
 */
router.get('/transactions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100');
    const period = req.query.period || LEADERBOARD_PERIODS.ALL;
    const leaderboard = await getTransactionLeaderboard(limit, period);
    
    res.json({
      success: true,
      type: LEADERBOARD_TYPES.TRANSACTIONS,
      period,
      limit,
      data: leaderboard,
    });
  } catch (error) {
    console.error('Error getting transaction leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction leaderboard',
      message: error.message,
    });
  }
});

/**
 * 获取获奖数排行榜
 * GET /api/leaderboard/jackpot-wins
 * Query: limit (可选，默认100), period (可选，默认all)
 */
router.get('/jackpot-wins', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100');
    const period = req.query.period || LEADERBOARD_PERIODS.ALL;
    const leaderboard = await getJackpotWinLeaderboard(limit, period);
    
    res.json({
      success: true,
      type: LEADERBOARD_TYPES.JACKPOT_WINS,
      period,
      limit,
      data: leaderboard,
    });
  } catch (error) {
    console.error('Error getting jackpot wins leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get jackpot wins leaderboard',
      message: error.message,
    });
  }
});

/**
 * 获取资产持有量排行榜
 * GET /api/leaderboard/asset-value
 * Query: limit (可选，默认100), period (可选，默认all)
 */
router.get('/asset-value', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100');
    const period = req.query.period || LEADERBOARD_PERIODS.ALL;
    const leaderboard = await getAssetValueLeaderboard(limit, period);
    
    res.json({
      success: true,
      type: LEADERBOARD_TYPES.ASSET_VALUE,
      period,
      limit,
      data: leaderboard,
    });
  } catch (error) {
    console.error('Error getting asset value leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get asset value leaderboard',
      message: error.message,
    });
  }
});

/**
 * 获取累计缴税排行榜
 * GET /api/leaderboard/tax-paid
 * Query: limit (可选，默认100), period (可选，默认all)
 */
router.get('/tax-paid', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100');
    const period = req.query.period || LEADERBOARD_PERIODS.ALL;
    const leaderboard = await getTaxPaidLeaderboard(limit, period);
    
    res.json({
      success: true,
      type: LEADERBOARD_TYPES.TAX_PAID,
      period,
      limit,
      data: leaderboard,
    });
  } catch (error) {
    console.error('Error getting tax paid leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tax paid leaderboard',
      message: error.message,
    });
  }
});

/**
 * 获取累计消费排行榜
 * GET /api/leaderboard/consumption
 * Query: limit (可选，默认100), period (可选，默认all)
 */
router.get('/consumption', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100');
    const period = req.query.period || LEADERBOARD_PERIODS.ALL;
    const leaderboard = await getConsumptionLeaderboard(limit, period);
    
    res.json({
      success: true,
      type: LEADERBOARD_TYPES.CONSUMPTION,
      period,
      limit,
      data: leaderboard,
    });
  } catch (error) {
    console.error('Error getting consumption leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get consumption leaderboard',
      message: error.message,
    });
  }
});

/**
 * 获取推荐收益排行榜
 * GET /api/leaderboard/referral-earnings
 * Query: limit (可选，默认100), period (可选，默认all)
 */
router.get('/referral-earnings', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100');
    const period = req.query.period || LEADERBOARD_PERIODS.ALL;
    const leaderboard = await getReferralEarningsLeaderboard(limit, period);
    
    res.json({
      success: true,
      type: LEADERBOARD_TYPES.REFERRAL_EARNINGS,
      period,
      limit,
      data: leaderboard,
    });
  } catch (error) {
    console.error('Error getting referral earnings leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get referral earnings leaderboard',
      message: error.message,
    });
  }
});

/**
 * 获取持币时间排行榜
 * GET /api/leaderboard/holding-time
 * Query: limit (可选，默认100), period (可选，默认all，日/周/月排行不适用)
 */
router.get('/holding-time', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100');
    const period = req.query.period || LEADERBOARD_PERIODS.ALL;
    const leaderboard = await getHoldingTimeLeaderboard(limit, period);
    
    res.json({
      success: true,
      type: LEADERBOARD_TYPES.HOLDING_TIME,
      period,
      limit,
      data: leaderboard,
      note: period !== LEADERBOARD_PERIODS.ALL ? '持币时间排行榜不支持日/周/月排行' : null,
    });
  } catch (error) {
    console.error('Error getting holding time leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get holding time leaderboard',
      message: error.message,
    });
  }
});

/**
 * 获取指定用户的排名信息
 * GET /api/leaderboard/user/:address
 * Query: type (可选，默认balance), period (可选，默认all)
 */
router.get('/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const type = req.query.type || LEADERBOARD_TYPES.BALANCE;
    const period = req.query.period || LEADERBOARD_PERIODS.ALL;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address is required',
      });
    }
    
    const ranking = await getUserRanking(address, type, period);
    
    if (!ranking) {
      return res.json({
        success: true,
        found: false,
        message: 'User not found in leaderboard',
      });
    }
    
    res.json({
      success: true,
      found: true,
      type,
      period,
      data: ranking,
    });
  } catch (error) {
    console.error('Error getting user ranking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user ranking',
      message: error.message,
    });
  }
});

/**
 * 获取奖池历史数据（用于K线图）
 * GET /api/leaderboard/jackpot-history
 * Query: limit (可选，默认100)
 */
router.get('/jackpot-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100');
    const history = await getJackpotHistory(limit);
    
    res.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error) {
    console.error('Error getting jackpot history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get jackpot history',
      message: error.message,
    });
  }
});

export default router;
