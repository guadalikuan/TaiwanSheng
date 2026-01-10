// ============================================
// 文件: tests/pools.test.ts
// 池子管理测试
// ============================================

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { expect } from "chai";
import { setupTestContext } from "./helpers/setup";
import { 
  getConfigPda, 
  getPoolPda, 
  PoolType, 
  poolTypeToAnchor,
  getAllPoolPdas 
} from "./helpers/accounts";
import { 
  assertAccountExists, 
  assertBNEqual,
  assertError 
} from "./helpers/assertions";
import { getPoolConfig, getAllPoolConfigs, getPoolName } from "./fixtures/pools";

describe("池子管理测试", () => {
  let ctx: ReturnType<typeof setupTestContext>;
  let mintKeypair: anchor.web3.Keypair;
  let configPda: PublicKey;
  let mintPublicKey: PublicKey;

  before(async () => {
    ctx = setupTestContext();
    mintKeypair = anchor.web3.Keypair.generate();
    mintPublicKey = mintKeypair.publicKey;
    
    [configPda] = getConfigPda(ctx.program.programId);

    // 先初始化系统（如果还未初始化）
    try {
      await ctx.program.methods
        .initialize({
          taxConfig: null,
          liquidityPool: null,
        })
        .accounts({
          authority: ctx.wallet.publicKey,
          mint: mintPublicKey,
          config: configPda,
          transferHookProgram: null,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([mintKeypair])
        .rpc();
    } catch (error: any) {
      // 如果已初始化，忽略错误
      if (!error.toString().includes("already in use")) {
        throw error;
      }
    }
  });

  describe("初始化各个池子", () => {
    const poolTypes = [
      PoolType.VictoryFund,
      PoolType.HistoryLP,
      PoolType.CyberArmy,
      PoolType.GlobalAlliance,
      PoolType.AssetAnchor,
    ];

    poolTypes.forEach((poolType) => {
      it(`应该成功初始化${getPoolName(poolType)}池子`, async () => {
        const [poolPda] = getPoolPda(ctx.program.programId, poolType);
        const poolConfig = getPoolConfig(poolType);
        const poolTypeAnchor = poolTypeToAnchor(poolType);

        const tx = await ctx.program.methods
          .initPool(poolTypeAnchor)
          .accounts({
            authority: ctx.wallet.publicKey,
            config: configPda,
            mint: mintPublicKey,
            poolAccount: poolPda,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log(`✅ ${getPoolName(poolType)}池子初始化交易签名:`, tx);

        // 验证池子账户
        const poolAccount = await ctx.program.account.poolAccount.fetch(poolPda);
        assertAccountExists(poolAccount);
        assertBNEqual(poolAccount.initialAllocation, poolConfig.allocation);
        expect(poolAccount.releasedAmount.toString()).to.equal("0");
        expect(poolAccount.unlockTime.toString()).to.equal(poolConfig.unlockTime.toString());
        expect(poolAccount.requiresMultisig).to.equal(poolConfig.requiresMultisig);
      });
    });

    it("应该拒绝重复初始化同一个池子", async () => {
      const [poolPda] = getPoolPda(ctx.program.programId, PoolType.VictoryFund);
      const poolTypeAnchor = poolTypeToAnchor(PoolType.VictoryFund);

      try {
        await ctx.program.methods
          .initPool(poolTypeAnchor)
          .accounts({
            authority: ctx.wallet.publicKey,
            config: configPda,
            mint: mintPublicKey,
            poolAccount: poolPda,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        
        expect.fail("应该抛出错误");
      } catch (error: any) {
        expect(error.toString()).to.include("already in use");
      }
    });
  });

  describe("池子配置验证", () => {
    it("应该正确设置胜利日基金的解锁时间", async () => {
      const [poolPda] = getPoolPda(ctx.program.programId, PoolType.VictoryFund);
      const poolAccount = await ctx.program.account.poolAccount.fetch(poolPda);
      
      // 胜利日基金应该锁定至2027年1月1日
      expect(poolAccount.unlockTime.toString()).to.equal("1798761600");
    });

    it("应该正确设置认知作战池的线性释放", async () => {
      const [poolPda] = getPoolPda(ctx.program.programId, PoolType.CyberArmy);
      const poolAccount = await ctx.program.account.poolAccount.fetch(poolPda);
      
      // 认知作战池应该有365天的释放周期
      expect(poolAccount.vestingPeriod.toString()).to.equal((365 * 24 * 60 * 60).toString());
    });

    it("应该正确设置外资统战池的多签要求", async () => {
      const [poolPda] = getPoolPda(ctx.program.programId, PoolType.GlobalAlliance);
      const poolAccount = await ctx.program.account.poolAccount.fetch(poolPda);
      
      expect(poolAccount.requiresMultisig).to.be.true;
      expect(poolAccount.multisigThreshold).to.equal(3);
    });
  });
});
