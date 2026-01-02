import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';

// TWSCoin 铸造地址
const TWSCoin_MINT = new PublicKey(process.env.TWS_COIN_MINT || 'ZRGboZN3K6JZYhGe8PHDcazwKuqhgp2tTG7h8G5fKGk');

// Solana RPC端点
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// 已验证的交易缓存（防止重复验证）
const verifiedTransactions = new Set();

/**
 * 验证Solana链上TWSCoin转账交易
 * @param {string} txSignature - 交易签名
 * @param {Object} expectedPayment - 期望的支付信息
 * @returns {Promise<Object>} 验证结果
 */
export const verifyPayment = async (txSignature, expectedPayment) => {
  try {
    // 检查是否已经验证过
    if (verifiedTransactions.has(txSignature)) {
      return {
        valid: false,
        message: 'Transaction already verified',
        txSignature
      };
    }

    // 解析交易
    const tx = await connection.getTransaction(txSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });

    if (!tx) {
      return {
        valid: false,
        message: 'Transaction not found on blockchain'
      };
    }

    // 检查交易是否成功
    if (tx.meta?.err) {
      return {
        valid: false,
        message: `Transaction failed: ${JSON.stringify(tx.meta.err)}`
      };
    }

    // 验证交易中的SPL Token转账
    const tokenTransfers = tx.meta?.postTokenBalances || [];
    const preTokenBalances = tx.meta?.preTokenBalances || [];

    // 查找TWSCoin转账
    let foundTransfer = false;
    let transferAmount = 0;
    let fromAddress = null;
    let toAddress = null;

    for (let i = 0; i < tokenTransfers.length; i++) {
      const postBalance = tokenTransfers[i];
      const preBalance = preTokenBalances.find(
        b => b.accountIndex === postBalance.accountIndex
      );

      if (postBalance.mint === TWSCoin_MINT) {
        const postAmount = parseInt(postBalance.uiTokenAmount.amount);
        const preAmount = preBalance ? parseInt(preBalance.uiTokenAmount.amount) : 0;
        const diff = postAmount - preAmount;

        if (diff > 0) {
          // 这是接收方
          toAddress = postBalance.owner;
          transferAmount = diff;
        } else if (diff < 0) {
          // 这是发送方
          fromAddress = postBalance.owner;
        }

        if (fromAddress && toAddress) {
          foundTransfer = true;
          break;
        }
      }
    }

    if (!foundTransfer) {
      return {
        valid: false,
        message: 'No TWSCoin transfer found in transaction'
      };
    }

    // 验证金额
    const expectedAmount = BigInt(Math.floor(expectedPayment.amount * 1e6)); // TWSCoin有6位小数
    if (BigInt(transferAmount) !== expectedAmount) {
      return {
        valid: false,
        message: `Amount mismatch. Expected: ${expectedAmount}, Got: ${transferAmount}`
      };
    }

    // 验证发送地址
    if (expectedPayment.from) {
      if (fromAddress !== expectedPayment.from) {
        return {
          valid: false,
          message: `From address mismatch. Expected: ${expectedPayment.from}, Got: ${fromAddress}`
        };
      }
    }

    // 验证接收地址（项目收款地址）
    // 注意：这里需要根据实际的项目收款地址逻辑来验证
    // 暂时只验证地址格式
    try {
      new PublicKey(toAddress);
    } catch (error) {
      return {
        valid: false,
        message: `Invalid recipient address: ${toAddress}`
      };
    }

    // 验证交易时间（应该在合理范围内，比如最近24小时）
    const txTime = tx.blockTime ? tx.blockTime * 1000 : Date.now();
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时

    if (now - txTime > maxAge) {
      return {
        valid: false,
        message: 'Transaction is too old'
      };
    }

    // 标记为已验证
    verifiedTransactions.add(txSignature);

    return {
      valid: true,
      message: 'Payment verified successfully',
      txSignature,
      amount: transferAmount / 1e6, // 转换为可读格式
      from: fromAddress,
      to: toAddress,
      timestamp: txTime
    };
  } catch (error) {
    console.error('Error verifying payment:', error);
    return {
      valid: false,
      message: `Verification error: ${error.message}`
    };
  }
};

/**
 * 检查交易是否已验证
 * @param {string} txSignature - 交易签名
 * @returns {boolean} 是否已验证
 */
export const isTransactionVerified = (txSignature) => {
  return verifiedTransactions.has(txSignature);
};

/**
 * 清除验证缓存（用于测试或重置）
 */
export const clearVerificationCache = () => {
  verifiedTransactions.clear();
};

export default {
  verifyPayment,
  isTransactionVerified,
  clearVerificationCache
};

