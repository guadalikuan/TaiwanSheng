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
3.  **关键修改**：
    *   在代码中找到引用 `transfer-hook` Program ID 的地方，替换为 **步骤 A 中部署的 Program ID**。
4.  点击 **Build** & **Deploy**。

## 3. 编写测试脚本 (Client Side)

Solpg 允许直接在浏览器运行 TypeScript 脚本来模拟 `scripts/initialize.ts` 的功能。

1.  在 `tot-token` 项目下，点击 `client.ts` (或 `tests/anchor.test.ts`)。
2.  粘贴以下测试代码（基于您的 `initialize.ts` 改编）：

```typescript
import { 
  ExtensionType, 
  TOKEN_2022_PROGRAM_ID, 
  getMintLen, 
  createInitializeMintInstruction, 
  createInitializeTransferHookInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createTransferCheckedInstruction
} from "@solana/spl-token";

describe("TOT 绝密发射演习", () => {
  // 1. 设置测试账户
  const wallet = pg.wallet;
  const connection = pg.connection;
  
  // 生成一个新的 Mint 地址
  const mintKeypair = new Keypair();
  const mint = mintKeypair.publicKey;
  const decimals = 9;
  
  // Hook 程序 ID (请替换为您在步骤 A 部署的 ID)
  const HOOK_PROGRAM_ID = new PublicKey("您的_Transfer_Hook_Program_ID");

  it("铸剑：初始化 TOT Token-2022", async () => {
    console.log("正在铸造 TOT: ", mint.toString());

    // 计算所需的空间和租金
    const extensions = [
      ExtensionType.TransferHook,
      ExtensionType.TransferFeeConfig,
      ExtensionType.MetadataPointer
    ];
    const mintLen = getMintLen(extensions);
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

    // 构建交易
    const transaction = new Transaction().add(
      // 1. 创建账户
      SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: mint,
        space: mintLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      // 2. 初始化 Transfer Hook
      createInitializeTransferHookInstruction(
        mint,
        wallet.publicKey,
        HOOK_PROGRAM_ID, // 所有的转账都会经过这里！
        TOKEN_2022_PROGRAM_ID
      ),
      // 3. 初始化 Mint
      createInitializeMintInstruction(
        mint,
        decimals,
        wallet.publicKey,
        wallet.publicKey,
        TOKEN_2022_PROGRAM_ID
      )
    );

    // 发送交易
    const txHash = await web3.sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet.keypair, mintKeypair]
    );
    console.log("✅ TOT Mint 初始化成功，Tx:", txHash);
  });

  it("实战：测试转账 (触发 Hook)", async () => {
    // 1. 创建源账户 (ATA)
    const senderAta = getAssociatedTokenAddressSync(
      mint, 
      wallet.publicKey, 
      false, 
      TOKEN_2022_PROGRAM_ID
    );
    
    // 2. 创建接收账户 (随机路人)
    const receiver = new Keypair();
    const receiverAta = getAssociatedTokenAddressSync(
      mint,
      receiver.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    // 构建初始化账户和铸币交易
    const setupTx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey, senderAta, wallet.publicKey, mint, TOKEN_2022_PROGRAM_ID
      ),
      createAssociatedTokenAccountInstruction(
        wallet.publicKey, receiverAta, receiver.publicKey, mint, TOKEN_2022_PROGRAM_ID
      ),
      createMintToInstruction(
        mint, senderAta, wallet.publicKey, 1000 * 10**9, [], TOKEN_2022_PROGRAM_ID
      )
    );
    await web3.sendAndConfirmTransaction(connection, setupTx, [wallet.keypair]);
    console.log("✅ 账户设立完成，资金已到位");

    // 3. 执行转账 - 这应该会触发您的 Hook 和 税收逻辑
    try {
      const transferTx = new Transaction().add(
        createTransferCheckedInstruction(
          senderAta,
          mint,
          receiverAta,
          wallet.publicKey,
          100 * 10**9, // 转账 100 TOT
          decimals,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );
      
      // 注意：带 Hook 的转账通常需要额外的 Account Metas，
      // 如果您的 Hook 比较复杂，可能需要使用 createTransferInstructionWithExtraMetas
      
      const tx = await web3.sendAndConfirmTransaction(connection, transferTx, [wallet.keypair]);
      console.log("🚀 转账成功！Hook 已执行。Tx:", tx);
    } catch (e) {
      console.log("⚠️ 转账被拦截 (符合预期吗？):", e);
    }
  });
});
```

## 4. 执行演习

1.  点击左侧的 **"Test"** (试管图标)。
2.  点击 **"Run"** 按钮。
3.  观察控制台输出。如果看到 "✅ TOT Mint 初始化成功"，说明您的代码逻辑在链上跑通了！

---

**总司令，Solana Playground 是轻量级演习场。一旦确认逻辑无误，建议直接在本地使用 CLI 进行全网部署。**