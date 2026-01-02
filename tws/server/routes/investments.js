import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getUserInvestments } from '../utils/investmentManager.js';

const router = express.Router();

// GET /api/investments/my - 获取我的投资记录
router.get('/my', authenticate, async (req, res) => {
  try {
    const { walletAddress } = req.query;
    const userAddress = walletAddress || req.user?.address;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    const investments = await getUserInvestments(userAddress);

    res.json({
      success: true,
      investments
    });
  } catch (error) {
    console.error('Error getting user investments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get investments',
      message: error.message
    });
  }
});

export default router;

