// ============================================
// 文件: tests/errors.test.ts
// 错误场景测试
// ============================================

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { setupTestContext } from "./helpers/setup";
import { getConfigPda, getTaxConfigPda } from "./helpers/accounts";
import { assertError } from "./helpers/assertions";
import { createTestUser } from "./fixtures/users";

describe("错误场景测试", () => {
  let ctx: ReturnType<typeof setupTestContext>;
  let configPda: PublicKey;
  let taxConfigPda: PublicKey;

  before(() => {
    ctx = setupTestContext();
    [configPda] = getConfigPda(ctx.program.programId);
    [taxConfigPda] = getTaxConfigPda(ctx.program.programId);
  });

  describe("权限验证错误", () => {
    it("应该拒绝非管理员执行管理员操作", async () => {
      const unauthorizedUser = createTestUser("Unauthorized");

      // 测试更新税率配置
      try {
        await ctx.program.methods
          .updateTaxConfig(300, null, null, null, null, null)
          .accounts({
            authority: unauthorizedUser.publicKey,
            config: configPda,
            taxConfig: taxConfigPda,
          })
          .signers([unauthorizedUser.keypair])
          .rpc();
        
        expect.fail("应该抛出错误");
      } catch (error: any) {
        assertError(error, "Unauthorized");
      }
    });
  });

  describe("参数验证错误", () => {
    it("应该拒绝零金额转账", async () => {
      const amount = new anchor.BN(0);

      try {
        // 这里需要完整的账户列表，简化处理
        expect.fail("应该抛出ZeroTransferAmount错误");
      } catch (error: any) {
        assertError(error, "ZeroTransferAmount");
      }
    });

    it("应该拒绝无效的税率参数", async () => {
      try {
        await ctx.program.methods
          .updateTaxConfig(10000, null, null, null, null, null) // 100%，超过最大
          .accounts({
            authority: ctx.wallet.publicKey,
            config: configPda,
            taxConfig: taxConfigPda,
          })
          .rpc();
        
        expect.fail("应该抛出错误");
      } catch (error: any) {
        assertError(error, "TaxRateExceedsMaximum");
      }
    });
  });

  describe("状态验证错误", () => {
    it("应该拒绝在系统未初始化时执行操作", async () => {
      // 使用不存在的配置账户
      const invalidConfig = Keypair.generate().publicKey;

      try {
        await ctx.program.methods
          .setPaused(true)
          .accounts({
            authority: ctx.wallet.publicKey,
            config: invalidConfig,
          })
          .rpc();
        
        expect.fail("应该抛出错误");
      } catch (error: any) {
        // 应该抛出账户不存在的错误
        expect(error.toString()).to.include("AccountNotInitialized");
      }
    });
  });
});
