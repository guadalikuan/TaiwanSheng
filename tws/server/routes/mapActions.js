/**
 * 地图功能操作路由
 * 处理地图上的各种功能操作（修缮妈祖庙、放飞孔明灯、祭拜祖先等）
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { put, get, NAMESPACES } from '../utils/rocksdb.js';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, getAccount } from '@solana/spl-token';
import solanaBlockchainService from '../utils/solanaBlockchain.js';
import config from '../solana.config.js';

const TAI_ONE_TOKEN_MINT = new PublicKey(config.TAI_ONE_TOKEN.MINT);
const TAI_ONE_DECIMALS = config.TAI_ONE_TOKEN.DECIMALS;

// 财库地址（接收Token消耗）
const TREASURY_ADDRESS = 'TaiOneTreasury111111111111111111111111111111';

/**
 * 构建消耗TOT的交易
 * @param {string} userAddress - 用户钱包地址
 * @param {number} amount - 消耗的TOT数量
 * @returns {Promise<Transaction>}
 */
async function buildConsumeTokenTransaction(userAddress, amount) {
  try {
    const connection = solanaBlockchainService.connection;
    if (!connection) {
      throw new Error('Solana connection not initialized');
    }

    const userPubkey = new PublicKey(userAddress);
    const treasuryPubkey = new PublicKey(TREASURY_ADDRESS);

    // 获取用户的TOT代币账户
    const userTokenAccount = await getAssociatedTokenAddress(
      TAI_ONE_TOKEN_MINT,
      userPubkey
    );

    // 获取财库的TOT代币账户
    const treasuryTokenAccount = await getAssociatedTokenAddress(
      TAI_ONE_TOKEN_MINT,
      treasuryPubkey
    );

    // 检查用户余额
    const amountRaw = BigInt(Math.floor(amount * Math.pow(10, TAI_ONE_DECIMALS)));
    try {
      const account = await getAccount(connection, userTokenAccount);
      if (BigInt(account.amount.toString()) < amountRaw) {
        throw new Error(`余额不足，需要 ${amount} TOT`);
      }
    } catch (error) {
      if (error.message.includes('余额不足')) {
        throw error;
      }
      throw new Error('用户Token账户不存在或余额不足');
    }

    // 构建交易
    const transaction = new Transaction();
    transaction.add(
      createTransferInstruction(
        userTokenAccount,
        treasuryTokenAccount,
        userPubkey,
        amountRaw,
        [],
        TAI_ONE_TOKEN_MINT
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

    // 构建消耗TOT的交易
    const transaction = await buildConsumeTokenTransaction(userAddress, amount);

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

export default router;
