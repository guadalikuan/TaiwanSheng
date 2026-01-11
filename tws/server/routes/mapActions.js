/**
 * 地图功能操作路由
 * 处理地图上的各种功能操作（修缮妈祖庙、放飞孔明灯、祭拜祖先等）
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { put, get, NAMESPACES } from '../utils/rocksdb.js';
import { Transaction } from '@solana/web3.js';
import { consumeToTreasury } from '../utils/solanaBlockchain.js';

/**
 * 根据reason确定消费类型
 * @param {string} reason - 消费原因
 * @returns {number} 消费类型（0=地图操作, 1=祖籍标记, 2=其他）
 */
function getConsumeType(reason) {
  if (!reason) return 0; // 默认地图操作
  
  const reasonLower = reason.toLowerCase();
  if (reasonLower.includes('ancestor') || reasonLower.includes('祖籍')) {
    return 1; // 祖籍标记
  } else if (reasonLower.includes('map') || reasonLower.includes('地图') || reasonLower === 'map_action') {
    return 0; // 地图操作
  } else {
    return 2; // 其他
  }
}

/**
 * 构建消耗TOT的交易（使用TOT合约）
 * @param {string} userAddress - 用户钱包地址
 * @param {number} amount - 消耗的TOT数量
 * @param {string} reason - 消费原因（用于确定消费类型）
 * @returns {Promise<Object>} 交易结果（包含序列化的交易）
 */
async function buildConsumeTokenTransaction(userAddress, amount, reason = 'map_action') {
  try {
    // 确定消费类型
    const consumeType = getConsumeType(reason);
    
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

const router = express.Router();

/**
 * POST /api/tot/consume - 消耗TOT用于地图功能操作
 * 返回交易供用户签名
 */
router.post('/consume', authenticate, async (req, res) => {
  try {
    const { walletAddress, amount, reason } = req.body;
    const userAddress = walletAddress || req.user?.address;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount',
        message: '消耗数量必须大于0'
      });
    }

    // 构建消耗TOT的交易（使用TOT合约的consume_to_treasury指令）
    const transaction = await buildConsumeTokenTransaction(userAddress, amount, reason);

    // 序列化交易
    const serialized = transaction.serialize({ requireAllSignatures: false }).toString('base64');

    res.json({
      success: true,
      transaction: serialized,
      amount: amount,
      reason: reason || 'map_action',
      message: '交易已构建，请签名并发送'
    });
  } catch (error) {
    console.error('构建消耗TOT交易失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '构建交易失败'
    });
  }
});

/**
 * POST /api/map-actions/record - 记录地图功能操作
 */
router.post('/record', authenticate, async (req, res) => {
  try {
    const { actionType, ...actionData } = req.body;
    const userAddress = req.user?.address;

    if (!actionType) {
      return res.status(400).json({
        success: false,
        error: 'Action type is required'
      });
    }

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'User address is required'
      });
    }

    // 构建操作记录
    const record = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      actionType,
      walletAddress: userAddress,
      ...actionData,
      timestamp: Date.now()
    };

    // 存储到RocksDB
    const key = `map_action:${actionType}:${record.id}`;
    await put(NAMESPACES.MAP_ACTIONS, key, JSON.stringify(record));

    // 同时存储用户的操作列表
    const userKey = `user_actions:${userAddress}:${actionType}`;
    const existingActions = await get(NAMESPACES.MAP_ACTIONS, userKey);
    const actions = existingActions ? JSON.parse(existingActions) : [];
    actions.push(record.id);
    await put(NAMESPACES.MAP_ACTIONS, userKey, JSON.stringify(actions));

    res.json({
      success: true,
      data: record,
      message: '操作记录已保存'
    });
  } catch (error) {
    console.error('记录操作失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '记录操作失败'
    });
  }
});

/**
 * GET /api/map-actions/history - 获取用户的操作历史
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const { actionType, limit = 50 } = req.query;
    const userAddress = req.user?.address;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'User address is required'
      });
    }

    // 获取用户的操作列表
    const userKey = `user_actions:${userAddress}:${actionType || 'all'}`;
    const actions = await get(NAMESPACES.MAP_ACTIONS, userKey);
    
    if (!actions) {
      return res.json({
        success: true,
        data: {
          actions: [],
          total: 0
        }
      });
    }

    const actionIds = JSON.parse(actions);
    const actionRecords = [];

    // 获取操作详情
    for (const actionId of actionIds.slice(0, parseInt(limit))) {
      const actionKey = `map_action:${actionType || '*'}:${actionId}`;
      // 这里需要根据actionType查找，简化处理
      // 实际应该使用更好的索引方式
    }

    res.json({
      success: true,
      data: {
        actions: actionRecords,
        total: actionIds.length
      }
    });
  } catch (error) {
    console.error('获取操作历史失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取操作历史失败'
    });
  }
});

/**
 * POST /api/map-actions/verify - 验证地图操作交易
 */
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { txSignature, amount, reason } = req.body;
    const userAddress = req.user?.address;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'User address is required'
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
        amount || 0
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
    console.error('Error verifying map action:', error);
    res.status(500).json({
      success: false,
      error: error.message || '验证交易失败'
    });
  }
});

export default router;
