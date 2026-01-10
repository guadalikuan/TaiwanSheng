// ============================================
// 文件: tests/helpers/accounts.ts
// PDA计算和账户创建辅助函数
// ============================================

import { PublicKey, Keypair } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";

/**
 * 计算配置账户PDA
 * 
 * @param programId 程序ID
 * @returns [PDA地址, bump]
 */
export function getConfigPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("tot_config")],
    programId
  );
}

/**
 * 计算税率配置账户PDA
 * 
 * @param programId 程序ID
 * @returns [PDA地址, bump]
 */
export function getTaxConfigPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("tot_tax_config")],
    programId
  );
}

/**
 * 计算池子账户PDA
 * 
 * @param programId 程序ID
 * @param poolType 池子类型（0-4）
 * @returns [PDA地址, bump]
 */
export function getPoolPda(
  programId: PublicKey,
  poolType: number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("tot_pool"), Buffer.from([poolType])],
    programId
  );
}

/**
 * 计算持有者账户PDA
 * 
 * @param programId 程序ID
 * @param holderWallet 持有者钱包地址
 * @returns [PDA地址, bump]
 */
export function getHolderPda(
  programId: PublicKey,
  holderWallet: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("tot_holder"), holderWallet.toBuffer()],
    programId
  );
}

/**
 * 计算国库账户PDA（如果使用PDA作为国库）
 * 
 * @param programId 程序ID
 * @returns [PDA地址, bump]
 */
export function getTreasuryPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("tot_treasury")],
    programId
  );
}

/**
 * 获取关联代币账户地址（ATA）
 * 
 * @param mint 代币Mint地址
 * @param owner 所有者地址
 * @returns ATA地址
 */
export function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey
): PublicKey {
  return anchor.utils.token.associatedAddress({
    mint,
    owner,
  });
}

/**
 * 池子类型枚举（对应Rust中的PoolType）
 */
export enum PoolType {
  VictoryFund = 0,    // 胜利日基金
  HistoryLP = 1,      // 历史重铸池
  CyberArmy = 2,      // 认知作战池
  GlobalAlliance = 3, // 外资统战池
  AssetAnchor = 4,    // 资产锚定池
}

/**
 * 池子类型到Anchor格式的转换
 * 
 * @param poolType 池子类型枚举
 * @returns Anchor格式的池子类型对象
 */
export function poolTypeToAnchor(poolType: PoolType): any {
  switch (poolType) {
    case PoolType.VictoryFund:
      return { victoryFund: {} };
    case PoolType.HistoryLP:
      return { historyLp: {} };
    case PoolType.CyberArmy:
      return { cyberArmy: {} };
    case PoolType.GlobalAlliance:
      return { globalAlliance: {} };
    case PoolType.AssetAnchor:
      return { assetAnchor: {} };
    default:
      throw new Error(`Unknown pool type: ${poolType}`);
  }
}

/**
 * 获取所有池子PDA
 * 
 * @param programId 程序ID
 * @returns 所有池子的PDA数组
 */
export function getAllPoolPdas(programId: PublicKey): Array<[PublicKey, number]> {
  return [
    getPoolPda(programId, PoolType.VictoryFund),
    getPoolPda(programId, PoolType.HistoryLP),
    getPoolPda(programId, PoolType.CyberArmy),
    getPoolPda(programId, PoolType.GlobalAlliance),
    getPoolPda(programId, PoolType.AssetAnchor),
  ];
}

/**
 * 创建代币账户（如果不存在）
 * 
 * @param connection Solana连接
 * @param payer 支付者密钥对
 * @param mint Mint地址
 * @param owner 所有者地址
 * @returns ATA地址
 */
export async function createTokenAccountIfNeeded(
  connection: anchor.web3.Connection,
  payer: Keypair,
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> {
  const ata = getAssociatedTokenAddress(mint, owner);
  
  // 检查账户是否已存在
  const accountInfo = await connection.getAccountInfo(ata);
  if (accountInfo === null) {
    // 创建ATA
    const tx = new anchor.web3.Transaction().add(
      anchor.utils.token.createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ata,
        owner,
        mint,
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    await anchor.web3.sendAndConfirmTransaction(connection, tx, [payer]);
  }
  
  return ata;
}

/**
 * 获取所有测试所需的账户地址
 * 
 * @param programId 程序ID
 * @param mint Mint地址
 * @param authority 管理员地址
 * @returns 所有账户地址的映射
 */
export function getAllTestAccounts(
  programId: PublicKey,
  mint: PublicKey,
  authority: PublicKey
): {
  config: PublicKey;
  taxConfig: PublicKey;
  pools: Array<{ type: PoolType; pda: PublicKey }>;
  treasury: PublicKey;
} {
  const [configPda] = getConfigPda(programId);
  const [taxConfigPda] = getTaxConfigPda(programId);
  const [treasuryPda] = getTreasuryPda(programId);
  
  const pools = getAllPoolPdas(programId).map(([pda], index) => ({
    type: index as PoolType,
    pda,
  }));
  
  return {
    config: configPda,
    taxConfig: taxConfigPda,
    pools,
    treasury: treasuryPda,
  };
}
