// ============================================
// 文件: tests/fixtures/users.ts
// 用户测试数据工厂
// ============================================

import { Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

/**
 * 测试用户数据
 */
export interface TestUser {
  keypair: Keypair;
  publicKey: PublicKey;
  name: string;
}

/**
 * 创建测试用户
 * 
 * @param name 用户名称
 * @returns 测试用户
 */
export function createTestUser(name: string): TestUser {
  const keypair = Keypair.generate();
  return {
    keypair,
    publicKey: keypair.publicKey,
    name,
  };
}

/**
 * 创建多个测试用户
 * 
 * @param count 用户数量
 * @param prefix 名称前缀
 * @returns 测试用户数组
 */
export function createTestUsers(
  count: number,
  prefix: string = "User"
): TestUser[] {
  const users: TestUser[] = [];
  for (let i = 0; i < count; i++) {
    users.push(createTestUser(`${prefix}${i + 1}`));
  }
  return users;
}

/**
 * 持有时间测试场景
 */
export enum HoldingScenario {
  NewUser = 0,      // 新用户（0天）
  ShortTerm = 15,   // 短期持有（15天）
  MediumTerm = 60,  // 中期持有（60天）
  LongTerm = 180,   // 长期持有（180天）
  VeryLongTerm = 365, // 超长期持有（365天+）
}

/**
 * 获取持有时间场景的时间戳
 * 
 * @param scenario 持有场景
 * @param currentTime 当前时间戳（可选）
 * @returns 首次持有时间戳
 */
export function getHoldingScenarioTimestamp(
  scenario: HoldingScenario,
  currentTime?: number
): number {
  const now = currentTime || Math.floor(Date.now() / 1000);
  const daysAgo = scenario;
  return now - daysAgo * 24 * 60 * 60;
}

/**
 * 交易规模测试场景
 */
export enum TransactionSizeScenario {
  Small = 0,        // 小额交易（< 0.1% 总供应）
  Medium = 1,       // 中等交易（0.1% - 0.5%）
  Large = 2,        // 大额交易（0.5% - 1%）
  VeryLarge = 3,    // 超大交易（1% - 2%）
  Whale = 4,        // 巨鲸交易（> 2%）
}

/**
 * 获取交易规模场景的金额
 * 
 * @param scenario 交易规模场景
 * @param totalSupply 总供应量
 * @returns 交易金额
 */
export function getTransactionSizeAmount(
  scenario: TransactionSizeScenario,
  totalSupply: BN
): BN {
  // 计算不同规模的交易金额（基于总供应量的百分比）
  const percentages = [0.0005, 0.002, 0.007, 0.015, 0.025]; // 0.05%, 0.2%, 0.7%, 1.5%, 2.5%
  const percentage = percentages[scenario];
  
  return totalSupply.mul(new BN(Math.floor(percentage * 10000))).div(new BN(10000));
}

/**
 * 测试交易数据
 */
export interface TestTransaction {
  amount: BN;
  isBuy: boolean;
  isSell: boolean;
  expectedTaxRate?: number; // 期望税率（basis points，可选）
}

/**
 * 创建测试交易
 * 
 * @param amount 交易金额
 * @param isSell 是否为卖出
 * @returns 测试交易数据
 */
export function createTestTransaction(
  amount: BN,
  isSell: boolean = false
): TestTransaction {
  return {
    amount,
    isBuy: !isSell,
    isSell,
  };
}

/**
 * 创建不同场景的测试交易
 * 
 * @param totalSupply 总供应量
 * @param sizeScenario 交易规模场景
 * @param isSell 是否为卖出
 * @returns 测试交易数据
 */
export function createScenarioTransaction(
  totalSupply: BN,
  sizeScenario: TransactionSizeScenario,
  isSell: boolean = false
): TestTransaction {
  const amount = getTransactionSizeAmount(sizeScenario, totalSupply);
  return createTestTransaction(amount, isSell);
}

/**
 * 持有者统计测试数据
 */
export interface HolderStatsData {
  firstHoldTime: number;
  lastTransactionTime: number;
  totalBought: BN;
  totalSold: BN;
  totalTaxPaid: BN;
  isFrozen: boolean;
  freezeReason: number;
}

/**
 * 创建持有者统计测试数据
 * 
 * @param holdingDays 持有天数
 * @param totalBought 累计买入量
 * @param totalSold 累计卖出量
 * @param totalTaxPaid 累计缴税额
 * @returns 持有者统计数据
 */
export function createHolderStats(
  holdingDays: number,
  totalBought: BN = new BN(0),
  totalSold: BN = new BN(0),
  totalTaxPaid: BN = new BN(0)
): HolderStatsData {
  const now = Math.floor(Date.now() / 1000);
  const firstHoldTime = now - holdingDays * 24 * 60 * 60;
  
  return {
    firstHoldTime,
    lastTransactionTime: now,
    totalBought,
    totalSold,
    totalTaxPaid,
    isFrozen: false,
    freezeReason: 0,
  };
}

/**
 * 冻结原因代码
 */
export enum FreezeReason {
  None = 0,
  MoneyLaundering = 1,    // 洗钱嫌疑
  MaliciousShort = 2,     // 恶意做空
  Violation = 3,          // 违规交易
  Custom = 4,             // 自定义原因
}

/**
 * 创建冻结的持有者统计
 * 
 * @param holdingDays 持有天数
 * @param reason 冻结原因
 * @returns 持有者统计数据
 */
export function createFrozenHolderStats(
  holdingDays: number,
  reason: FreezeReason = FreezeReason.Violation
): HolderStatsData {
  const stats = createHolderStats(holdingDays);
  return {
    ...stats,
    isFrozen: true,
    freezeReason: reason,
  };
}
