import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint } from "@solana/spl-token";

// 预设市场数据 (取前5个作为示例)
const MARKETS = [
  { id: 1, question: "明日 12:00-14:00，桃园/新竹地区是否会发生突发性跳电？", endTime: "2025-05-21" },
  { id: 2, question: "台北全联超市明日 18:00 前，普通白蛋是否会售罄？", endTime: "2025-05-21" },
  { id: 3, question: "明日台积电（2330）外资是净买入还是净卖出？", endTime: "2025-05-21" },
  { id: 4, question: "未来 24 小时内，花莲海域是否会发生里氏 4.5 级以上地震？", endTime: "2025-05-21" },
  { id: 5, question: "明日下午，高雄市中心积水深度是否超过 10 厘米？", endTime: "2025-05-21" }
];

async function main() {
  // 1. 设置 Provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // 注意：在运行此脚本前，请确保已运行 `anchor build` 生成 IDL 和 Types
  // 如果没有 Types，可以使用以下方式加载 IDL
  // const idl = require("../target/idl/prediction_market.json");
  // const program = new anchor.Program(idl, "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS", provider);
  
  const program = anchor.workspace.PredictionMarket as Program<any>;

  console.log("🚀 开始部署预测市场合约...");
  console.log("Wallet:", provider.wallet.publicKey.toString());

  // 2. 创建测试代币 (TWSCoin Mock)
  // 在实际部署中，这里应该是真实的 TWSCoin Mint Address
  console.log("Creating Mock TWSCoin...");
  const mint = await createMint(
    provider.connection,
    (provider.wallet as any).payer, // Payer
    provider.wallet.publicKey, // Mint Authority
    null, // Freeze Authority
    6 // Decimals
  );
  console.log("Mock TWSCoin Mint:", mint.toString());

  // 3. 初始化市场
  for (const m of MARKETS) {
    const endTimestamp = new Date(m.endTime).getTime() / 1000;
    
    // 生成 PDA
    const [marketPda, marketBump] = await PublicKey.findProgramAddress(
      [Buffer.from("market"), Buffer.from(m.question)],
      program.programId
    );

    const [vaultPda, vaultBump] = await PublicKey.findProgramAddress(
      [Buffer.from("vault"), marketPda.toBuffer()],
      program.programId
    );

    console.log(`\n初始化市场 ID ${m.id}: ${m.question}`);
    console.log(`Market PDA: ${marketPda.toString()}`);

    try {
      await program.methods
        .initializeMarket(m.question, new anchor.BN(endTimestamp))
        .accounts({
          market: marketPda,
          marketVault: vaultPda,
          tokenMint: mint,
          authority: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      
      console.log("✅ 市场初始化成功！");
    } catch (err) {
      console.error("❌ 市场初始化失败:", err);
    }
  }

  console.log("\n🎉 部署脚本执行完成！");
  console.log("下一步：");
  console.log("1. 运行 `anchor test` 进行完整测试");
  console.log("2. 将生成的 Mint Address 和 Market PDAs 更新到前端配置中");
}

main().then(
  () => process.exit(),
  (err) => {
    console.error(err);
    process.exit(-1);
  }
);
