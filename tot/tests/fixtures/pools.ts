// ============================================
// 文件: tests/fixtures/pools.ts
// 池子测试数据工厂
// ============================================

import { BN } from "@coral-xyz/anchor";
import { PoolType } from "../helpers/accounts";

/**
 * 池子分配常量（对应Rust中的allocation模块）
 * 单位：基础单位（已乘以10^9）
 */
export const POOL_ALLOCATIONS = {
  VICTORY_FUND: new BN("20270000000000000000"),    // 20.27B
  HISTORY_LP: new BN("19490000000000000000"),      // 19.49B
  CYBER_ARMY: new BN("14500000000000000000"),      // 14.50B
  GLOBAL_ALLIANCE: new BN("7040000000000000000"),  // 7.04B
  ASSET_ANCHOR: new BN("141400000000000000000"),   // 141.40B
};

/**
 * 总供应量
 */
export const TOTAL_SUPPLY = new BN("202700000000000000000"); // 202.7B

/**
 * 池子配置数据
 */
export interface PoolConfig {
  type: PoolType;
  allocation: BN;
  unlockTime: number; // Unix时间戳，0表示无时间锁
  vestingStart: number; // Unix时间戳，0表示无线性释放
  vestingPeriod: number; // 秒数，0表示一次性释放
  requiresMultisig: boolean;
  multisigThreshold: number;
}

/**
 * 获取池子配置
 * 
 * @param poolType 池子类型
 * @param currentTime 当前时间戳（可选，默认使用当前时间）
 * @returns 池子配置
 */
export function getPoolConfig(
  poolType: PoolType,
  currentTime?: number
): PoolConfig {
  const now = currentTime || Math.floor(Date.now() / 1000);
  
  switch (poolType) {
    case PoolType.VictoryFund:
      // 胜利日基金：锁定至2027年1月1日
      return {
        type: PoolType.VictoryFund,
        allocation: POOL_ALLOCATIONS.VICTORY_FUND,
        unlockTime: 1798761600, // 2027-01-01 00:00:00 UTC
        vestingStart: 0,
        vestingPeriod: 0, // 一次性释放
        requiresMultisig: false,
        multisigThreshold: 0,
      };
      
    case PoolType.HistoryLP:
      // 历史重铸池：立即可用
      return {
        type: PoolType.HistoryLP,
        allocation: POOL_ALLOCATIONS.HISTORY_LP,
        unlockTime: 0, // 无时间锁
        vestingStart: 0,
        vestingPeriod: 0, // 一次性释放
        requiresMultisig: false,
        multisigThreshold: 0,
      };
      
    case PoolType.CyberArmy:
      // 认知作战池：365天线性释放
      return {
        type: PoolType.CyberArmy,
        allocation: POOL_ALLOCATIONS.CYBER_ARMY,
        unlockTime: 0, // 无时间锁
        vestingStart: now, // 从当前时间开始
        vestingPeriod: 365 * 24 * 60 * 60, // 365天
        requiresMultisig: false,
        multisigThreshold: 0,
      };
      
    case PoolType.GlobalAlliance:
      // 外资统战池：需要多签控制
      return {
        type: PoolType.GlobalAlliance,
        allocation: POOL_ALLOCATIONS.GLOBAL_ALLIANCE,
        unlockTime: 0, // 无时间锁
        vestingStart: 0,
        vestingPeriod: 0, // 一次性释放
        requiresMultisig: true,
        multisigThreshold: 3, // 3-of-5多签
      };
      
    case PoolType.AssetAnchor:
      // 资产锚定池：RWA触发释放
      return {
        type: PoolType.AssetAnchor,
        allocation: POOL_ALLOCATIONS.ASSET_ANCHOR,
        unlockTime: 0, // 无时间锁（单向阀机制）
        vestingStart: 0,
        vestingPeriod: 0, // RWA触发释放
        requiresMultisig: false,
        multisigThreshold: 0,
      };
      
    default:
      throw new Error(`Unknown pool type: ${poolType}`);
  }
}

/**
 * 获取所有池子配置
 * 
 * @param currentTime 当前时间戳（可选）
 * @returns 所有池子配置数组
 */
export function getAllPoolConfigs(currentTime?: number): PoolConfig[] {
  return [
    getPoolConfig(PoolType.VictoryFund, currentTime),
    getPoolConfig(PoolType.HistoryLP, currentTime),
    getPoolConfig(PoolType.CyberArmy, currentTime),
    getPoolConfig(PoolType.GlobalAlliance, currentTime),
    getPoolConfig(PoolType.AssetAnchor, currentTime),
  ];
}

/**
 * 验证池子分配总和
 * 
 * @returns 是否等于总供应量
 */
export function validatePoolAllocations(): boolean {
  const sum = Object.values(POOL_ALLOCATIONS).reduce(
    (acc, val) => acc.add(val),
    new BN(0)
  );
  return sum.eq(TOTAL_SUPPLY);
}

/**
 * 获取池子名称
 * 
 * @param poolType 池子类型
 * @returns 池子名称
 */
export function getPoolName(poolType: PoolType): string {
  switch (poolType) {
    case PoolType.VictoryFund:
      return "VictoryFund";
    case PoolType.HistoryLP:
      return "HistoryLP";
    case PoolType.CyberArmy:
      return "CyberArmy";
    case PoolType.GlobalAlliance:
      return "GlobalAlliance";
    case PoolType.AssetAnchor:
      return "AssetAnchor";
    default:
      return "Unknown";
  }
}
