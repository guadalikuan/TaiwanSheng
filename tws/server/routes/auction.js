import express from 'express';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/4a4faaed-19c7-42a1-9aa5-d33580d7c144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/auction.js:2',message:'准备导入rocksdb和solanaBlockchain',data:{importPath:'../utils/rocksdb.js'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
// #endregion
import { get, put, getAll, getAllKeys, NAMESPACES } from '../utils/rocksdb.js';
import { getTaiOneTokenBalance, consumeToTreasury, createAuctionOnChain, seizeAuctionOnChain } from '../utils/solanaBlockchain.js';
import config from '../solana.config.js';

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
 * Body: { bidMessage, userAddress }
 * 使用tot合约的seize_auction指令
 */
router.post('/:assetId/seize', async (req, res) => {
  try {
    const { assetId } = req.params;
    const { bidMessage, userAddress } = req.body;

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

    // 调用tot合约的seize_auction指令
    let seizeResult = null;
    try {
      seizeResult = await seizeAuctionOnChain(assetId, bidMessage, userAddress);
    } catch (error) {
      console.error('夺取资产失败:', error);
      return res.status(400).json({
        success: false,
        error: '夺取资产失败: ' + error.message
      });
    }

    // 更新链下拍卖信息
    const oldOwner = auctionData.owner;
    const now = new Date().toISOString();
    
    const updatedAuction = {
      ...auctionData,
      owner: userAddress,
      price: seizeResult.minRequired,
      minRequired: (BigInt(seizeResult.minRequired) * BigInt(110) / BigInt(100)).toString(),
      tauntMessage: bidMessage,
      lastSeizedAt: now,
      previousOwner: oldOwner,
      seizeTxHash: `pending_${Date.now()}`, // 临时哈希，实际由用户签名后获得
    };
    
    // 保存到 RocksDB
    await put(NAMESPACES.AUCTIONS, assetId.toString(), updatedAuction);
    
    res.json({ 
      success: true, 
      data: {
        transaction: seizeResult.transaction, // 交易（需要用户签名）
        newPrice: seizeResult.minRequired,
        newOwner: userAddress,
        previousOwner: oldOwner,
        currentPrice: seizeResult.currentPrice,
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

/**
 * 创建新拍卖
 * POST /api/auction/create
 * Body: { assetName, description, startPrice, imageUrl, location, originalOwner, tauntMessage, creatorAddress, txSignature? }
 */
router.post('/create', async (req, res) => {
  try {
    const { 
      assetName, 
      description, 
      startPrice, 
      imageUrl, 
      location, 
      originalOwner, 
      tauntMessage, 
      creatorAddress,
      txSignature 
    } = req.body;

    // 验证必要参数
    if (!assetName || !startPrice || !creatorAddress) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: assetName, startPrice, creatorAddress'
      });
    }

    // 验证起拍价
    const startPriceNum = parseFloat(startPrice);
    if (isNaN(startPriceNum) || startPriceNum <= 0) {
      return res.status(400).json({
        success: false,
        error: '起拍价必须大于0'
      });
    }

    // 创建费用：200 TOT
    const CREATE_FEE = 200;
    
    // 检查用户余额（200 TOT 创建费）
    const balanceData = await getTaiOneTokenBalance(creatorAddress);
    const userBalance = BigInt(balanceData.balance || '0');
    const createFeeRaw = BigInt(CREATE_FEE * Math.pow(10, config.TAI_ONE_TOKEN.DECIMALS));
    const startPriceRaw = BigInt(Math.floor(startPriceNum * Math.pow(10, config.TAI_ONE_TOKEN.DECIMALS)));

    if (userBalance < createFeeRaw) {
      return res.status(400).json({
        success: false,
        error: `余额不足，需要 ${CREATE_FEE} TOT 创建费`
      });
    }

    // 生成新的 assetId
    const allKeys = await getAllKeys(NAMESPACES.AUCTIONS);
    let newAssetId = 1;
    if (allKeys.length > 0) {
      const numericKeys = allKeys
        .map(k => parseInt(k))
        .filter(k => !isNaN(k));
      if (numericKeys.length > 0) {
        newAssetId = Math.max(...numericKeys) + 1;
      }
    }

    // 转换为最小单位
    const startPriceRawStr = startPriceRaw.toString();
    const minRequired = (startPriceRaw * BigInt(110) / BigInt(100)).toString();

    // 创建拍卖数据（用于链下存储）
    const now = new Date().toISOString();
    const auctionData = {
      assetId: newAssetId,
      owner: creatorAddress, // 创建者初始拥有
      price: startPriceRawStr,
      minRequired: minRequired,
      tauntMessage: tauntMessage || '此资产已被TaiOne接管',
      assetName: assetName,
      description: description || '',
      originalOwner: originalOwner || '未知',
      location: location || '',
      imageUrl: imageUrl || '',
      createdAt: now,
      lastSeizedAt: now,
      twscoinMint: config.TAI_ONE_TOKEN.MINT,
      treasury: 'TaiOneTreasury111111111111111111111111111111', // TaiOne 财库地址
      startPrice: startPriceRawStr,
      status: 'active', // 默认创建后为进行中
      creator: creatorAddress,
      createFee: createFeeRaw.toString(),
    };

    // 1. 先支付200 TOT创建费（使用tot合约的consume_to_treasury，类型AuctionCreate=3）
    let createFeeTx = null;
    try {
      const createFeeResult = await consumeToTreasury(creatorAddress, CREATE_FEE, 3); // ConsumeType::AuctionCreate
      createFeeTx = createFeeResult.transaction;
      auctionData.createTxHash = `pending_${Date.now()}`; // 临时哈希，实际由用户签名后获得
    } catch (error) {
      console.error('支付创建费失败:', error);
      return res.status(400).json({
        success: false,
        error: '支付创建费失败: ' + error.message
      });
    }

    // 2. 上链拍卖信息（使用tot合约的create_auction）
    let onChainResult = null;
    try {
      onChainResult = await createAuctionOnChain({
        assetId: newAssetId,
        startPrice: startPriceRawStr,
        tauntMessage: tauntMessage || '此资产已被TaiOne接管',
      }, creatorAddress);
      auctionData.createTxHash = onChainResult.txHash;
      auctionData.auctionAccount = onChainResult.auctionAccount;
    } catch (error) {
      console.error('拍卖上链失败:', error);
      // 上链失败不影响链下记录，但需要记录错误
      auctionData.onChainError = error.message;
    }

    // 保存到 RocksDB
    await put(NAMESPACES.AUCTIONS, newAssetId.toString(), auctionData);

    res.json({ 
      success: true, 
      data: {
        assetId: newAssetId,
        createFeeTransaction: createFeeTx, // 创建费交易（需要用户签名）
        onChainResult: onChainResult, // 上链结果
        auction: auctionData
      }
    });
  } catch (error) {
    console.error('创建拍卖失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '创建拍卖失败' 
    });
  }
});

/**
 * 获取拍卖列表
 * GET /api/auction/list?status=active|pending|completed
 */
router.get('/list', async (req, res) => {
  try {
    const { status } = req.query;
    
    // 获取所有拍卖
    const allAuctions = await getAll(NAMESPACES.AUCTIONS);
    
    // 转换为数组格式
    let auctions = allAuctions.map(item => item.value);
    
    // 按状态筛选
    if (status && ['active', 'pending', 'completed'].includes(status)) {
      auctions = auctions.filter(auction => auction.status === status);
    }
    
    // 按创建时间倒序排列
    auctions.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    
    res.json({ 
      success: true, 
      data: auctions 
    });
  } catch (error) {
    console.error('获取拍卖列表失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '获取拍卖列表失败' 
    });
  }
});

// POST /api/auction/verify-create - 验证拍卖创建交易
router.post('/verify-create', authenticate, async (req, res) => {
  try {
    const { txSignature, assetId } = req.body;
    const creatorAddress = req.user?.address || req.body.creatorAddress;

    if (!creatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Creator address is required'
      });
    }

    if (!txSignature) {
      return res.status(400).json({
        success: false,
        error: 'Transaction signature is required'
      });
    }

    // 验证交易
    const { verifyStrategicAssetPurchase } = await import('../utils/solanaBlockchain.js');
    try {
      const verificationResult = await verifyStrategicAssetPurchase(
        txSignature,
        creatorAddress,
        CREATE_FEE
      );

      if (!verificationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Transaction verification failed',
          message: '交易验证失败'
        });
      }

      // 如果提供了assetId，可以更新拍卖状态
      if (assetId) {
        // 这里可以更新拍卖的创建交易哈希
        // 具体实现取决于你的数据存储方式
      }

      res.json({
        success: true,
        message: 'Auction creation transaction verified successfully',
        blockchain: {
          txHash: txSignature,
          confirmed: verificationResult.confirmed,
          blockTime: verificationResult.blockTime
        }
      });
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return res.status(400).json({
        success: false,
        error: 'Transaction verification error',
        message: error.message
      });
    }
  } catch (error) {
    console.error('Error verifying auction creation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify auction creation',
      message: error.message
    });
  }
});

// POST /api/auction/verify-seize - 验证拍卖夺取交易
router.post('/verify-seize', authenticate, async (req, res) => {
  try {
    const { txSignature, assetId } = req.body;
    const userAddress = req.user?.address;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'User address is required'
      });
    }

    if (!txSignature || !assetId) {
      return res.status(400).json({
        success: false,
        error: 'Transaction signature and assetId are required'
      });
    }

    // 验证交易
    const { verifyStrategicAssetPurchase } = await import('../utils/solanaBlockchain.js');
    try {
      // 获取拍卖信息以确定金额
      const auction = await get(NAMESPACES.AUCTIONS, assetId);
      if (!auction) {
        return res.status(404).json({
          success: false,
          error: 'Auction not found'
        });
      }

      const minRequired = BigInt(auction.price) * BigInt(110) / BigInt(100);
      const verificationResult = await verifyStrategicAssetPurchase(
        txSignature,
        userAddress,
        Number(minRequired)
      );

      if (!verificationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Transaction verification failed',
          message: '交易验证失败'
        });
      }

      res.json({
        success: true,
        message: 'Auction seize transaction verified successfully',
        blockchain: {
          txHash: txSignature,
          confirmed: verificationResult.confirmed,
          blockTime: verificationResult.blockTime
        }
      });
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return res.status(400).json({
        success: false,
        error: 'Transaction verification error',
        message: error.message
      });
    }
  } catch (error) {
    console.error('Error verifying auction seize:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify auction seize',
      message: error.message
    });
  }
});

export default router;

