// ============================================
// 文件: tests/helpers/assertions.ts
// 自定义断言函数
// ============================================

import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

/**
 * 断言两个PublicKey相等
 * 
 * @param actual 实际值
 * @param expected 期望值
 * @param message 错误消息
 */
export function assertPublicKeyEqual(
  actual: PublicKey,
  expected: PublicKey,
  message?: string
): void {
  expect(actual.toString(), message).to.equal(expected.toString());
}

/**
 * 断言BN值相等
 * 
 * @param actual 实际值
 * @param expected 期望值
 * @param message 错误消息
 */
export function assertBNEqual(
  actual: BN | number | string,
  expected: BN | number | string,
  message?: string
): void {
  const actualBN = new BN(actual);
  const expectedBN = new BN(expected);
  expect(actualBN.toString(), message).to.equal(expectedBN.toString());
}

/**
 * 断言BN值在范围内
 * 
 * @param value 实际值
 * @param min 最小值
 * @param max 最大值
 * @param message 错误消息
 */
export function assertBNInRange(
  value: BN | number | string,
  min: BN | number | string,
  max: BN | number | string,
  message?: string
): void {
  const valueBN = new BN(value);
  const minBN = new BN(min);
  const maxBN = new BN(max);
  
  expect(
    valueBN.gte(minBN) && valueBN.lte(maxBN),
    message || `Value ${valueBN.toString()} should be between ${minBN.toString()} and ${maxBN.toString()}`
  ).to.be.true;
}

/**
 * 断言账户存在
 * 
 * @param accountInfo 账户信息
 * @param message 错误消息
 */
export function assertAccountExists(
  accountInfo: any,
  message?: string
): void {
  expect(accountInfo, message || "Account should exist").to.not.be.null;
}

/**
 * 断言账户不存在
 * 
 * @param accountInfo 账户信息
 * @param message 错误消息
 */
export function assertAccountNotExists(
  accountInfo: any,
  message?: string
): void {
  expect(accountInfo, message || "Account should not exist").to.be.null;
}

/**
 * 断言余额大于等于指定值
 * 
 * @param actualBalance 实际余额
 * @param expectedMinBalance 期望最小余额
 * @param message 错误消息
 */
export function assertBalanceGte(
  actualBalance: number | BN,
  expectedMinBalance: number | BN,
  message?: string
): void {
  const actual = typeof actualBalance === "number" ? actualBalance : actualBalance.toNumber();
  const expected = typeof expectedMinBalance === "number" ? expectedMinBalance : expectedMinBalance.toNumber();
  expect(actual, message).to.be.at.least(expected);
}

/**
 * 断言余额等于指定值
 * 
 * @param actualBalance 实际余额
 * @param expectedBalance 期望余额
 * @param message 错误消息
 */
export function assertBalanceEqual(
  actualBalance: number | BN,
  expectedBalance: number | BN,
  message?: string
): void {
  const actual = typeof actualBalance === "number" ? actualBalance : actualBalance.toNumber();
  const expected = typeof expectedBalance === "number" ? expectedBalance : expectedBalance.toNumber();
  expect(actual, message).to.equal(expected);
}

/**
 * 断言错误类型
 * 
 * @param error 错误对象
 * @param expectedErrorName 期望的错误名称
 * @param message 错误消息
 */
export function assertError(
  error: any,
  expectedErrorName: string,
  message?: string
): void {
  expect(error, message).to.not.be.undefined;
  expect(error.error?.errorName || error.name || error.toString(), message).to.include(expectedErrorName);
}

/**
 * 断言交易成功
 * 
 * @param signature 交易签名
 * @param message 错误消息
 */
export function assertTransactionSuccess(
  signature: string,
  message?: string
): void {
  expect(signature, message || "Transaction should succeed").to.be.a("string");
  expect(signature.length, message || "Transaction signature should be valid").to.be.greaterThan(0);
}

/**
 * 断言税率在有效范围内（0-99%）
 * 
 * @param taxBps 税率（basis points）
 * @param message 错误消息
 */
export function assertValidTaxRate(
  taxBps: number,
  message?: string
): void {
  expect(taxBps, message || "Tax rate should be between 0 and 9900 bps").to.be.at.least(0);
  expect(taxBps, message || "Tax rate should be between 0 and 9900 bps").to.be.at.most(9900);
}

/**
 * 断言持有天数在合理范围内
 * 
 * @param holdingDays 持有天数
 * @param message 错误消息
 */
export function assertValidHoldingDays(
  holdingDays: number,
  message?: string
): void {
  expect(holdingDays, message || "Holding days should be non-negative").to.be.at.least(0);
  // 假设最大持有天数不超过10年
  expect(holdingDays, message || "Holding days should be reasonable").to.be.at.most(3650);
}

/**
 * 断言池子类型有效
 * 
 * @param poolType 池子类型
 * @param message 错误消息
 */
export function assertValidPoolType(
  poolType: number,
  message?: string
): void {
  expect(poolType, message || "Pool type should be between 0 and 4").to.be.at.least(0);
  expect(poolType, message || "Pool type should be between 0 and 4").to.be.at.most(4);
}
