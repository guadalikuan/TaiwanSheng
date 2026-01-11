// ============================================
// 文件: server/utils/leaderboard.js
// 排行榜数据管理模块
// ============================================

import { PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
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

// 时间维度常量
export const LEADERBOARD_PERIODS = {
  DAY: 'day',      // 日排行
  WEEK: 'week',     // 周排行
  MONTH: 'month',   // 月排行
  ALL: 'all',       // 总排行
};

// 缓存过期时间（毫秒）
const CACHE_EXPIRY = {
  [LEADERBOARD_PERIODS.DAY]: 60 * 60 * 1000,      // 1小时
  [LEADERBOARD_PERIODS.WEEK]: 6 * 60 * 60 * 1000, // 6小时
  [LEADERBOARD_PERIODS.MONTH]: 12 * 60 * 60 * 1000, // 12小时
  [LEADERBOARD_PERIODS.ALL]: 5 * 60 * 1000,       // 5分钟
};

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
function getCacheKey(type, period, limit) {
  return `${LEADERBOARD_NAMESPACE}:${type}:${period}:${limit}`;
}

/**
 * 检查缓存是否有效
 */
function isCacheValid(cacheData, period) {
  if (!cacheData || !cacheData.timestamp) {
    return false;
  }
  const now = Date.now();
  const expiry = CACHE_EXPIRY[period] || CACHE_EXPIRY[LEADERBOARD_PERIODS.ALL];
  return (now - cacheData.timestamp) < expiry;
}

/**
 * 获取时间范围的起始时间戳
 */
function getPeriodStartTimestamp(period) {
  const now = new Date();
  const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 
                          now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()));
  
  switch (period) {
    case LEADERBOARD_PERIODS.DAY:
      // 今天0点（UTC）
      return new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), 
                               utcNow.getUTCDate(), 0, 0, 0)).getTime();
    
    case LEADERBOARD_PERIODS.WEEK:
      // 本周一0点（UTC）
      const dayOfWeek = utcNow.getUTCDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(utcNow);
      monday.setUTCDate(utcNow.getUTCDate() - daysToMonday);
      monday.setUTCHours(0, 0, 0, 0);
      return monday.getTime();
    
    case LEADERBOARD_PERIODS.MONTH:
      // 本月1号0点（UTC）
      return new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), 
                               1, 0, 0, 0)).getTime();
    
    case LEADERBOARD_PERIODS.ALL:
      return 0; // 所有时间
    
    default:
      return 0;
  }
}

/**
 * 获取日期字符串（用于快照键）
 */
function getDateStringForPeriod(period) {
  const now = new Date();
  const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  
  switch (period) {
    case LEADERBOARD_PERIODS.DAY:
      // YYYY-MM-DD
      return `${utcNow.getUTCFullYear()}-${String(utcNow.getUTCMonth() + 1).padStart(2, '0')}-${String(utcNow.getUTCDate()).padStart(2, '0')}`;
    
    case LEADERBOARD_PERIODS.WEEK:
      // 本周一日期 YYYY-MM-DD
      const dayOfWeek = utcNow.getUTCDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(utcNow);
      monday.setUTCDate(utcNow.getUTCDate() - daysToMonday);
      return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-${String(monday.getUTCDate()).padStart(2, '0')}`;
    
    case LEADERBOARD_PERIODS.MONTH:
      // YYYY-MM
      return `${utcNow.getUTCFullYear()}-${String(utcNow.getUTCMonth() + 1).padStart(2, '0')}`;
    
    default:
      return '';
  }
}

/**
 * 获取快照键
 */
function getSnapshotKey(period, dateStr) {
  return `snapshot:${period}:${dateStr}`;
}

/**
 * 保存快照
 */
export async function saveSnapshot(period, dateStr, data) {
  const key = getSnapshotKey(period, dateStr);
  await put(LEADERBOARD_NAMESPACE, key, {
    data,
    timestamp: Date.now(),
    period,
    dateStr,
  });
}

/**
 * 获取快照
 */
export async function getSnapshot(period, dateStr) {
  const key = getSnapshotKey(period, dateStr);
  try {
    const snapshot = await get(LEADERBOARD_NAMESPACE, key);
    return snapshot?.data || null;
  } catch (error) {
    return null;
  }
}

/**
 * 计算增量数据（当前值 - 快照值）
 */
function calculateIncremental(currentData, snapshotData) {
  const currentMap = new Map();
  currentData.forEach(item => {
    currentMap.set(item.address, item.value || 0);
  });
  
  const snapshotMap = new Map();
  if (snapshotData && Array.isArray(snapshotData)) {
    snapshotData.forEach(item => {
      snapshotMap.set(item.address, item.value || 0);
    });
  }
  
  const incremental = [];
  currentMap.forEach((value, address) => {
    const snapshotValue = snapshotMap.get(address) || 0;
    const incrementalValue = Math.max(0, value - snapshotValue);
    if (incrementalValue > 0) {
      incremental.push({
        address,
        value: incrementalValue,
      });
    }
  });
  
  return incremental;
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
export async function getBalanceLeaderboard(limit = 100, period = LEADERBOARD_PERIODS.ALL) {
  const cacheKey = getCacheKey(LEADERBOARD_TYPES.BALANCE, period, limit);
  
  // 尝试从缓存获取
  try {
    const cached = await get(LEADERBOARD_NAMESPACE, cacheKey);
    if (cached && isCacheValid(cached, period)) {
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

    // 处理时间维度
    let finalBalances = balances;
    if (period !== LEADERBOARD_PERIODS.ALL) {
      // 日/周/月排行：需要计算余额变化
      const dateStr = getDateStringForPeriod(period);
      const snapshot = await getSnapshot(period, dateStr);
      
      if (snapshot) {
        // 计算增量：当前余额 - 快照余额
        finalBalances = calculateIncremental(balances, snapshot);
      } else {
        // 如果没有快照，保存当前值作为快照
        await saveSnapshot(period, dateStr, balances);
      }
    }
    
    // 格式化数据
    const leaderboard = finalBalances.slice(0, limit).map((item, index) => ({
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
export async function getTransactionLeaderboard(limit = 100, period = LEADERBOARD_PERIODS.ALL) {
  const cacheKey = getCacheKey(LEADERBOARD_TYPES.TRANSACTIONS, period, limit);
  
  try {
    const cached = await get(LEADERBOARD_NAMESPACE, cacheKey);
    if (cached && isCacheValid(cached, period)) {
      return cached.data;
    }
  } catch (error) {}

  try {
    // 从链上查询HolderAccount的total_transactions字段
    // 由于需要遍历所有HolderAccount，这里使用简化方案
    // 实际实现需要维护用户地址列表
    
    // 临时返回空数组，后续实现
    console.warn('⚠️ getTransactionLeaderboard: 需要实现HolderAccount查询逻辑');
    
    // 处理时间维度（如果有数据的话）
    // 目前返回空数组，后续实现HolderAccount查询后，需要添加增量计算逻辑
    
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
export async function getJackpotWinLeaderboard(limit = 100, period = LEADERBOARD_PERIODS.ALL) {
  const cacheKey = getCacheKey(LEADERBOARD_TYPES.JACKPOT_WINS, period, limit);
  
  try {
    const cached = await get(LEADERBOARD_NAMESPACE, cacheKey);
    if (cached && isCacheValid(cached, period)) {
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
    // 后续实现：从链上事件日志（JackpotWinEvent）中按时间筛选
    // 如果period不是ALL，需要筛选timestamp在时间范围内的记录
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
export async function getAssetValueLeaderboard(limit = 100, period = LEADERBOARD_PERIODS.ALL) {
  const cacheKey = getCacheKey(LEADERBOARD_TYPES.ASSET_VALUE, period, limit);
  
  try {
    const cached = await get(LEADERBOARD_NAMESPACE, cacheKey);
    if (cached && isCacheValid(cached, period)) {
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

    // 处理时间维度：筛选时间范围内的记录
    const periodStart = period !== LEADERBOARD_PERIODS.ALL ? getPeriodStartTimestamp(period) : 0;
    
    // 按用户地址分组，计算总价值
    const userValues = new Map();
    allHoldings.forEach(item => {
      const holding = item.value;
      
      // 如果指定了时间维度，筛选时间范围内的记录
      if (period !== LEADERBOARD_PERIODS.ALL) {
        const holdingTime = holding.timestamp || holding.createdAt || 0;
        if (holdingTime < periodStart) {
          return; // 跳过时间范围外的记录
        }
      }
      
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
export async function getTaxPaidLeaderboard(limit = 100, period = LEADERBOARD_PERIODS.ALL) {
  const cacheKey = getCacheKey(LEADERBOARD_TYPES.TAX_PAID, period, limit);
  
  try {
    const cached = await get(LEADERBOARD_NAMESPACE, cacheKey);
    if (cached && isCacheValid(cached, period)) {
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
export async function getConsumptionLeaderboard(limit = 100, period = LEADERBOARD_PERIODS.ALL) {
  const cacheKey = getCacheKey(LEADERBOARD_TYPES.CONSUMPTION, period, limit);
  
  try {
    const cached = await get(LEADERBOARD_NAMESPACE, cacheKey);
    if (cached && isCacheValid(cached, period)) {
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
export async function getReferralEarningsLeaderboard(limit = 100, period = LEADERBOARD_PERIODS.ALL) {
  const cacheKey = getCacheKey(LEADERBOARD_TYPES.REFERRAL_EARNINGS, period, limit);
  
  try {
    const cached = await get(LEADERBOARD_NAMESPACE, cacheKey);
    if (cached && isCacheValid(cached, period)) {
      return cached.data;
    }
  } catch (error) {}

  try {
    // 使用现有的推荐排行榜函数
    const referralLeaderboard = getReferralLeaderboard(1000); // 获取更多数据以便筛选
    
    // 处理时间维度：筛选时间范围内的记录
    let filteredLeaderboard = referralLeaderboard;
    if (period !== LEADERBOARD_PERIODS.ALL) {
      const periodStart = getPeriodStartTimestamp(period);
      // 从referral数据中筛选时间范围内的记录
      // 注意：需要从referral.js中获取带时间戳的数据
      // 目前简化处理，后续需要完善
      filteredLeaderboard = referralLeaderboard; // 临时：保持原样
    }
    
    // 转换为统一格式
    const leaderboard = filteredLeaderboard.slice(0, limit).map(item => ({
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
export async function getHoldingTimeLeaderboard(limit = 100, period = LEADERBOARD_PERIODS.ALL) {
  const cacheKey = getCacheKey(LEADERBOARD_TYPES.HOLDING_TIME, period, limit);
  
  try {
    const cached = await get(LEADERBOARD_NAMESPACE, cacheKey);
    if (cached && isCacheValid(cached, period)) {
      return cached.data;
    }
  } catch (error) {}
  
  // 持币时间排行榜：日/周/月排行不适用（固定值）
  if (period !== LEADERBOARD_PERIODS.ALL) {
    const leaderboard = [];
    await put(LEADERBOARD_NAMESPACE, cacheKey, {
      data: leaderboard,
      timestamp: Date.now(),
    });
    return leaderboard;
  }

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
export async function getUserRanking(address, type, period = LEADERBOARD_PERIODS.ALL) {
  try {
    const leaderboard = await getLeaderboardByType(type, period, 1000); // 查询Top 1000以找到用户排名
    
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
export async function getLeaderboardByType(type, period, limit) {
  switch (type) {
    case LEADERBOARD_TYPES.BALANCE:
      return await getBalanceLeaderboard(limit, period);
    case LEADERBOARD_TYPES.TRANSACTIONS:
      return await getTransactionLeaderboard(limit, period);
    case LEADERBOARD_TYPES.JACKPOT_WINS:
      return await getJackpotWinLeaderboard(limit, period);
    case LEADERBOARD_TYPES.ASSET_VALUE:
      return await getAssetValueLeaderboard(limit, period);
    case LEADERBOARD_TYPES.TAX_PAID:
      return await getTaxPaidLeaderboard(limit, period);
    case LEADERBOARD_TYPES.CONSUMPTION:
      return await getConsumptionLeaderboard(limit, period);
    case LEADERBOARD_TYPES.REFERRAL_EARNINGS:
      return await getReferralEarningsLeaderboard(limit, period);
    case LEADERBOARD_TYPES.HOLDING_TIME:
      return await getHoldingTimeLeaderboard(limit, period);
    default:
      return [];
  }
}

/**
 * 获取当前快照数据（用于快照任务）
 */
export async function getCurrentSnapshotData() {
  // 获取所有排行榜类型的当前数据
  // 这里简化处理，实际应该获取所有用户的完整数据
  return {
    balance: await getBalanceLeaderboard(1000, LEADERBOARD_PERIODS.ALL),
    transactions: await getTransactionLeaderboard(1000, LEADERBOARD_PERIODS.ALL),
    // ... 其他类型
  };
}

/**
 * 查询奖池当前余额
 */
export async function getJackpotBalance() {
  try {
    if (!solanaBlockchainService.totProgram || !solanaBlockchainService.connection) {
      return null;
    }

    const programId = solanaBlockchainService.totProgramId;
    
    // 计算JackpotAccount的PDA地址
    const [jackpotPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('tot_jackpot')],
      programId
    );

    // 查询JackpotAccount
    const jackpotAccount = await solanaBlockchainService.totProgram.account.jackpotAccount.fetch(jackpotPda);
    
    // 获取代币账户余额
    const jackpotTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(config.TAI_ONE_TOKEN.MINT),
      jackpotPda
    );
    
    const tokenAccount = await getAccount(
      solanaBlockchainService.connection,
      jackpotTokenAccount
    );
    
    return {
      balance: Number(tokenAccount.amount),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('❌ 查询奖池余额失败:', error);
    return null;
  }
}

/**
 * 记录奖池余额历史
 */
export async function recordJackpotHistory() {
  const balanceData = await getJackpotBalance();
  if (!balanceData) {
    return;
  }

  const timestamp = balanceData.timestamp;
  const key = `history:${timestamp}`;
  
  await put(NAMESPACES.JACKPOT_HISTORY, key, {
    balance: balanceData.balance,
    timestamp,
  });
  
  console.log(`✅ 奖池余额已记录: ${balanceData.balance} TOT`);
}

/**
 * 获取奖池历史数据（用于K线图）
 */
export async function getJackpotHistory(limit = 100) {
  try {
    const allHistory = await getAll(NAMESPACES.JACKPOT_HISTORY);
    
    // 转换为K线图数据格式
    const history = allHistory
      .map(item => ({
        timestamp: item.value.timestamp,
        balance: item.value.balance,
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-limit); // 取最近N条
    
    // 转换为K线格式（open, high, low, close）
    // 由于是余额数据，我们使用余额作为close，并计算变化
    const klineData = history.map((item, index) => {
      const prevBalance = index > 0 ? history[index - 1].balance : item.balance;
      const change = item.balance - prevBalance;
      
      return {
        time: item.timestamp,
        timestamp: item.timestamp,
        open: prevBalance,
        high: Math.max(prevBalance, item.balance),
        low: Math.min(prevBalance, item.balance),
        close: item.balance,
        volume: Math.abs(change), // 使用变化量作为volume
      };
    });
    
    return klineData;
  } catch (error) {
    console.error('❌ 获取奖池历史失败:', error);
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
    // 更新所有时间维度的排行榜
    const periods = [LEADERBOARD_PERIODS.ALL, LEADERBOARD_PERIODS.DAY, LEADERBOARD_PERIODS.WEEK, LEADERBOARD_PERIODS.MONTH];
    const tasks = [];
    
    for (const period of periods) {
      tasks.push(
        getBalanceLeaderboard(1000, period),
        getTransactionLeaderboard(1000, period),
        getJackpotWinLeaderboard(1000, period),
        getAssetValueLeaderboard(1000, period),
        getTaxPaidLeaderboard(1000, period),
        getConsumptionLeaderboard(1000, period),
        getReferralEarningsLeaderboard(1000, period),
        getHoldingTimeLeaderboard(1000, period),
      );
    }
    
    await Promise.all(tasks);
    
    const duration = Date.now() - startTime;
    console.log(`✅ 排行榜缓存更新完成，耗时: ${duration}ms`);
  } catch (error) {
    console.error('❌ 更新排行榜缓存失败:', error);
  }
}
