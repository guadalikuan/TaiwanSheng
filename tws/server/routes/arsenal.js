import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { wrapAsset } from '../utils/assetWrapperFactory.js';
import { 
  saveRawAsset, 
  saveSanitizedAsset,
  getPendingAssets,
  getApprovedAssets,
  updateAssetStatus,
  getAssetsByStatus,
  getAllAssets,
  getSanitizedAssets
} from '../utils/storage.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ROLES } from '../utils/roles.js';
import { generateContractByAssetId } from '../utils/contractGenerator.js';
import { getAssetById, updateRawAsset, getAssetReviewHistory } from '../utils/storage.js';
import { readFileSync } from 'fs';
import blockchainService from '../utils/blockchain.js';
import { addAssetLog, readHomepageData, writeHomepageData } from '../utils/homepageStorage.js';
import { generateAssetLog } from '../utils/nodeNameGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 配置 multer 存储
const uploadsDir = join(__dirname, '../uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop();
    cb(null, `asset-${uniqueSuffix}.${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG、PNG 和 PDF 文件'));
    }
  }
});

const router = express.Router();

// POST /api/arsenal/submit - 提交资产数据（需要认证和SUBMITTER或ADMIN角色）
router.post('/submit', authenticate, requireRole(ROLES.SUBMITTER, ROLES.ADMIN), async (req, res) => {
  try {
    const {
      ownerName,
      phone,
      projectName,
      city,
      area,
      debtPrice,
      district = '',
      address = '',
      roomNumber = '',
      marketValuation = 0,
      proofDocs = []
    } = req.body;

    // 验证必填字段
    if (!ownerName || !phone || !projectName || !city || !area || !debtPrice) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['ownerName', 'phone', 'projectName', 'city', 'area', 'debtPrice']
      });
    }

    // 创建原始资产数据
    const rawAsset = {
      id: `raw_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      ownerName,
      ownerId: '', // 身份证后四位，可选
      contactPhone: phone,
      projectName,
      city,
      district,
      address,
      roomNumber,
      area: Number(area),
      marketValuation: Number(marketValuation) || Number(debtPrice) * 1.5,
      debtAmount: Number(debtPrice),
      proofDocs,
      timestamp: Date.now(),
      submittedBy: req.user?.address || req.user?.username || req.user?.id || 'unknown' // 保存提交者信息
    };

    // 保存原始资产
    const savedRawAsset = await saveRawAsset(rawAsset);

    // 脱敏包装
    const sanitizedAsset = wrapAsset(savedRawAsset);
    sanitizedAsset.id = savedRawAsset.id; // 保持ID关联

    // 保存脱敏资产
    const savedSanitizedAsset = await saveSanitizedAsset(sanitizedAsset);

    res.json({
      success: true,
      message: 'Asset submitted successfully',
      rawAsset: {
        id: savedRawAsset.id,
        // 不返回敏感信息
      },
      sanitizedAsset: savedSanitizedAsset
    });

  } catch (error) {
    console.error('Error submitting asset:', error);
    res.status(500).json({ 
      error: 'Failed to submit asset',
      message: error.message 
    });
  }
});

// GET /api/arsenal/preview - 实时预览脱敏结果
router.get('/preview', (req, res) => {
  try {
    const { city, area } = req.query;
    
    if (!city) {
      return res.status(400).json({ error: 'City is required' });
    }

    // 创建临时数据用于预览
    const tempRaw = {
      id: 'preview',
      city,
      area: Number(area) || 0,
      debtAmount: 0,
      projectName: ''
    };

    const preview = wrapAsset(tempRaw);

    res.json({
      success: true,
      preview
    });

  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ 
      error: 'Failed to generate preview',
      message: error.message 
    });
  }
});

// GET /api/arsenal/pending - 获取所有待审核资产（需要审核员或管理员权限）
router.get('/pending', authenticate, requireRole(ROLES.REVIEWER, ROLES.ADMIN), async (req, res) => {
  try {
    const pendingAssets = await getPendingAssets();
    res.json({
      success: true,
      count: pendingAssets.length,
      assets: pendingAssets
    });
  } catch (error) {
    console.error('Error getting pending assets:', error);
    res.status(500).json({ 
      error: 'Failed to get pending assets',
      message: error.message 
    });
  }
});

// GET /api/arsenal/assets - 获取所有已审核通过的资产（用于前端展示）
router.get('/assets', async (req, res) => {
  try {
    const approvedAssets = await getApprovedAssets();
    res.json({
      success: true,
      count: approvedAssets.length,
      assets: approvedAssets
    });
  } catch (error) {
    console.error('Error getting approved assets:', error);
    res.status(500).json({ 
      error: 'Failed to get approved assets',
      message: error.message 
    });
  }
});

// GET /api/arsenal/assets/:id - 根据ID获取单个资产（公开端点，用于资产详情页）
router.get('/assets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const assetData = await getAssetById(id);
    
    if (!assetData.raw || !assetData.sanitized) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found',
        message: `Asset with id ${id} not found`
      });
    }
    
    // 格式化资产数据，匹配前端需要的格式
    const sanitized = assetData.sanitized;
    const raw = assetData.raw;
    
    // 尝试从原始数据中获取城市信息
    let city = 'UNKNOWN';
    if (raw && raw.city) {
      city = raw.city;
    } else if (sanitized.internalRef) {
      const allAssets = await getAllAssets();
      const rawAsset = allAssets.raw.find(r => r.id === sanitized.internalRef);
      if (rawAsset && rawAsset.city) {
        city = rawAsset.city;
      }
    }
    
    // 如果还是没有城市，尝试从locationTag中提取
    if (city === 'UNKNOWN' && sanitized.locationTag) {
      const locationMap = {
        'CN-NW-CAPITAL': '西安',
        'CN-NW-SUB': '咸阳',
        'CN-IND-HUB': '宝鸡',
        'CN-QINLING-MTN': '商洛',
        'CN-INT-RES': '汉中'
      };
      city = locationMap[sanitized.locationTag] || sanitized.locationTag;
    }
    
    // 从yield字符串中提取百分比数字
    let yieldPercent = 10;
    if (sanitized.financials && sanitized.financials.yield) {
      const yieldMatch = sanitized.financials.yield.match(/(\d+\.?\d*)%/);
      if (yieldMatch) {
        yieldPercent = parseFloat(yieldMatch[1]);
      }
    }
    
    // 计算价格（使用tokenPrice或totalTokens或debtAmount）
    const price = sanitized.tokenPrice || 
                  (sanitized.financials && sanitized.financials.totalTokens) || 
                  sanitized.debtAmount || 
                  (raw && raw.debtAmount) || 
                  0;
    
    // 从securityLevel转换为risk等级
    const riskMap = {
      5: 'LOW',
      4: 'LOW',
      3: 'MED',
      2: 'HIGH',
      1: 'HIGH'
    };
    const risk = riskMap[sanitized.securityLevel] || 'MED';
    
    const formattedAsset = {
      id: sanitized.id,
      city: city,
      title: sanitized.codeName || sanitized.title || 'Unknown Asset',
      type: sanitized.zoneClass || sanitized.specs?.type || 'Residential',
      price: `${price.toLocaleString()} USDT`,
      yield: `${yieldPercent.toFixed(0)}%`,
      status: sanitized.status === 'AVAILABLE' ? 'AVAILABLE' : (sanitized.status === 'MINTING' ? 'MINTING' : 'RESERVED'),
      risk: risk
    };
    
    res.json({
      success: true,
      data: formattedAsset
    });
  } catch (error) {
    console.error('Error getting asset by id:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get asset',
      message: error.message
    });
  }
});

// PUT /api/arsenal/approve/:id - 批准资产（需要审核员或管理员权限）
router.put('/approve/:id', authenticate, requireRole(ROLES.REVIEWER, ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const { autoMint = true, mintToAddress } = req.body;
    
    // 获取资产数据
    const assetData = await getAssetById(id);
    
    // 更新资产状态
    const updatedAsset = await updateAssetStatus(id, 'AVAILABLE', {
      reviewedBy: req.user?.username || req.body.reviewedBy || 'system',
      reviewNotes: req.body.reviewNotes || ''
    });
    
    // 自动添加到资产池（地图日志）
    let assetLogResult = null;
    try {
      const assetLog = generateAssetLog(assetData, id);
      assetLogResult = await addAssetLog(assetLog);
      console.log(`✅ 资产已添加到资产池: ${assetData.sanitized?.codeName || id}`);
    } catch (logError) {
      console.error('⚠️ 添加资产到资产池失败（但审核已通过）:', logError);
      // 资产池添加失败不影响审核通过
    }
    
    // 如果启用自动上链，则触发区块链铸造
    let mintResult = null;
    if (autoMint && process.env.CONTRACT_ADDRESS) {
      try {
        const toAddress = mintToAddress || req.user?.address || process.env.PLATFORM_WALLET;
        if (toAddress) {
          mintResult = await blockchainService.mintAsset(assetData, toAddress);
          console.log('✅ 资产已自动上链:', mintResult);
          
          // 更新资产的上链状态
          if (mintResult && mintResult.success) {
            await updateAssetStatus(id, 'AVAILABLE', {
              nftMinted: true,
              nftTokenId: mintResult.tokenId,
              nftTxHash: mintResult.txHash,
              nftMintedAt: Date.now(),
              nftMintedTo: toAddress,
              nftBlockNumber: mintResult.blockNumber
            });
          }
        }
      } catch (mintError) {
        console.error('⚠️ 资产上链失败（但审核已通过）:', mintError);
        // 上链失败不影响审核通过
      }
    }
    
    res.json({
      success: true,
      message: 'Asset approved successfully',
      asset: updatedAsset,
      assetPool: assetLogResult ? {
        added: true,
        logId: assetLogResult.id
      } : null,
      blockchain: mintResult ? {
        txHash: mintResult.txHash,
        tokenId: mintResult.tokenId,
        blockNumber: mintResult.blockNumber
      } : null
    });
  } catch (error) {
    console.error('Error approving asset:', error);
    res.status(500).json({ 
      error: 'Failed to approve asset',
      message: error.message 
    });
  }
});

// PUT /api/arsenal/reject/:id - 拒绝资产（需要审核员或管理员权限）
router.put('/reject/:id', authenticate, requireRole(ROLES.REVIEWER, ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const updatedAsset = await updateAssetStatus(id, 'REJECTED', {
      reviewedBy: req.user?.username || req.body.reviewedBy || 'system',
      reviewNotes: req.body.reviewNotes || 'Rejected by admin'
    });
    
    res.json({
      success: true,
      message: 'Asset rejected successfully',
      asset: updatedAsset
    });
  } catch (error) {
    console.error('Error rejecting asset:', error);
    res.status(500).json({ 
      error: 'Failed to reject asset',
      message: error.message 
    });
  }
});

// GET /api/arsenal/stats - 获取统计信息（需要审核员或管理员权限）
router.get('/stats', authenticate, requireRole(ROLES.REVIEWER, ROLES.ADMIN), async (req, res) => {
  try {
    const allAssets = await getAllAssets();
    const pending = await getAssetsByStatus('MINTING');
    const approved = await getAssetsByStatus('AVAILABLE');
    const rejected = await getAssetsByStatus('REJECTED');
    const locked = await getAssetsByStatus('LOCKED');
    
    res.json({
      success: true,
      stats: {
        total: allAssets.sanitized.length,
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
        locked: locked.length
      }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ 
      error: 'Failed to get stats',
      message: error.message 
    });
  }
});

// POST /api/arsenal/upload - 文件上传（需要认证和SUBMITTER或ADMIN角色）
router.post('/upload', authenticate, requireRole(ROLES.SUBMITTER, ROLES.ADMIN), upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file uploaded',
        message: '请选择要上传的文件' 
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ 
      error: 'Failed to upload file',
      message: error.message 
    });
  }
});

// POST /api/arsenal/generate-contract/:id - 生成合同PDF（需要审核员或管理员权限）
router.post('/generate-contract/:id', authenticate, requireRole(ROLES.REVIEWER, ROLES.ADMIN, ROLES.SUBMITTER), async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查资产是否存在
    const assetData = getAssetById(id);
    if (!assetData.raw || !assetData.sanitized) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found',
        message: `Asset with id ${id} not found`
      });
    }

    // 生成合同PDF
    const pdfPath = await generateContractByAssetId(id);
    
    // 读取PDF文件并返回
    const pdfBuffer = readFileSync(pdfPath);
    const filename = pdfPath.split('/').pop();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error generating contract:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate contract',
      message: error.message
    });
  }
});

// GET /api/arsenal/contract/:id - 获取合同PDF（预览，需要审核员或管理员权限）
router.get('/contract/:id', authenticate, requireRole(ROLES.REVIEWER, ROLES.ADMIN, ROLES.SUBMITTER), async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查资产是否存在
    const assetData = getAssetById(id);
    if (!assetData.raw || !assetData.sanitized) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found',
        message: `Asset with id ${id} not found`
      });
    }

    // 生成合同PDF（如果不存在）
    const pdfPath = await generateContractByAssetId(id);
    
    // 读取PDF文件并返回
    const pdfBuffer = readFileSync(pdfPath);
    const filename = pdfPath.split('/').pop();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error getting contract:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get contract',
      message: error.message
    });
  }
});

// POST /api/arsenal/batch-approve - 批量批准资产（需要审核员或管理员权限）
router.post('/batch-approve', authenticate, requireRole(ROLES.REVIEWER, ROLES.ADMIN), async (req, res) => {
  try {
    const { ids, reviewNotes } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'ids array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const id of ids) {
      try {
        const updatedAsset = updateAssetStatus(id, 'AVAILABLE', {
          reviewedBy: req.user?.username || 'system',
          reviewNotes: reviewNotes || 'Batch approved'
        });
        results.push({ id, success: true, asset: updatedAsset });
      } catch (error) {
        errors.push({ id, success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Processed ${ids.length} assets`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error batch approving assets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch approve assets',
      message: error.message
    });
  }
});

// PUT /api/arsenal/edit/:id - 编辑资产（审核前可修改，需要提交者或管理员权限）
router.put('/edit/:id', authenticate, requireRole(ROLES.SUBMITTER, ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // 检查资产是否存在且处于可编辑状态
    const assetData = getAssetById(id);
    if (!assetData.raw || !assetData.sanitized) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found',
        message: `Asset with id ${id} not found`
      });
    }

    // 只有MINTING状态的资产可以编辑
    if (assetData.sanitized.status !== 'MINTING') {
      return res.status(400).json({
        success: false,
        error: 'Asset cannot be edited',
        message: 'Only assets with MINTING status can be edited'
      });
    }

    // 更新原始资产数据
    const updatedAsset = updateRawAsset(id, updates);

    // 重新生成脱敏数据
    const sanitizedAsset = wrapAsset(updatedAsset);
    sanitizedAsset.id = id;
    
    // 更新脱敏资产（保持状态不变）
    const { saveSanitizedAsset } = await import('../utils/storage.js');
    const updatedSanitized = {
      ...sanitizedAsset,
      status: assetData.sanitized.status, // 保持原状态
      reviewHistory: assetData.sanitized.reviewHistory || []
    };
    await saveSanitizedAsset(updatedSanitized);

    res.json({
      success: true,
      message: 'Asset updated successfully',
      asset: {
        raw: updatedAsset,
        sanitized: sanitizedAssets[index]
      }
    });
  } catch (error) {
    console.error('Error editing asset:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to edit asset',
      message: error.message
    });
  }
});

// GET /api/arsenal/review-history/:id - 获取审核历史（需要审核员或管理员权限）
router.get('/review-history/:id', authenticate, requireRole(ROLES.REVIEWER, ROLES.ADMIN), (req, res) => {
  try {
    const { id } = req.params;
    const history = getAssetReviewHistory(id);
    
    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Error getting review history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get review history',
      message: error.message
    });
  }
});

// GET /api/arsenal/blockchain-status/:id - 获取资产上链状态
router.get('/blockchain-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const assetData = await getAssetById(id);
    
    if (!assetData.sanitized) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }
    
    const sanitized = assetData.sanitized;
    const blockchainStatus = {
      isMinted: sanitized.nftMinted || false,
      tokenId: sanitized.nftTokenId || null,
      txHash: sanitized.nftTxHash || null,
      blockNumber: sanitized.nftBlockNumber || null,
      mintedAt: sanitized.nftMintedAt || null,
      mintedTo: sanitized.nftMintedTo || null,
      contractAddress: process.env.CONTRACT_ADDRESS || null
    };
    
    res.json({
      success: true,
      assetId: id,
      blockchain: blockchainStatus
    });
  } catch (error) {
    console.error('Error getting blockchain status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get blockchain status',
      message: error.message
    });
  }
});

// PUT /api/arsenal/redeem/:id - 赎回资产（仅开发商，且资产未被购买）
router.put('/redeem/:id', authenticate, requireRole(ROLES.DEVELOPER, ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // 获取资产数据
    const assetData = await getAssetById(id);
    
    if (!assetData.raw || !assetData.sanitized) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }
    
    const { raw, sanitized } = assetData;
    const userAddress = req.user?.address || req.user?.username || req.user?.id;
    
    // 检查资产是否由当前用户提交
    if (raw.submittedBy && raw.submittedBy !== userAddress && req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: '只能赎回自己提交的资产'
      });
    }
    
    // 检查资产是否已被购买
    // 条件：状态不是AVAILABLE，或者有purchasedBy字段，或者有NFT持有者
    const isPurchased = sanitized.status !== 'AVAILABLE' || 
                       sanitized.purchasedBy || 
                       (sanitized.nftMinted && sanitized.nftTokenId);
    
    if (isPurchased) {
      return res.status(400).json({
        success: false,
        error: 'Asset already purchased',
        message: '该资产已被购买，无法赎回'
      });
    }
    
    // 更新资产状态为REDEEMED
    const updatedAsset = await updateAssetStatus(id, 'REDEEMED', {
      reviewedBy: req.user?.username || 'system',
      reviewNotes: reason || `资产被开发商赎回`,
      redeemedBy: userAddress,
      redeemedAt: Date.now()
    });
    
    // 从资产池中移除（如果存在）
    try {
      const homepageData = readHomepageData();
      if (homepageData?.map?.mainland?.logs) {
        homepageData.map.mainland.logs = homepageData.map.mainland.logs.filter(
          log => log.assetId !== id
        );
        // 更新资产池统计
        if (homepageData.map.mainland.assetPoolValue && raw.debtAmount) {
          homepageData.map.mainland.assetPoolValue = Math.max(0, 
            homepageData.map.mainland.assetPoolValue - raw.debtAmount
          );
        }
        if (homepageData.map.mainland.unitCount > 0) {
          homepageData.map.mainland.unitCount -= 1;
        }
        await writeHomepageData(homepageData);
      }
    } catch (logError) {
      console.error('⚠️ 从资产池移除资产失败:', logError);
      // 不影响赎回操作
    }
    
    res.json({
      success: true,
      message: 'Asset redeemed successfully',
      asset: updatedAsset
    });
  } catch (error) {
    console.error('Error redeeming asset:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to redeem asset',
      message: error.message
    });
  }
});

// GET /api/arsenal/redeem-history - 获取赎回历史
router.get('/redeem-history', authenticate, requireRole(ROLES.DEVELOPER, ROLES.ADMIN), async (req, res) => {
  try {
    const userAddress = req.user?.address || req.user?.username || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN';
    
    // 获取所有资产
    const allAssets = await getAllAssets();
    
    // 筛选已赎回的资产
    const redeemedAssets = allAssets.sanitized.filter(asset => {
      if (asset.status !== 'REDEEMED') return false;
      if (isAdmin) return true;
      // 开发商只能看到自己提交的
      const rawAsset = allAssets.raw.find(r => r.id === asset.id);
      return rawAsset?.submittedBy === userAddress;
    });
    
    res.json({
      success: true,
      count: redeemedAssets.length,
      assets: redeemedAssets
    });
  } catch (error) {
    console.error('Error getting redeem history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get redeem history',
      message: error.message
    });
  }
});

export default router;

