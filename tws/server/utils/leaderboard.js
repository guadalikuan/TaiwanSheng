// ============================================
// 文件: server/utils/leaderboard.js
// 排行榜数据管理模块
// ============================================

import { PublicKey } from '@solana/web3.js';
import { getAccount } from '@solana/spl-token';
import { get, put, getAll, NAMESPACES } from './rocksdb.js';
import solanaBlockchainService from './solanaBlockchain.js';
import { getReferralLeaderboard } from './referral.js';
import { getSanitizedAssets } from './storage.js';
import config from '../solana.config.js';

// 排行榜类型常量
export const LEADERBOARD_TYPES = {
  BALANCE: 'balance',                    // 持币数
  TRANSACTIONS: 'transactions',          // 交易数
  JACKPOT_WINS: 'jackpot-wins',          // 获奖数
  ASSET_VALUE: 'asset-value',            // 资产持有量
  TAX_PAID: 'tax-paid',                  // 累计缴税
  CONSUMPTION: 'consumption',             // 累计消费
  REFERRAL_EARNINGS: 'referral-earnings', // 推荐收益
  HOLDING_TIME: 'holding-time',          // 持币时间
};

// 缓存过期时间（5分钟）
const CACHE_EXPIRY = 5 * 60 * 1000;

// 排行榜数据命名空间
const LEADERBOARD_NAMESPACE = 'LEADERBOARD';

/**
 * 格式化数值显示
 */
function formatValue(value, type) {
  if (value === 0) return '0';
  
  switch (type) {
    case LEADERBOARD_TYPES.BALANCE:
    case LEADERBOARD_TYPES.TAX_PAID:
    case LEADERBOARD_TYPES.CONSUMPTION:
    case LEADERBOARD_TYPES.ASSET_VALUE:
      // TOT代币格式化
      if (value >= 1_000_000_000_000_000) {
        return `${(value / 1_000_000_000_000_000).toFixed(2)}B TOT`;
      } else if (value >= 1_000_000_000_000) {
        return `${(value / 1_000_000_000_000).toFixed(2)}T TOT`;
      } else if (value >= 1_000_000_000) {
        return `${(value / 1_000_000_000).toFixed(2)}B TOT`;
      } else if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(2)}M TOT`;
      } else if (value >= 1_000) {
        return `${(value / 1_000).toFixed(2)}K TOT`;
      } else {
        return `${value} TOT`;
      }
    
    case LEADERBOARD_TYPES.TRANSACTIONS:
    case LEADERBOARD_TYPES.JACKPOT_WINS:
      // 整数格式化
      if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(2)}M`;
      } else if (value >= 1_000) {
        return `${(value / 1_000).toFixed(2)}K`;
      } else {
        return value.toString();
      }
    
    case LEADERBOARD_TYPES.HOLDING_TIME:
      // 时间格式化（天数）
      const days = Math.floor(value / (24 * 60 * 60));
      if (days >= 365) {
        const years = Math.floor(days / 365);
        const remainingDays = days % 365;
        return `${years}年${remainingDays}天`;
      } else {
        return `${days}天`;
      }
    
    default:
      return value.toString();
  }
}

/**
 * 获取缓存键
 */
function getCacheKey(type, limit) {
  return `${LEADERBOARD_NAMESPACE}:${type}:${limit}`;
}

/**
 * 检查缓存是否有效
 */
function isCacheValid(cacheData) {
  if (!cacheData || !cacheData.timestamp) {
    return false;
  }
  const now = Date.now();
  return (now - cacheData.timestamp) < CACHE_EXPIRY;
}

/**
 * 从链上查询所有HolderAccount
 */
async function getAllHolderAccounts() {
  try {
    if (!solanaBlockchainService.totProgram || !solanaBlockchainService.connection) {
      console.warn('⚠️ TOT程序未初始化，无法查询HolderAccount');
      return [];
    }

    const programId = solanaBlockchainService.totProgramId;
    const connection = solanaBlockchainService.connection;

    // 使用getProgramAccounts查询所有HolderAccount
    // HolderAccount的PDA种子: ["tot_holder", user_pubkey]
    // 由于PDA需要用户地址，我们需要另一种方式查询
    
    // 方案：从交易历史中提取用户地址，然后查询对应的HolderAccount
    // 或者：维护一个用户地址列表（从交易记录中提取）
    
    // 临时方案：返回空数组，后续可以通过其他方式获取用户列表
    console.warn('⚠️ getAllHolderAccounts: 需要实现用户地址列表获取逻辑');
    return [];
  } catch (error) {
    console.error('❌ 查询HolderAccount失败:', error);
    return [];
  }
}

/**
 * 获取持币数排行榜
 */
export async function getBalanceLeaderboard(limit = 100) {
  const cacheKey = getCacheKey(LEADERBOARD_TYPES.BALANCE, limit);
  
  // 尝试从缓存获取
  try {
    const cached = await get(LEADERBOARD_NAMESPACE, cacheKey);
    if (cached && isCacheValid(cached)) {
      return cached.data;
    }
  } catch (error) {
    // 缓存不存在或读取失败，继续查询
  }

  try {
    if (!solanaBlockchainService.connection) {
      throw new Error('Solana连接未初始化');
    }

    const connection = solanaBlockchainService.connection;
    // 从配置读取Mint地址
    const mint = new PublicKey(config.TAI_ONE_TOKEN.MINT);
    
    // 查询所有代币账户（余额大于0）
    // 注意：这个方法可能返回大量数据，需要优化
    // 使用getProgramAccounts查询所有TokenAccount
    const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    
    // 由于getProgramAccounts可能返回大量数据，我们使用分页或限制
    // 注意：实际生产环境可能需要使用索引或其他优化方案
    const tokenAccounts = await connection.getProgramAccounts(
      TOKEN_PROGRAM_ID,
      {
        filters: [
          {
            dataSize: 165, // TokenAccount数据大小
          },
          {
            memcmp: {
              offset: 0, // mint地址偏移（TokenAccount结构：mint(0-32字节)）
              bytes: mint.toBase58(),
            },
          },
        ],
      }
    );

    // 解析账户数据并提取余额
    const balanceMap = new Map(); // 用于合并同一用户的多账户余额
    
    for (const account of tokenAccounts) {
      try {
        const accountData = await getAccount(connection, new PublicKey(account.pubkey));
        if (accountData.amount > 0n) {
          const owner = accountData.owner.toString();
          const amount = Number(accountData.amount);
          const currentBalance = balanceMap.get(owner) || 0;
          balanceMap.set(owner, currentBalance + amount);
        }
      } catch (error) {
        // 跳过无效账户
        continue;
      }
    }
    
    // 转换为数组
    const balances = Array.from(balanceMap.entries()).map(([address, value]) => ({
      address,
      value,
    }));

    // 按余额降序排序
    balances.sort((a, b) => b.value - a.value);

    // 格式化数据
    const leaderboard = balances.slice(0, limit).map((item, index) => ({
      rank: index + 1,
      address: item.address,
      value: item.value,
      displayValue: formatValue(item.value, LEADERBOARD_TYPES.BALANCE),
    }));

    // 缓存结果
    await put(LEADERBOARD_NAMESPACE, cacheKey, {
      data: leaderboard,
      timestamp: Date.now(),
    });

    return leaderboard;
  } catch (error) {
    console.error('❌ 获取持币数排行榜失败:', error);
    // 返回空数组或从缓存返回旧数据
    try {
      const cached = await get(LEADERBOARD_NAMESPACE, cacheKey);
      if (cached) {
        return cached.data;
      }
    } catch {}
    return [];
  }
}

/**
 * 获取交易数排行榜
 */
export async function getTransactionLeaderboard(limit = 100) {
  const cacheKey = getCacheKey(LEADERBOARD_TYPES.TRANSACTIONS, limit);
  
  try {
    const cached = await get(LEADERBOARD_NAMESPACE, cacheKey);
    if (cached && isCacheValid(cached)) {
      return cached.data;
    }
  } catch (error) {}

  try {
    // 从链上查询HolderAccount的total_transactions字段
    // 由于需要遍历所有HolderAccount，这里使用简化方案
    // 实际实现需要维护用户地址列表
    
    // 临时返回空数组，后续实现
    console.warn('⚠️ getTransactionLeaderboard: 需要实现HolderAccount查询逻辑');
    
    // 缓存空结果
    const leaderboard = [];
    await put(LEADERBOARD_NAMESPACE, cacheKey, {
      data: leaderboard,
      timestamp: Date.now(),
    });
    
    return leaderboard;
  } catch (error) {
    console.error('❌ 获取交易数排行榜失败:', error);
    return [];
  }
}

/**
 * 获取获奖数排行榜
 */
export async function getJackpotWinLeaderboard(limit = 100) {
  const cacheKey = getCacheKey(LEADERBOARD_TYPES.JACKPOT_WINS, limit);
  
  try {
    const cached = await get(LEADERBOARD_NAMESPACE, cacheKey);
    if (cached && isCacheValid(cached)) {
      return cached.data;
    }
  } catch (error) {}

  try {
    // 从链上事件日志查询JackpotWinEvent
    // 统计每个地址的中奖次数
    
    if (!solanaBlockchainService.totProgram || !solanaBlockchainService.connection) {
      throw new Error('TOT程序未初始化');
    }

    const programId = solanaBlockchainService.totProgramId;
    const connection = solanaBlockchainService.connection;

    // 查询JackpotWinEvent事件
    // 注意：Solana事件查询可能需要使用getProgramAccounts或交易历史
    // 这里使用简化方案：从后端存储的事件记录中统计
    
    // 临时返回空数组
    console.warn('⚠️ getJackpotWinLeaderboard: 需要实现事件查询逻辑');
    
    const leaderboard = [];
    await put(LEADERBOARD_NAMESPACE, cacheKey, {
      data: leaderboard,
      timestamp: Date.now(),
    });
    
    return leaderboard;
  } catch (error) {
    console.error('❌ 获取获奖数排行榜失败:', error);
    return [];
  }
}

/**
 * 获取资产持有量排行榜
 */
export async function getAssetValueLeaderboard(limit = 100) {
  const cacheKey = getCacheKey(LEADERBOARD_TYPES.ASSET_VALUE, limit);
  
  try {
    const cached = await get(LEADERBOARD_NAMESPACE, cacheKey);
    if (cached && isCacheValid(cached)) {
      return cached.data;
    }
  } catch (error) {}

  try {
    // 从RocksDB查询所有份额持有记录
    const allHoldings = await getAll(NAMESPACES.SHARE_HOLDINGS);
    const allAssets = await getSanitizedAssets();
    
    // 创建资产价格映射
    const assetPriceMap = new Map();
    allAssets.forEach(asset => {
      assetPriceMap.set(asset.id, asset.tokenPrice || asset.value || 0);
    });

    // 按用户地址分组，计算总价值
    const userValues = new Map();
    allHoldings.forEach(item => {
      const holding = item.value;
      const userId = holding.userId || holding.userAddress;
      const assetId = holding.assetId;
      const shares = holding.shares || 0;
      const assetPrice = assetPriceMap.get(assetId) || 0;
      const value = shares * assetPrice;

      if (userId) {
        const currentValue = userValues.get(userId) || 0;
        userValues.set(userId, currentValue + value);
      }
    });

    // 转换为数组并排序
    const leaderboard = Array.from(userValues.entries())
      .map(([address, value]) => ({
        address,
        value: Math.floor(value),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit)
      .map((item, index) => ({
        rank: index + 1,
        address: item.address,
        value: item.value,
        displayValue: formatValue(item.value, LEADERBOARD_TYPES.ASSET_VALUE),
      }));

    // 缓存结果
    await put(LEADERBOARD_NAMESPACE, cacheKey, {
      data: leaderboard,
      timestamp: Date.now(),
    });

    return leaderboard;
  } catch (error) {
    console.error('❌ 获取资产持有量排行榜失败:', error);
    return [];
  }
}

/**
 * 获取累计缴税排行榜
 */
export async function getTaxPaidLeaderboard(limit = 100) {
  const cacheKey = getCacheKey(LEADERBOARD_TYPES.TAX_PAID, limit);
  
  try {
    const cached = await get(LEADERBOARD_NAMESPACE, cacheKey);
    if (cached && isCacheValid(cached)) {
      return cached.data;
    }
  } catch (error) {}

  try {
    // 从链上查询HolderAccount的total_tax_paid字段
    // 临时返回空数组
    console.warn('⚠️ getTaxPaidLeaderboard: 需要实现HolderAccount查询逻辑');
    
    const leaderboard = [];
    await put(LEADERBOARD_NAMESPACE, cacheKey, {
      data: leaderboard,
      timestamp: Date.now(),
    });
    
    return leaderboard;
  } catch (error) {
    console.error('❌ 获取累计缴税排行榜失败:', error);
    return [];
  }
}

/**
 * 获取累计消费排行榜
 */
export async function getConsumptionLeaderboard(limit = 100) {
  const cacheKey = getCacheKey(LEADERBOARD_TYPES.CONSUMPTION, limit);
  
  try {
    const cached = await get(LEADERBOARD_NAMESPACE, cacheKey);
    if (cached && isCacheValid(cached)) {
      return cached.data;
    }
  } catch (error) {}

  try {
    // 从链上查询HolderAccount的total_consumed字段
    // 临时返回空数组
    console.warn('⚠️ getConsumptionLeaderboard: 需要实现HolderAccount查询逻辑');
    
    const leaderboard = [];
    await put(LEADERBOARD_NAMESPACE, cacheKey, {
      data: leaderboard,
      timestamp: Date.now(),
    });
    
    return leaderboard;
  } catch (error) {
    console.error('❌ 获取累计消费排行榜失败:', error);
    return [];
  }
}

/**
 * 获取推荐收益排行榜
 */
export async function getReferralEarningsLeaderboard(limit = 100) {
  const cacheKey = getCacheKey(LEADERBOARD_TYPES.REFERRAL_EARNINGS, limit);
  
  try {
    const cached = await get(LEADERBOARD_NAMESPACE, cacheKey);
    if (cached && isCacheValid(cached)) {
      return cached.data;
    }
  } catch (error) {}

  try {
    // 使用现有的推荐排行榜函数
    const referralLeaderboard = getReferralLeaderboard(limit);
    
    // 转换为统一格式
    const leaderboard = referralLeaderboard.map(item => ({
      rank: item.rank,
      address: item.userId,
      value: item.totalEarnings,
      displayValue: formatValue(item.totalEarnings, LEADERBOARD_TYPES.REFERRAL_EARNINGS),
      metadata: {
        totalReferrals: item.totalReferrals,
      },
    }));

    // 缓存结果
    await put(LEADERBOARD_NAMESPACE, cacheKey, {
      data: leaderboard,
      timestamp: Date.now(),
    });

    return leaderboard;
  } catch (error) {
    console.error('❌ 获取推荐收益排行榜失败:', error);
    return [];
  }
}

/**
 * 获取持币时间排行榜
 */
export async function getHoldingTimeLeaderboard(limit = 100) {
  const cacheKey = getCacheKey(LEADERBOARD_TYPES.HOLDING_TIME, limit);
  
  try {
    const cached = await get(LEADERBOARD_NAMESPACE, cacheKey);
    if (cached && isCacheValid(cached)) {
      return cached.data;
    }
  } catch (error) {}

  try {
    // 从链上查询HolderAccount的first_hold_time字段
    // 计算持币时间 = 当前时间 - first_hold_time
    // 临时返回空数组
    console.warn('⚠️ getHoldingTimeLeaderboard: 需要实现HolderAccount查询逻辑');
    
    const leaderboard = [];
    await put(LEADERBOARD_NAMESPACE, cacheKey, {
      data: leaderboard,
      timestamp: Date.now(),
    });
    
    return leaderboard;
  } catch (error) {
    console.error('❌ 获取持币时间排行榜失败:', error);
    return [];
  }
}

/**
 * 获取指定用户的排名信息
 */
export async function getUserRanking(address, type) {
  try {
    const leaderboard = await getLeaderboardByType(type, 1000); // 查询Top 1000以找到用户排名
    
    const userRank = leaderboard.findIndex(item => 
      item.address.toLowerCase() === address.toLowerCase()
    );
    
    if (userRank === -1) {
      return null; // 用户不在排行榜中
    }
    
    return {
      rank: userRank + 1,
      ...leaderboard[userRank],
    };
  } catch (error) {
    console.error('❌ 获取用户排名失败:', error);
    return null;
  }
}

/**
 * 根据类型获取排行榜（导出供路由使用）
 */
export async function getLeaderboardByType(type, limit) {
  switch (type) {
    case LEADERBOARD_TYPES.BALANCE:
      return await getBalanceLeaderboard(limit);
    case LEADERBOARD_TYPES.TRANSACTIONS:
      return await getTransactionLeaderboard(limit);
    case LEADERBOARD_TYPES.JACKPOT_WINS:
      return await getJackpotWinLeaderboard(limit);
    case LEADERBOARD_TYPES.ASSET_VALUE:
      return await getAssetValueLeaderboard(limit);
    case LEADERBOARD_TYPES.TAX_PAID:
      return await getTaxPaidLeaderboard(limit);
    case LEADERBOARD_TYPES.CONSUMPTION:
      return await getConsumptionLeaderboard(limit);
    case LEADERBOARD_TYPES.REFERRAL_EARNINGS:
      return await getReferralEarningsLeaderboard(limit);
    case LEADERBOARD_TYPES.HOLDING_TIME:
      return await getHoldingTimeLeaderboard(limit);
    default:
      return [];
  }
}

/**
 * 更新所有排行榜缓存
 */
export async function updateAllLeaderboards() {
  console.log('🔄 开始更新所有排行榜缓存...');
  const startTime = Date.now();
  
  try {
    await Promise.all([
      getBalanceLeaderboard(1000),
      getTransactionLeaderboard(1000),
      getJackpotWinLeaderboard(1000),
      getAssetValueLeaderboard(1000),
      getTaxPaidLeaderboard(1000),
      getConsumptionLeaderboard(1000),
      getReferralEarningsLeaderboard(1000),
      getHoldingTimeLeaderboard(1000),
    ]);
    
    const duration = Date.now() - startTime;
    console.log(`✅ 排行榜缓存更新完成，耗时: ${duration}ms`);
  } catch (error) {
    console.error('❌ 更新排行榜缓存失败:', error);
  }
}
