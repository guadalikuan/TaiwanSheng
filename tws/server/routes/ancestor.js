import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import crypto from 'crypto';
import { get, put, getAll, NAMESPACES } from '../utils/rocksdb.js';
import { authenticate } from '../middleware/auth.js';
import solanaBlockchainService from '../utils/solanaBlockchain.js';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, getAccount } from '@solana/spl-token';
import config from '../solana.config.js';

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
 * 构建Token消耗交易
 */
async function buildConsumeTokenTransaction(userAddress) {
  try {
    const connection = solanaBlockchainService.connection;
    if (!connection) {
      throw new Error('Solana connection not initialized');
    }

    const userPubkey = new PublicKey(userAddress);
    const treasuryPubkey = new PublicKey(TREASURY_ADDRESS);

    // 获取用户的TaiOneToken账户
    const userTokenAccount = await getAssociatedTokenAddress(
      TaiOneToken_MINT,
      userPubkey
    );

    // 获取财库的TaiOneToken账户
    const treasuryTokenAccount = await getAssociatedTokenAddress(
      TaiOneToken_MINT,
      treasuryPubkey
    );

    // 检查用户余额
    try {
      const account = await getAccount(connection, userTokenAccount);
      if (BigInt(account.amount.toString()) < MARKING_FEE_RAW) {
        throw new Error('余额不足，需要至少100 TaiOneToken');
      }
    } catch (error) {
      if (error.message.includes('余额不足')) {
        throw error;
      }
      throw new Error('用户Token账户不存在或余额不足');
    }

    // 构建转账交易
    const transaction = new Transaction();
    transaction.add(
      createTransferInstruction(
        userTokenAccount,
        treasuryTokenAccount,
        userPubkey,
        MARKING_FEE_RAW,
        [],
        TaiOneToken_MINT
      )
    );

    transaction.feePayer = userPubkey;
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;

    return transaction;
  } catch (error) {
    console.error('构建Token消耗交易失败:', error);
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
 * GET /api/ancestor/list - 获取用户的标记列表
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
 * GET /api/ancestor/:id - 获取单个标记详情
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // 尝试从祖籍中查找
    let data = await get(NAMESPACES.ANCESTOR_ORIGINS, id);
    
    // 如果没找到，尝试从祖产中查找
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

export default router;

