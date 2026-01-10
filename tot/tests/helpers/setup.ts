// ============================================
// 文件: tests/helpers/setup.ts
// 测试环境设置辅助工具
// ============================================

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

/**
 * 测试环境配置
 */
export interface TestContext {
  provider: AnchorProvider;
  program: Program<any>;
  wallet: Wallet;
  connection: Connection;
}

/**
 * 初始化测试环境
 * 
 * 设置Anchor提供者、程序实例和钱包
 * 
 * @returns 测试上下文
 */
export function setupTestContext(): TestContext {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TotToken as Program<any>;
  const wallet = provider.wallet as anchor.Wallet;
  const connection = provider.connection;

  return {
    provider,
    program,
    wallet,
    connection,
  };
}

/**
 * 等待确认
 * 
 * 等待交易被确认
 * 
 * @param connection Solana连接
 * @param signature 交易签名
 * @param confirmations 确认数（默认1）
 */
export async function waitForConfirmation(
  connection: Connection,
  signature: string,
  confirmations: number = 1
): Promise<void> {
  const latestBlockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    "confirmed"
  );
}

/**
 * 获取当前时间戳
 * 
 * @returns Unix时间戳（秒）
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * 计算未来时间戳
 * 
 * @param daysFromNow 从当前时间起的天数
 * @returns Unix时间戳（秒）
 */
export function getFutureTimestamp(daysFromNow: number): number {
  return getCurrentTimestamp() + daysFromNow * 24 * 60 * 60;
}

/**
 * 计算过去时间戳
 * 
 * @param daysAgo 从当前时间往前推的天数
 * @returns Unix时间戳（秒）
 */
export function getPastTimestamp(daysAgo: number): number {
  return getCurrentTimestamp() - daysAgo * 24 * 60 * 60;
}

/**
 * 等待指定秒数
 * 
 * @param seconds 等待的秒数
 */
export function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

/**
 * 生成测试用的密钥对
 * 
 * @returns 新的密钥对
 */
export function generateTestKeypair(): Keypair {
  return Keypair.generate();
}

/**
 * 获取测试账户的余额
 * 
 * @param connection Solana连接
 * @param publicKey 账户公钥
 * @returns 账户余额（lamports）
 */
export async function getBalance(
  connection: Connection,
  publicKey: PublicKey
): Promise<number> {
  return await connection.getBalance(publicKey);
}

/**
 * 检查账户是否存在
 * 
 * @param connection Solana连接
 * @param publicKey 账户公钥
 * @returns 账户是否存在
 */
export async function accountExists(
  connection: Connection,
  publicKey: PublicKey
): Promise<boolean> {
  const accountInfo = await connection.getAccountInfo(publicKey);
  return accountInfo !== null;
}
