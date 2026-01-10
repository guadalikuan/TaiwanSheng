// ============================================
// 文件: tests/tax.test.ts
// 税率管理测试
// ============================================

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import { setupTestContext } from "./helpers/setup";
import { getConfigPda, getTaxConfigPda } from "./helpers/accounts";
import { 
  assertAccountExists,
  assertError,
  assertValidTaxRate 
} from "./helpers/assertions";
import { createTestUser } from "./fixtures/users";

describe("税率管理测试", () => {
  let ctx: ReturnType<typeof setupTestContext>;
  let configPda: PublicKey;
  let taxConfigPda: PublicKey;

  before(async () => {
    ctx = setupTestContext();
    [configPda] = getConfigPda(ctx.program.programId);
    [taxConfigPda] = getTaxConfigPda(ctx.program.programId);

    // 确保税率配置已初始化
    try {
      await ctx.program.account.taxConfig.fetch(taxConfigPda);
    } catch (error: any) {
      // 如果未初始化，初始化它
      await ctx.program.methods
        .initializeTaxConfig()
        .accounts({
          authority: ctx.wallet.publicKey,
          config: configPda,
          taxConfig: taxConfigPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }
  });

  describe("更新税率配置", () => {
    it("应该成功更新基础税率", async () => {
      const newBaseTax = 300; // 3%

      const tx = await ctx.program.methods
        .updateTaxConfig(
          newBaseTax, // base_tax_bps
          null,       // alpha
          null,       // beta
          null,       // gamma_bps
          null,       // panic_threshold_bps
          null        // panic_tax_bps
        )
        .accounts({
          authority: ctx.wallet.publicKey,
          config: configPda,
          taxConfig: taxConfigPda,
        })
        .rpc();

      console.log("✅ 更新税率配置交易签名:", tx);

      // 验证更新
      const taxConfig = await ctx.program.account.taxConfig.fetch(taxConfigPda);
      expect(taxConfig.baseTaxBps).to.equal(newBaseTax);
      assertValidTaxRate(taxConfig.baseTaxBps);
    });

    it("应该成功更新所有税率参数", async () => {
      const tx = await ctx.program.methods
        .updateTaxConfig(
          250,  // base_tax_bps: 2.5%
          600,  // alpha: 6.0
          60,   // beta: 0.6
          2500, // gamma_bps: 25%
          60,   // panic_threshold_bps: 0.6%
          3500  // panic_tax_bps: 35%
        )
        .accounts({
          authority: ctx.wallet.publicKey,
          config: configPda,
          taxConfig: taxConfigPda,
        })
        .rpc();

      console.log("✅ 更新所有税率参数交易签名:", tx);

      // 验证更新
      const taxConfig = await ctx.program.account.taxConfig.fetch(taxConfigPda);
      expect(taxConfig.baseTaxBps).to.equal(250);
      expect(taxConfig.alpha.toString()).to.equal("600");
      expect(taxConfig.beta.toString()).to.equal("60");
      expect(taxConfig.gammaBps).to.equal(2500);
      expect(taxConfig.panicThresholdBps).to.equal(60);
      expect(taxConfig.panicTaxBps).to.equal(3500);
    });

    it("应该拒绝无效的税率（超过99%）", async () => {
      try {
        await ctx.program.methods
          .updateTaxConfig(
            10000, // 100%，超过最大允许值
            null, null, null, null, null
          )
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

    it("应该拒绝非管理员更新税率", async () => {
      const unauthorizedUser = createTestUser("Unauthorized");

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

  describe("免税地址管理", () => {
    let exemptAddress: PublicKey;

    before(() => {
      exemptAddress = Keypair.generate().publicKey;
    });

    it("应该成功添加免税地址", async () => {
      const tx = await ctx.program.methods
        .addTaxExempt(exemptAddress)
        .accounts({
          authority: ctx.wallet.publicKey,
          config: configPda,
          taxConfig: taxConfigPda,
        })
        .rpc();

      console.log("✅ 添加免税地址交易签名:", tx);

      // 验证免税地址已添加
      const taxConfig = await ctx.program.account.taxConfig.fetch(taxConfigPda);
      expect(taxConfig.exemptAddresses.length).to.be.greaterThan(0);
      expect(
        taxConfig.exemptAddresses.some(
          (addr: PublicKey) => addr.toString() === exemptAddress.toString()
        )
      ).to.be.true;
    });

    it("应该拒绝重复添加同一免税地址", async () => {
      try {
        await ctx.program.methods
          .addTaxExempt(exemptAddress)
          .accounts({
            authority: ctx.wallet.publicKey,
            config: configPda,
            taxConfig: taxConfigPda,
          })
          .rpc();
        
        expect.fail("应该抛出错误");
      } catch (error: any) {
        assertError(error, "AddressAlreadyExempt");
      }
    });

    it("应该成功移除免税地址", async () => {
      const tx = await ctx.program.methods
        .removeTaxExempt(exemptAddress)
        .accounts({
          authority: ctx.wallet.publicKey,
          config: configPda,
          taxConfig: taxConfigPda,
        })
        .rpc();

      console.log("✅ 移除免税地址交易签名:", tx);

      // 验证免税地址已移除
      const taxConfig = await ctx.program.account.taxConfig.fetch(taxConfigPda);
      expect(
        taxConfig.exemptAddresses.some(
          (addr: PublicKey) => addr.toString() === exemptAddress.toString()
        )
      ).to.be.false;
    });

    it("应该拒绝移除不存在的免税地址", async () => {
      const nonExemptAddress = Keypair.generate().publicKey;

      try {
        await ctx.program.methods
          .removeTaxExempt(nonExemptAddress)
          .accounts({
            authority: ctx.wallet.publicKey,
            config: configPda,
            taxConfig: taxConfigPda,
          })
          .rpc();
        
        expect.fail("应该抛出错误");
      } catch (error: any) {
        assertError(error, "AddressNotExempt");
      }
    });
  });
});
