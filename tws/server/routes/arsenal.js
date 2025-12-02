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

// POST /api/arsenal/submit - 提交资产数据
router.post('/submit', async (req, res) => {
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
      timestamp: Date.now()
    };

    // 保存原始资产
    const savedRawAsset = saveRawAsset(rawAsset);

    // 脱敏包装
    const sanitizedAsset = wrapAsset(savedRawAsset);
    sanitizedAsset.id = savedRawAsset.id; // 保持ID关联

    // 保存脱敏资产
    const savedSanitizedAsset = saveSanitizedAsset(sanitizedAsset);

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
router.get('/pending', authenticate, requireRole(ROLES.REVIEWER, ROLES.ADMIN), (req, res) => {
  try {
    const pendingAssets = getPendingAssets();
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
router.get('/assets', (req, res) => {
  try {
    const approvedAssets = getApprovedAssets();
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

// PUT /api/arsenal/approve/:id - 批准资产（需要审核员或管理员权限）
router.put('/approve/:id', authenticate, requireRole(ROLES.REVIEWER, ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const { autoMint = true, mintToAddress } = req.body;
    
    // 更新资产状态
    const assetData = getAssetById(id);
    const updatedAsset = updateAssetStatus(id, 'AVAILABLE', {
      reviewedBy: req.user?.username || req.body.reviewedBy || 'system',
      reviewNotes: req.body.reviewNotes || ''
    });
    
    // 如果启用自动上链，则触发区块链铸造
    let mintResult = null;
    if (autoMint && process.env.CONTRACT_ADDRESS) {
      try {
        const toAddress = mintToAddress || req.user?.address || process.env.PLATFORM_WALLET;
        if (toAddress) {
          mintResult = await blockchainService.mintAsset(assetData, toAddress);
          console.log('✅ 资产已自动上链:', mintResult);
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
      blockchain: mintResult ? {
        txHash: mintResult.txHash,
        tokenId: mintResult.tokenId
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
router.put('/reject/:id', authenticate, requireRole(ROLES.REVIEWER, ROLES.ADMIN), (req, res) => {
  try {
    const { id } = req.params;
    const updatedAsset = updateAssetStatus(id, 'REJECTED', {
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
router.get('/stats', authenticate, requireRole(ROLES.REVIEWER, ROLES.ADMIN), (req, res) => {
  try {
    const allAssets = getAllAssets();
    const pending = getAssetsByStatus('MINTING');
    const approved = getAssetsByStatus('AVAILABLE');
    const rejected = getAssetsByStatus('REJECTED');
    const locked = getAssetsByStatus('LOCKED');
    
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

// POST /api/arsenal/upload - 文件上传
router.post('/upload', upload.single('file'), (req, res) => {
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
    const sanitizedAssets = getSanitizedAssets();
    const index = sanitizedAssets.findIndex(a => a.id === id);
    if (index !== -1) {
      sanitizedAssets[index] = {
        ...sanitizedAsset,
        status: assetData.sanitized.status, // 保持原状态
        reviewHistory: assetData.sanitized.reviewHistory || []
      };
      const { writeFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const SANITIZED_ASSETS_FILE = join(__dirname, '../data/sanitizedAssets.json');
      writeFileSync(SANITIZED_ASSETS_FILE, JSON.stringify(sanitizedAssets, null, 2), 'utf8');
    }

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

export default router;

