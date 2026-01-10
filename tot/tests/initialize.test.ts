// ============================================
// 文件: tests/initialize.test.ts
// 初始化相关测试
// ============================================

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { 
  PublicKey, 
  Keypair, 
  SystemProgram,
} from "@solana/web3.js";
import { 
  TOKEN_2022_PROGRAM_ID,
  getMint,
} from "@solana/spl-token";
import { expect } from "chai";
import { setupTestContext, waitForConfirmation } from "./helpers/setup";
import { getConfigPda, getTaxConfigPda } from "./helpers/accounts";
import { 
  assertAccountExists, 
  assertBNEqual,
  assertPublicKeyEqual,
  assertError 
} from "./helpers/assertions";

describe("初始化测试", () => {
  let ctx: ReturnType<typeof setupTestContext>;
  let mintKeypair: Keypair;
  let configPda: PublicKey;
  let taxConfigPda: PublicKey;

  before(() => {
    ctx = setupTestContext();
    mintKeypair = Keypair.generate();
    
    [configPda] = getConfigPda(ctx.program.programId);
    [taxConfigPda] = getTaxConfigPda(ctx.program.programId);
  });

  describe("初始化TOT代币系统", () => {
    it("应该成功初始化系统", async () => {
      const tx = await ctx.program.methods
        .initialize({
          taxConfig: null,
          liquidityPool: null,
        })
        .accounts({
          authority: ctx.wallet.publicKey,
          mint: mintKeypair.publicKey,
          config: configPda,
          transferHookProgram: null,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([mintKeypair])
        .rpc();

      console.log("✅ 初始化交易签名:", tx);
      assertTransactionSuccess(tx);

      // 验证Mint账户
      const mintInfo = await getMint(
        ctx.connection,
        mintKeypair.publicKey,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      expect(mintInfo.decimals).to.equal(9);
      expect(mintInfo.supply.toString()).to.equal("0");

      // 验证配置账户存在
      const configAccount = await ctx.program.account.totConfig.fetch(configPda);
      assertAccountExists(configAccount);
      assertPublicKeyEqual(configAccount.authority, ctx.wallet.publicKey);
      assertPublicKeyEqual(configAccount.mint, mintKeypair.publicKey);
      expect(configAccount.totalMinted.toString()).to.equal("0");
      expect(configAccount.panicMode).to.be.false;
    });

    it("应该拒绝重复初始化", async () => {
      const newMintKeypair = Keypair.generate();
      
      try {
        await ctx.program.methods
          .initialize({
            taxConfig: null,
            liquidityPool: null,
          })
          .accounts({
            authority: ctx.wallet.publicKey,
            mint: newMintKeypair.publicKey,
            config: configPda,
            transferHookProgram: null,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([newMintKeypair])
          .rpc();
        
        expect.fail("应该抛出错误");
      } catch (error: any) {
        assertError(error, "AlreadyInitialized");
      }
    });
  });

  describe("初始化税率配置", () => {
    it("应该成功初始化税率配置", async () => {
      const tx = await ctx.program.methods
        .initializeTaxConfig()
        .accounts({
          authority: ctx.wallet.publicKey,
          config: configPda,
          taxConfig: taxConfigPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ 税率配置初始化交易签名:", tx);
      assertTransactionSuccess(tx);

      // 验证税率配置账户
      const taxConfig = await ctx.program.account.taxConfig.fetch(taxConfigPda);
      assertAccountExists(taxConfig);
      expect(taxConfig.baseTaxBps).to.equal(200); // 默认2%
      expect(taxConfig.enabled).to.be.true;
      expect(taxConfig.exemptAddresses.length).to.equal(0);
    });

    it("应该拒绝重复初始化税率配置", async () => {
      try {
        await ctx.program.methods
          .initializeTaxConfig()
          .accounts({
            authority: ctx.wallet.publicKey,
            config: configPda,
            taxConfig: taxConfigPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        
        expect.fail("应该抛出错误");
      } catch (error: any) {
        // 应该抛出账户已存在的错误
        expect(error.toString()).to.include("already in use");
      }
    });
  });
});

// 辅助函数
function assertTransactionSuccess(signature: string): void {
  expect(signature).to.be.a("string");
  expect(signature.length).to.be.greaterThan(0);
}
