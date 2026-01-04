import express from 'express';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/4a4faaed-19c7-42a1-9aa5-d33580d7c144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/auction.js:2',message:'准备导入rocksdb和solanaBlockchain',data:{importPath:'../utils/rocksdb.js'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
// #endregion
import { get, put, NAMESPACES } from '../utils/rocksdb.js';
import { getTaiOneTokenBalance } from '../utils/solanaBlockchain.js';

const router = express.Router();

/**
 * 获取拍卖信息
 * GET /api/auction/:assetId
 */
router.get('/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    
    // 从 RocksDB 读取拍卖信息
    const auctionData = await get(NAMESPACES.AUCTIONS, assetId.toString());
    
    if (!auctionData) {
      return res.status(404).json({
        success: false,
        error: 'Auction not found',
        message: `Auction with assetId ${assetId} not found`
      });
    }
    
    res.json({ success: true, data: auctionData });
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
 * 注意：treasuryAddress 可选，默认使用 TaiOneToken 铸造地址
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

    // 从 RocksDB 读取当前拍卖信息
    const auctionData = await get(NAMESPACES.AUCTIONS, assetId.toString());
    
    if (!auctionData) {
      return res.status(404).json({
        success: false,
        error: 'Auction not found'
      });
    }

    // 计算最低出价（当前价格 + 10%）
    const currentPrice = BigInt(auctionData.price);
    const minRequired = currentPrice * BigInt(110) / BigInt(100);
    
    // 更新拍卖信息
    const newPrice = minRequired.toString();
    const oldOwner = auctionData.owner;
    const now = new Date().toISOString();
    
    const updatedAuction = {
      ...auctionData,
      owner: userAddress,
      price: newPrice,
      minRequired: minRequired.toString(),
      tauntMessage: bidMessage,
      lastSeizedAt: now,
      // 计算分账：5% 给财库，95% 给上一任房主
      fee: (minRequired * BigInt(5) / BigInt(100)).toString(),
      payout: (minRequired * BigInt(95) / BigInt(100)).toString(),
      previousOwner: oldOwner
    };
    
    // 保存到 RocksDB
    await put(NAMESPACES.AUCTIONS, assetId.toString(), updatedAuction);
    
    // 生成模拟交易哈希（实际项目中应该返回真实的 Solana 交易哈希）
    const txHash = `seize_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.json({ 
      success: true, 
      data: {
        txHash,
        newPrice: newPrice,
        newOwner: userAddress,
        previousOwner: oldOwner
      }
    });
  } catch (error) {
    console.error('夺取资产失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '夺取资产失败' 
    });
  }
});

/**
 * 获取用户 TaiOneToken 余额
 * GET /api/auction/balance/:userAddress
 */
router.get('/balance/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    
    // 调用真实的链上余额查询
    const balanceData = await getTaiOneTokenBalance(userAddress);
    
    res.json({ success: true, data: balanceData });
  } catch (error) {
    console.error('获取余额失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '获取余额失败' 
    });
  }
});

export default router;

