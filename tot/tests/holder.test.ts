// ============================================
// 文件: tests/holder.test.ts
// 持有者管理测试
// ============================================

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import { setupTestContext } from "./helpers/setup";
import { getConfigPda, getHolderPda } from "./helpers/accounts";
import { 
  assertAccountExists,
  assertError 
} from "./helpers/assertions";
import { 
  createTestUser, 
  FreezeReason 
} from "./fixtures/users";

describe("持有者管理测试", () => {
  let ctx: ReturnType<typeof setupTestContext>;
  let configPda: PublicKey;
  let testUser: ReturnType<typeof createTestUser>;

  before(() => {
    ctx = setupTestContext();
    [configPda] = getConfigPda(ctx.program.programId);
    testUser = createTestUser("TestUser");
  });

  describe("初始化持有者", () => {
    it("应该成功初始化持有者账户", async () => {
      const [holderPda] = getHolderPda(ctx.program.programId, testUser.publicKey);

      const tx = await ctx.program.methods
        .initializeHolder()
        .accounts({
          payer: ctx.wallet.publicKey,
          holderWallet: testUser.publicKey,
          holderInfo: holderPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ 持有者初始化交易签名:", tx);

      // 验证持有者账户
      const holderAccount = await ctx.program.account.holderAccount.fetch(holderPda);
      assertAccountExists(holderAccount);
      expect(holderAccount.owner.toString()).to.equal(testUser.publicKey.toString());
      expect(holderAccount.totalBought.toString()).to.equal("0");
      expect(holderAccount.totalSold.toString()).to.equal("0");
      expect(holderAccount.isFrozen).to.be.false;
    });

    it("应该拒绝重复初始化同一持有者", async () => {
      const [holderPda] = getHolderPda(ctx.program.programId, testUser.publicKey);

      try {
        await ctx.program.methods
          .initializeHolder()
          .accounts({
            payer: ctx.wallet.publicKey,
            holderWallet: testUser.publicKey,
            holderInfo: holderPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        
        expect.fail("应该抛出错误");
      } catch (error: any) {
        expect(error.toString()).to.include("already in use");
      }
    });
  });

  describe("冻结和解冻持有者", () => {
    let frozenUser: ReturnType<typeof createTestUser>;
    let frozenHolderPda: PublicKey;

    before(async () => {
      frozenUser = createTestUser("FrozenUser");
      [frozenHolderPda] = getHolderPda(ctx.program.programId, frozenUser.publicKey);

      // 先初始化持有者
      try {
        await ctx.program.methods
          .initializeHolder()
          .accounts({
            payer: ctx.wallet.publicKey,
            holderWallet: frozenUser.publicKey,
            holderInfo: frozenHolderPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      } catch (error: any) {
        if (!error.toString().includes("already in use")) {
          throw error;
        }
      }
    });

    it("应该成功冻结持有者账户", async () => {
      const reasonCode = FreezeReason.Violation;

      const tx = await ctx.program.methods
        .freezeHolder(reasonCode)
        .accounts({
          authority: ctx.wallet.publicKey,
          holderInfo: frozenHolderPda,
          config: configPda,
        })
        .rpc();

      console.log("✅ 冻结交易签名:", tx);

      // 验证冻结状态
      const holderAccount = await ctx.program.account.holderAccount.fetch(frozenHolderPda);
      expect(holderAccount.isFrozen).to.be.true;
      expect(holderAccount.freezeReason).to.equal(reasonCode);
    });

    it("应该成功解冻持有者账户", async () => {
      const tx = await ctx.program.methods
        .unfreezeHolder()
        .accounts({
          authority: ctx.wallet.publicKey,
          holderInfo: frozenHolderPda,
          config: configPda,
        })
        .rpc();

      console.log("✅ 解冻交易签名:", tx);

      // 验证解冻状态
      const holderAccount = await ctx.program.account.holderAccount.fetch(frozenHolderPda);
      expect(holderAccount.isFrozen).to.be.false;
      expect(holderAccount.freezeReason).to.equal(0);
    });

    it("应该拒绝非管理员冻结账户", async () => {
      const unauthorizedUser = createTestUser("Unauthorized");
      const [unauthorizedHolderPda] = getHolderPda(ctx.program.programId, unauthorizedUser.publicKey);

      try {
        await ctx.program.methods
          .freezeHolder(FreezeReason.Violation)
          .accounts({
            authority: unauthorizedUser.publicKey,
            holderInfo: frozenHolderPda,
            config: configPda,
          })
          .signers([unauthorizedUser.keypair])
          .rpc();
        
        expect.fail("应该抛出错误");
      } catch (error: any) {
        assertError(error, "Unauthorized");
      }
    });
  });
});
