import express from 'express';
import { getAuctionInfo, seizeAsset, getTWSCoinBalance } from '../utils/solanaBlockchain.js';

const router = express.Router();

/**
 * 获取拍卖信息
 * GET /api/auction/:assetId
 */
router.get('/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    const info = await getAuctionInfo(parseInt(assetId));
    res.json({ success: true, data: info });
  } catch (error) {
    console.error('获取拍卖信息失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '获取拍卖信息失败' 
    });
  }
});

/**
 * 夺取资产（10%溢价机制）
 * POST /api/auction/:assetId/seize
 * Body: { bidMessage, userAddress, treasuryAddress? }
 * 注意：treasuryAddress 可选，默认使用 TWSCoin 铸造地址
 */
router.post('/:assetId/seize', async (req, res) => {
  try {
    const { assetId } = req.params;
    const { bidMessage, userAddress, treasuryAddress } = req.body;

    if (!bidMessage || !userAddress) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: bidMessage, userAddress'
      });
    }

    // 验证留言长度
    if (bidMessage.length > 100) {
      return res.status(400).json({
        success: false,
        error: '留言过长，最大长度为100字符'
      });
    }

    // treasuryAddress 可选，如果不提供则使用 TWSCoin 铸造地址
    const result = await seizeAsset(
      parseInt(assetId),
      bidMessage,
      userAddress,
      treasuryAddress || null // 传递 null 让后端使用默认值
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('夺取资产失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '夺取资产失败' 
    });
  }
});

/**
 * 获取用户 TWSCoin 余额
 * GET /api/auction/balance/:userAddress
 */
router.get('/balance/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    const balance = await getTWSCoinBalance(userAddress);
    res.json({ success: true, data: balance });
  } catch (error) {
    console.error('获取余额失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '获取余额失败' 
    });
  }
});

export default router;

