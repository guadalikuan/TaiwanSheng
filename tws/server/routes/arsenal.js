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
  getAllAssets
} from '../utils/storage.js';

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

// GET /api/arsenal/pending - 获取所有待审核资产
router.get('/pending', (req, res) => {
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

// PUT /api/arsenal/approve/:id - 批准资产
router.put('/approve/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updatedAsset = updateAssetStatus(id, 'AVAILABLE', {
      reviewedBy: req.body.reviewedBy || 'system',
      reviewNotes: req.body.reviewNotes || ''
    });
    
    res.json({
      success: true,
      message: 'Asset approved successfully',
      asset: updatedAsset
    });
  } catch (error) {
    console.error('Error approving asset:', error);
    res.status(500).json({ 
      error: 'Failed to approve asset',
      message: error.message 
    });
  }
});

// PUT /api/arsenal/reject/:id - 拒绝资产
router.put('/reject/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updatedAsset = updateAssetStatus(id, 'REJECTED', {
      reviewedBy: req.body.reviewedBy || 'system',
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

// GET /api/arsenal/stats - 获取统计信息
router.get('/stats', (req, res) => {
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

export default router;

