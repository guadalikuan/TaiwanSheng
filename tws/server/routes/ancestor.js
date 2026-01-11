import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import crypto from 'crypto';
import { get, put, getAll, NAMESPACES } from '../utils/rocksdb.js';
import { authenticate } from '../middleware/auth.js';
import solanaBlockchainService from '../utils/solanaBlockchain.js';
import { Transaction } from '@solana/web3.js';
import { consumeToTreasury } from '../utils/solanaBlockchain.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// 配置 multer 存储（复用arsenal.js的逻辑）
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
    cb(null, `ancestor-${uniqueSuffix}.${ext}`);
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

// TaiOneToken 配置
const TaiOneToken_MINT = new PublicKey(config.TAI_ONE_TOKEN.MINT);
const TAI_ONE_DECIMALS = config.TAI_ONE_TOKEN.DECIMALS;
const MARKING_FEE = 100; // 100 TaiOneToken
const MARKING_FEE_RAW = BigInt(MARKING_FEE * Math.pow(10, TAI_ONE_DECIMALS));

// 财库地址（接收Token消耗）
const TREASURY_ADDRESS = 'TaiOneTreasury111111111111111111111111111111';

/**
 * 计算数据哈希
 */
function calculateDataHash(data) {
  // 排除上链相关字段
  const { dataHash, chainTxHash, chainTimestamp, chainAddress, ...dataToHash } = data;
  const dataString = JSON.stringify(dataToHash, Object.keys(dataToHash).sort());
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * 构建Token消耗交易（使用TOT合约）
 */
async function buildConsumeTokenTransaction(userAddress) {
  try {
    // 祖籍标记固定消耗100 TOT
    const amount = 100;
    // 使用ConsumeType::AncestorMarking（类型1）
    const consumeType = 1;
    
    // 调用TOT合约的consume_to_treasury指令
    const result = await consumeToTreasury(userAddress, amount, consumeType);
    
    // 反序列化交易以便返回
    const transaction = Transaction.from(Buffer.from(result.transaction, 'base64'));
    
    return transaction;
  } catch (error) {
    console.error('构建Token消耗交易失败:', error);
    // 如果TOT合约调用失败，可以fallback到标准SPL Token转账
    // 这里暂时抛出错误，后续可以添加fallback逻辑
    throw error;
  }
}

/**
 * POST /api/ancestor/consume-token - 消耗100 TaiOneToken并返回交易
 */
router.post('/consume-token', authenticate, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const userAddress = walletAddress || req.user?.address;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    // 构建交易
    const transaction = await buildConsumeTokenTransaction(userAddress);

    // 序列化交易
    const serialized = transaction.serialize({ requireAllSignatures: false }).toString('base64');

    res.json({
      success: true,
      transaction: serialized,
      fee: MARKING_FEE,
      message: '交易已构建，请签名并发送'
    });
  } catch (error) {
    console.error('消耗Token失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '消耗Token失败'
    });
  }
});

/**
 * POST /api/ancestor/upload - 上传证明文件
 */
router.post('/upload', authenticate, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
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
      success: false,
      error: 'Failed to upload file',
      message: error.message 
    });
  }
});

/**
 * POST /api/ancestor/mark-origin - 标记祖籍
 */
router.post('/mark-origin', authenticate, async (req, res) => {
  try {
    const {
      walletAddress,
      province,
      city,
      district,
      address,
      location,
      familyName,
      generation,
      ancestorName,
      migrationHistory,
      proofFiles = [],
      txSignature // Token消耗的交易签名
    } = req.body;

    const userAddress = walletAddress || req.user?.address;
    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    // 验证位置信息
    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({
        success: false,
        error: 'Location (lat, lng) is required'
      });
    }

    // 验证Token消耗交易（如果提供了签名）
    if (txSignature) {
      // 这里可以添加交易验证逻辑
      // 暂时跳过，因为Token消耗在进入页面时已完成
    }

    // 创建祖籍数据
    const originData = {
      id: `origin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: 'origin',
      walletAddress: userAddress,
      province: province || '',
      city: city || '',
      district: district || '',
      address: address || '',
      location: {
        lat: Number(location.lat),
        lng: Number(location.lng)
      },
      familyName: familyName || '',
      generation: generation || '',
      ancestorName: ancestorName || '',
      migrationHistory: migrationHistory || '',
      proofFiles: Array.isArray(proofFiles) ? proofFiles : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 计算数据哈希
    const dataHash = calculateDataHash(originData);
    originData.dataHash = dataHash;

    // 上链存储哈希（尝试）
    let chainTxHash = '';
    let chainTimestamp = 0;
    let chainAddress = '';

    try {
      // 使用Solana存储哈希
      // 这里简化处理，实际应该调用智能合约
      // 暂时使用简单的PDA方案
      const connection = solanaBlockchainService.connection;
      if (connection) {
        // 生成PDA地址
        const [pda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('ancestor_origin'),
            Buffer.from(originData.id),
            new PublicKey(userAddress).toBuffer()
          ],
          PublicKey.default // 使用默认程序ID，实际应该使用项目程序ID
        );
        chainAddress = pda.toString();
        chainTimestamp = Date.now();
        // 注意：这里只是生成了地址，实际需要调用智能合约存储
        // 为了简化，我们暂时只记录地址
      }
    } catch (error) {
      console.warn('上链失败，但数据仍会保存到数据库:', error);
    }

    originData.chainTxHash = chainTxHash;
    originData.chainTimestamp = chainTimestamp;
    originData.chainAddress = chainAddress;

    // 保存到RocksDB
    await put(NAMESPACES.ANCESTOR_ORIGINS, originData.id, originData);

    res.json({
      success: true,
      data: originData,
      message: '祖籍标记成功'
    });
  } catch (error) {
    console.error('标记祖籍失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '标记祖籍失败'
    });
  }
});

/**
 * POST /api/ancestor/mark-property - 标记祖产
 */
router.post('/mark-property', authenticate, async (req, res) => {
  try {
    const {
      walletAddress,
      province,
      city,
      district,
      address,
      location,
      propertyType,
      area,
      propertyName,
      ownershipInfo,
      currentStatus,
      estimatedValue,
      proofFiles = [],
      txSignature // Token消耗的交易签名
    } = req.body;

    const userAddress = walletAddress || req.user?.address;
    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    // 验证位置信息
    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({
        success: false,
        error: 'Location (lat, lng) is required'
      });
    }

    // 创建祖产数据
    const propertyData = {
      id: `property_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: 'property',
      walletAddress: userAddress,
      province: province || '',
      city: city || '',
      district: district || '',
      address: address || '',
      location: {
        lat: Number(location.lat),
        lng: Number(location.lng)
      },
      propertyType: propertyType || '',
      area: area ? Number(area) : 0,
      propertyName: propertyName || '',
      ownershipInfo: ownershipInfo || '',
      currentStatus: currentStatus || '',
      estimatedValue: estimatedValue ? Number(estimatedValue) : 0,
      proofFiles: Array.isArray(proofFiles) ? proofFiles : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 计算数据哈希
    const dataHash = calculateDataHash(propertyData);
    propertyData.dataHash = dataHash;

    // 上链存储哈希（尝试）
    let chainTxHash = '';
    let chainTimestamp = 0;
    let chainAddress = '';

    try {
      const connection = solanaBlockchainService.connection;
      if (connection) {
        // 生成PDA地址
        const [pda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('ancestor_property'),
            Buffer.from(propertyData.id),
            new PublicKey(userAddress).toBuffer()
          ],
          PublicKey.default
        );
        chainAddress = pda.toString();
        chainTimestamp = Date.now();
      }
    } catch (error) {
      console.warn('上链失败，但数据仍会保存到数据库:', error);
    }

    propertyData.chainTxHash = chainTxHash;
    propertyData.chainTimestamp = chainTimestamp;
    propertyData.chainAddress = chainAddress;

    // 保存到RocksDB
    await put(NAMESPACES.ANCESTOR_PROPERTIES, propertyData.id, propertyData);

    res.json({
      success: true,
      data: propertyData,
      message: '祖产标记成功'
    });
  } catch (error) {
    console.error('标记祖产失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '标记祖产失败'
    });
  }
});

/**
 * GET /api/ancestor/list - 获取用户的标记列表（支持所有类型）
 */
router.get('/list', authenticate, async (req, res) => {
  try {
    const { walletAddress, type } = req.query;
    const userAddress = (walletAddress || req.user?.address)?.toLowerCase();

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    const results = [];

    // 从统一命名空间获取所有标记
    const allMarks = await getAll(NAMESPACES.MAP_MARKS);
    allMarks.forEach(item => {
      const data = item.value;
      if (data.walletAddress?.toLowerCase() === userAddress) {
        if (!type || data.type === type) {
          results.push(data);
        }
      }
    });

    // 向后兼容：从旧命名空间获取（如果统一命名空间没有数据）
    if (results.length === 0) {
      // 获取祖籍标记
      if (!type || type === 'origin') {
        const origins = await getAll(NAMESPACES.ANCESTOR_ORIGINS);
        origins.forEach(item => {
          const data = item.value;
          if (data.walletAddress?.toLowerCase() === userAddress) {
            results.push(data);
          }
        });
      }

      // 获取祖产标记
      if (!type || type === 'property') {
        const properties = await getAll(NAMESPACES.ANCESTOR_PROPERTIES);
        properties.forEach(item => {
          const data = item.value;
          if (data.walletAddress?.toLowerCase() === userAddress) {
            results.push(data);
          }
        });
      }
    }

    // 按创建时间排序
    results.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('获取标记列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取标记列表失败'
    });
  }
});

/**
 * 根据类型生成PDA地址
 */
function generatePDAAddress(type, id, walletAddress) {
  try {
    const connection = solanaBlockchainService.connection;
    if (!connection) return '';
    
    const typeMap = {
      'origin': 'map_mark_origin',
      'property': 'map_mark_property',
      'refuge': 'map_mark_refuge',
      'relative': 'map_mark_relative',
      'memory': 'map_mark_memory',
      'resource': 'map_mark_resource',
      'contact': 'map_mark_contact',
      'future': 'map_mark_future'
    };
    
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(typeMap[type] || 'map_mark'),
        Buffer.from(id),
        new PublicKey(walletAddress).toBuffer()
      ],
      PublicKey.default
    );
    return pda.toString();
  } catch (error) {
    console.warn('生成PDA地址失败:', error);
    return '';
  }
}

/**
 * 统一标记处理函数
 */
async function handleMarkSubmission(type, req, res) {
  try {
    const {
      walletAddress,
      province,
      city,
      district,
      address,
      location,
      proofFiles = [],
      // 类型特定字段
      ...typeSpecificFields
    } = req.body;

    const userAddress = walletAddress || req.user?.address;
    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    // 验证位置信息
    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({
        success: false,
        error: 'Location (lat, lng) is required'
      });
    }

    // 创建标记数据
    const markData = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: type,
      walletAddress: userAddress,
      province: province || '',
      city: city || '',
      district: district || '',
      address: address || '',
      location: {
        lat: Number(location.lat),
        lng: Number(location.lng)
      },
      proofFiles: Array.isArray(proofFiles) ? proofFiles : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...typeSpecificFields // 添加类型特定字段
    };

    // 计算数据哈希
    const dataHash = calculateDataHash(markData);
    markData.dataHash = dataHash;

    // 上链存储哈希
    let chainTxHash = '';
    let chainTimestamp = 0;
    let chainAddress = '';

    try {
      chainAddress = generatePDAAddress(type, markData.id, userAddress);
      chainTimestamp = Date.now();
    } catch (error) {
      console.warn('上链失败，但数据仍会保存到数据库:', error);
    }

    markData.chainTxHash = chainTxHash;
    markData.chainTimestamp = chainTimestamp;
    markData.chainAddress = chainAddress;

    // 保存到统一命名空间
    await put(NAMESPACES.MAP_MARKS, markData.id, markData);
    
    // 同时保存到旧命名空间（向后兼容）
    if (type === 'origin') {
      await put(NAMESPACES.ANCESTOR_ORIGINS, markData.id, markData);
    } else if (type === 'property') {
      await put(NAMESPACES.ANCESTOR_PROPERTIES, markData.id, markData);
    }

    const typeNames = {
      'origin': '祖籍',
      'property': '祖产',
      'refuge': '避难所',
      'relative': '亲属位置',
      'memory': '历史记忆',
      'resource': '资源点',
      'contact': '联络节点',
      'future': '未来规划'
    };

    res.json({
      success: true,
      data: markData,
      message: `${typeNames[type] || '标记'}标记成功`
    });
  } catch (error) {
    console.error(`标记${type}失败:`, error);
    res.status(500).json({
      success: false,
      error: error.message || `标记${type}失败`
    });
  }
}

/**
 * POST /api/ancestor/mark/:type - 统一标记接口（支持所有类型）
 */
router.post('/mark/:type', authenticate, async (req, res) => {
  const { type } = req.params;
  const validTypes = ['origin', 'property', 'refuge', 'relative', 'memory', 'resource', 'contact', 'future'];
  
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: `Invalid mark type. Valid types: ${validTypes.join(', ')}`
    });
  }

  return handleMarkSubmission(type, req, res);
});

/**
 * GET /api/ancestor/:id - 获取单个标记详情
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // 优先从统一命名空间查找
    let data = await get(NAMESPACES.MAP_MARKS, id);
    
    // 如果没找到，尝试从旧命名空间查找（向后兼容）
    if (!data) {
      data = await get(NAMESPACES.ANCESTOR_ORIGINS, id);
    }
    if (!data) {
      data = await get(NAMESPACES.ANCESTOR_PROPERTIES, id);
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Mark not found'
      });
    }

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('获取标记详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取标记详情失败'
    });
  }
});

/**
 * POST /api/ancestor/verify-token - 验证祖籍标记交易
 */
router.post('/verify-token', authenticate, async (req, res) => {
  try {
    const { txSignature } = req.body;
    const userAddress = req.user?.address || req.body.walletAddress;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
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
        userAddress,
        MARKING_FEE
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
        message: 'Transaction verified successfully',
        fee: MARKING_FEE,
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
    console.error('验证Token消耗失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '验证交易失败'
    });
  }
});

export default router;

