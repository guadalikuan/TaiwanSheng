# 🛡️ 兵易·TOT - Solana Playground 演习手册

本手册指导如何在 [Solana Playground](https://beta.solpg.io/) 上部署和测试 TOT (TaiOneToken) 及其 Transfer Hook 机制。

## 1. 环境准备

1.  打开 **[Solana Playground](https://beta.solpg.io/)**。
2.  点击左下角的 **"Not connected"**，选择 **"Create a new wallet"** (或导入测试钱包)。
3.  点击 **"Settings"** (齿轮图标)，将 **Endpoint** 设置为 **Devnet**。
4.  点击 **"Airdrop"** 领取测试 SOL (建议领取 5-10 SOL，Token-2022 部署较贵)。

## 2. 导入代码

由于 Solpg 不支持直接上传整个文件夹，我们需要手动创建核心文件。

### A. 创建 Transfer Hook 程序 (核心武器)
1.  在左侧文件栏，点击 **"+" (Create Project)**。
2.  命名为 `transfer-hook`，选择 **Anchor (Rust)** 模板。
3.  打开 `src/lib.rs`，将您本地 `d:\三大赛\李宽TWS\TaiwanSheng\tot\programs\transfer-hook\src\lib.rs` 的内容复制进去。
    *   *注意：如果本地有多个 .rs 文件，建议先在本地将其逻辑合并到一个 lib.rs 中，或在 Solpg 中创建对应的模块文件。*
4.  点击 **Build** 按钮。
5.  构建成功后，点击 **Deploy**。
6.  **记录下 Program ID** (控制台会显示，或者在左侧 "Program ID" 处查看)。

### B. 创建 TOT Token 程序 (主控端)
1.  再次创建新项目，命名为 `tot-token`。
2.  将 `d:\三大赛\李宽TWS\TaiwanSheng\tot\programs\tot-token\src\lib.rs` (及相关模块) 的内容复制进去。
    *   *提示：请务必使用本地最新修复后的代码（已解决 IDL 过大导致的构建错误）。*
3.  **同步 Program ID**：
    *   点击 **Build** & **Deploy**。
    *   部署成功后，Solpg 会自动分配一个 Program ID。
    *   **重要**：将此 ID 复制，回填到 `src/lib.rs` 的 `declare_id!("...")` 中。
    *   再次点击 **Build** & **Deploy** 确保代码中的 ID 与链上一致。

## 3. 编写测试脚本 (Client Side)

Solpg 允许直接在浏览器运行 TypeScript 脚本来模拟 `scripts/initialize.ts` 的功能。

1.  在对应项目下，点击 `client.ts` (或 `tests/anchor.test.ts`)。
2.  分别粘贴并运行下面的测试代码。

### A. transfer-hook 项目测试脚本

```typescript
const { Keypair, PublicKey, SystemProgram } = web3;

describe("transfer-hook：功能自检", () => {
  const program = pg.program;
  const wallet = pg.wallet;

  it("initialize + setPaused", async () => {
    const hookConfigPda = PublicKey.findProgramAddressSync(
      [Buffer.from("hook-config")],
      program.programId
    )[0];

    await program.methods
      .initialize(Keypair.generate().publicKey, Keypair.generate().publicKey)
      .accounts({
        authority: wallet.publicKey,
        hookConfig: hookConfigPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .setPaused(true)
      .accounts({
        authority: wallet.publicKey,
        hookConfig: hookConfigPda,
      })
      .rpc();

    await program.methods
      .setPaused(false)
      .accounts({
        authority: wallet.publicKey,
        hookConfig: hookConfigPda,
      })
      .rpc();
  });
});
```

### B. tot-token 项目测试脚本

```typescript
import * as anchor from "@coral-xyz/anchor";
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createBurnCheckedInstruction,
  getAccount,
} from "@solana/spl-token";

const { Keypair, PublicKey, Transaction, SystemProgram, ComputeBudgetProgram } = web3;

describe("tot-token：全指令演习", () => {
  const program = pg.program;
  const wallet = pg.wallet;
  const connection = pg.connection;

  const mintKeypair = new Keypair();
  let mint = mintKeypair.publicKey;

  const configPda = PublicKey.findProgramAddressSync(
    [Buffer.from("tot_config")],
    program.programId
  )[0];
  const taxConfigPda = PublicKey.findProgramAddressSync(
    [Buffer.from("tot_tax_config")],
    program.programId
  )[0];

  const senderHolderPda = PublicKey.findProgramAddressSync(
    [Buffer.from("tot_holder"), wallet.publicKey.toBuffer()],
    program.programId
  )[0];

  const poolPdas = {
    victory: PublicKey.findProgramAddressSync(
      [Buffer.from("tot_pool"), Buffer.from([0])],
      program.programId
    )[0],
    history: PublicKey.findProgramAddressSync(
      [Buffer.from("tot_pool"), Buffer.from([1])],
      program.programId
    )[0],
    cyber: PublicKey.findProgramAddressSync(
      [Buffer.from("tot_pool"), Buffer.from([2])],
      program.programId
    )[0],
    global: PublicKey.findProgramAddressSync(
      [Buffer.from("tot_pool"), Buffer.from([3])],
      program.programId
    )[0],
    asset: PublicKey.findProgramAddressSync(
      [Buffer.from("tot_pool"), Buffer.from([4])],
      program.programId
    )[0],
  };

  const receiver = Keypair.generate();
  const getPoolTokenAccount = (poolPda: PublicKey) =>
    getAssociatedTokenAddressSync(
      mint,
      poolPda,
      true,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

  const getSenderAta = () =>
    getAssociatedTokenAddressSync(
      mint,
      wallet.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

  const getReceiverAta = () =>
    getAssociatedTokenAddressSync(
      mint,
      receiver.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

  const DECIMALS = 6;
  const CU_IX = ComputeBudgetProgram.setComputeUnitLimit({ units: 1_200_000 });

  async function ensureInitialized() {
    const configInfo = await connection.getAccountInfo(configPda);
    if (!configInfo) {
      await program.methods
        .initialize({
          taxConfig: null,
          liquidityPool: null,
        })
        .preInstructions([CU_IX])
        .accounts({
          authority: wallet.publicKey,
          mint,
          config: configPda,
          transferHookProgram: null,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([mintKeypair])
        .rpc();
    }

    const config = await program.account.totConfig.fetch(configPda);
    if (!config.authority.equals(wallet.publicKey)) {
      throw new Error(`config.authority 不匹配：${config.authority.toString()}`);
    }
    mint = config.mint;
  }

  async function ensureTaxConfigInitialized() {
    const taxInfo = await connection.getAccountInfo(taxConfigPda);
    if (taxInfo) return;
    await program.methods
      .initializeTaxConfig()
      .preInstructions([CU_IX])
      .accounts({
        authority: wallet.publicKey,
        config: configPda,
        taxConfig: taxConfigPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  before(async () => {
    await ensureInitialized();
    await ensureTaxConfigInitialized();
  });

  async function ensureAta(ata: PublicKey, owner: PublicKey) {
    const info = await connection.getAccountInfo(ata);
    if (info) return;
    const tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        ata,
        owner,
        mint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    await web3.sendAndConfirmTransaction(connection, tx, [wallet.keypair]);
  }

  async function burnAllIfExists(tokenAccount: PublicKey, owner: Keypair) {
    const info = await connection.getAccountInfo(tokenAccount);
    if (!info) return;
    const acc = await getAccount(connection, tokenAccount, undefined, TOKEN_2022_PROGRAM_ID);
    if (acc.amount === 0n) return;
    const tx = new Transaction().add(
      createBurnCheckedInstruction(
        tokenAccount,
        mint,
        owner.publicKey,
        acc.amount,
        DECIMALS,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );
    tx.feePayer = wallet.publicKey;
    const signers = owner.publicKey.equals(wallet.publicKey)
      ? [wallet.keypair]
      : [wallet.keypair, owner];
    await web3.sendAndConfirmTransaction(connection, tx, signers);
  }

  it("initialize + initializeTaxConfig", async () => {
    await ensureInitialized();
    await ensureTaxConfigInitialized();
  });

  it("initializeHolder + transferWithTax + getHolderStats + calculateTax", async () => {
    const senderAta = getSenderAta();
    const receiverAta = getReceiverAta();
    await ensureAta(senderAta, wallet.publicKey);
    await ensureAta(receiverAta, receiver.publicKey);

    const setupTx = new Transaction().add(
      createMintToInstruction(
        mint,
        senderAta,
        wallet.publicKey,
        1_000_000_000,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );
    await web3.sendAndConfirmTransaction(connection, setupTx, [wallet.keypair]);

    try {
      await program.methods
        .initializeHolder()
        .accounts({
          payer: wallet.publicKey,
          holderWallet: wallet.publicKey,
          holderInfo: senderHolderPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch (_) {}

    await program.methods
      .transferWithTax(new anchor.BN(100_000_000), false)
      .accounts({
        sender: wallet.publicKey,
        senderTokenAccount: senderAta,
        receiverTokenAccount: receiverAta,
        mint,
        config: configPda,
        taxConfig: taxConfigPda,
        senderHolderInfo: senderHolderPda,
        receiverHolderInfo: null,
        taxCollector: receiverAta,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();

    await program.methods
      .getHolderStats()
      .accounts({
        holderInfo: senderHolderPda,
      })
      .view();

    await program.methods
      .calculateTax(new anchor.BN(100_000_000), false, true)
      .accounts({
        user: wallet.publicKey,
        config: configPda,
        taxConfig: taxConfigPda,
        mint,
        holderInfo: senderHolderPda,
      })
      .view();

    await burnAllIfExists(senderAta, wallet.keypair);
    await burnAllIfExists(receiverAta, receiver);
  });

  it("setPaused + emergencyWithdraw + updateAuthority", async () => {
    const senderAta = getSenderAta();
    const receiverAta = getReceiverAta();
    await ensureAta(senderAta, wallet.publicKey);
    await ensureAta(receiverAta, receiver.publicKey);

    await program.methods
      .setPaused(true)
      .accounts({
        authority: wallet.publicKey,
        config: configPda,
      })
      .rpc();

    const mintTx = new Transaction().add(
      createMintToInstruction(
        mint,
        senderAta,
        wallet.publicKey,
        200_000_000,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );
    await web3.sendAndConfirmTransaction(connection, mintTx, [wallet.keypair]);

    await program.methods
      .emergencyWithdraw(new anchor.BN(100_000_000))
      .accounts({
        authority: wallet.publicKey,
        config: configPda,
        sourceAccount: senderAta,
        destinationAccount: receiverAta,
        mint,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();

    await program.methods
      .setPaused(false)
      .accounts({
        authority: wallet.publicKey,
        config: configPda,
      })
      .rpc();

    await program.methods
      .updateAuthority(wallet.publicKey)
      .accounts({
        authority: wallet.publicKey,
        config: configPda,
      })
      .rpc();

    await burnAllIfExists(senderAta, wallet.keypair);
    await burnAllIfExists(receiverAta, receiver);
  });

  it("updateTaxConfig + addTaxExempt + removeTaxExempt", async () => {
    await program.methods
      .updateTaxConfig(300, null, null, null, null, null)
      .accounts({
        authority: wallet.publicKey,
        config: configPda,
        taxConfig: taxConfigPda,
      })
      .rpc();

    await program.methods
      .addTaxExempt(receiver.publicKey)
      .accounts({
        authority: wallet.publicKey,
        config: configPda,
        taxConfig: taxConfigPda,
      })
      .rpc();

    await program.methods
      .removeTaxExempt(receiver.publicKey)
      .accounts({
        authority: wallet.publicKey,
        config: configPda,
        taxConfig: taxConfigPda,
      })
      .rpc();
  });

  it("initPool x5 + mintToPools", async () => {
    const initPoolIfNeeded = async (poolAccount: PublicKey, poolTokenAccount: PublicKey, poolType: any) => {
      const poolInfo = await connection.getAccountInfo(poolAccount);
      if (poolInfo) return;
      await program.methods
        .initPool(poolType)
        .preInstructions([CU_IX])
        .accounts({
          authority: wallet.publicKey,
          config: configPda,
          mint,
          poolAccount,
          poolTokenAccount,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    };

    await initPoolIfNeeded(poolPdas.victory, getPoolTokenAccount(poolPdas.victory), { victoryFund: {} });
    await initPoolIfNeeded(poolPdas.history, getPoolTokenAccount(poolPdas.history), { historyLp: {} });
    await initPoolIfNeeded(poolPdas.cyber, getPoolTokenAccount(poolPdas.cyber), { cyberArmy: {} });
    await initPoolIfNeeded(poolPdas.global, getPoolTokenAccount(poolPdas.global), { globalAlliance: {} });
    await initPoolIfNeeded(poolPdas.asset, getPoolTokenAccount(poolPdas.asset), { assetAnchor: {} });

    const config = await program.account.totConfig.fetch(configPda);
    if (config.totalMinted.gt(new anchor.BN(0))) return;

    await program.methods
      .mintToPools()
      .preInstructions([CU_IX])
      .accounts({
        authority: wallet.publicKey,
        config: configPda,
        mint,
        victoryPool: poolPdas.victory,
        victoryTokenAccount: getPoolTokenAccount(poolPdas.victory),
        historyPool: poolPdas.history,
        historyTokenAccount: getPoolTokenAccount(poolPdas.history),
        cyberPool: poolPdas.cyber,
        cyberTokenAccount: getPoolTokenAccount(poolPdas.cyber),
        globalPool: poolPdas.global,
        globalTokenAccount: getPoolTokenAccount(poolPdas.global),
        assetPool: poolPdas.asset,
        assetTokenAccount: getPoolTokenAccount(poolPdas.asset),
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();
  });
});
```

## 4. 执行演习

1.  点击左侧的 **"Test"** (试管图标)。
2.  点击 **"Run"** 按钮。
3.  观察控制台输出：全部用例通过即表示链上逻辑跑通。

---

**总司令，Solana Playground 是轻量级演习场。一旦确认逻辑无误，建议直接在本地使用 CLI 进行全网部署。**
