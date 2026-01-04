import express from 'express';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/4a4faaed-19c7-42a1-9aa5-d33580d7c144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/auction.js:2',message:'准备导入rocksdb和solanaBlockchain',data:{importPath:'../utils/rocksdb.js'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
// #endregion
import { get, put, getAll, getAllKeys, NAMESPACES } from '../utils/rocksdb.js';
import { getTaiOneTokenBalance } from '../utils/solanaBlockchain.js';
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
    const CREATE_FEE_RAW = BigInt(CREATE_FEE * Math.pow(10, config.TAI_ONE_TOKEN.DECIMALS)).toString();
    
    // 检查用户余额（200 TOT 创建费 + 起拍价）
    const balanceData = await getTaiOneTokenBalance(creatorAddress);
    const userBalance = BigInt(balanceData.balance || '0');
    const startPriceRaw = BigInt(Math.floor(startPriceNum * Math.pow(10, config.TAI_ONE_TOKEN.DECIMALS)).toString());
    const requiredBalance = BigInt(CREATE_FEE_RAW) + startPriceRaw;

    if (userBalance < requiredBalance) {
      return res.status(400).json({
        success: false,
        error: `余额不足，需要 ${CREATE_FEE + startPriceNum} TOT（创建费 ${CREATE_FEE} TOT + 起拍价 ${startPriceNum} TOT）`
      });
    }

    // 如果有交易签名，验证交易（可选，用于链上扣除）
    // 这里先跳过验证，直接创建拍卖（实际项目中应该验证交易）

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

    // 创建拍卖数据
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
      createFee: CREATE_FEE_RAW,
      createTxHash: txSignature || `create_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // 保存到 RocksDB
    await put(NAMESPACES.AUCTIONS, newAssetId.toString(), auctionData);

    res.json({ 
      success: true, 
      data: {
        assetId: newAssetId,
        txHash: auctionData.createTxHash,
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

export default router;

