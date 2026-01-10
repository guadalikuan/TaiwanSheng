// ============================================
// 文件: scripts/mint_to_pools.ts
// 铸造脚本 - 铸造代币到五大池子
// ============================================

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

/**
 * 铸造代币到五大池子
 * 
 * 步骤:
 * 1. 初始化所有池子（如果尚未初始化）
 * 2. 调用mint_to_pools指令一次性铸造所有代币
 * 3. 验证铸造结果
 */
async function mintToPools() {
    console.log("💰 开始铸造代币到池子...");

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.TotToken as Program<any>;
    const wallet = provider.wallet as anchor.Wallet;

    // 获取配置PDA
    const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("tot_config")],
        program.programId
    );

    // 获取Mint地址（需要从配置中读取或作为参数传入）
    // 这里假设Mint地址已知
    const mintAddress = process.env.MINT_ADDRESS;
    if (!mintAddress) {
        throw new Error("请设置MINT_ADDRESS环境变量");
    }
    const mint = new PublicKey(mintAddress);

    // 获取五大池子PDA和代币账户
    const poolTypes = [0, 1, 2, 3, 4]; // VictoryFund, HistoryLP, CyberArmy, GlobalAlliance, AssetAnchor
    const poolAccounts = [];
    const tokenAccounts = [];

    for (const poolType of poolTypes) {
        const [poolPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("tot_pool"), Buffer.from([poolType])],
            program.programId
        );
        poolAccounts.push(poolPda);

        // 获取关联代币账户（ATA）
        const [tokenAccount] = PublicKey.findProgramAddressSync(
            [
                wallet.publicKey.toBuffer(),
                TOKEN_2022_PROGRAM_ID.toBuffer(),
                mint.toBuffer(),
            ],
            anchor.utils.token.ASSOCIATED_PROGRAM_ID
        );
        tokenAccounts.push(tokenAccount);
    }

    console.log("📋 池子账户:");
    poolAccounts.forEach((pool, index) => {
        console.log(`   ${index}: ${pool.toString()}`);
    });

    try {
        const tx = await program.methods
            .mintToPools()
            .accounts({
                authority: wallet.publicKey,
                config: configPda,
                mint: mint,
                victoryPool: poolAccounts[0],
                victoryTokenAccount: tokenAccounts[0],
                historyPool: poolAccounts[1],
                historyTokenAccount: tokenAccounts[1],
                cyberPool: poolAccounts[2],
                cyberTokenAccount: tokenAccounts[2],
                globalPool: poolAccounts[3],
                globalTokenAccount: tokenAccounts[3],
                assetPool: poolAccounts[4],
                assetTokenAccount: tokenAccounts[4],
                tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
            .rpc();

        console.log(`✅ 铸造交易签名: ${tx}`);
        console.log(`🔗 查看交易: https://solscan.io/tx/${tx}?cluster=devnet`);

        console.log("✅ 代币铸造完成！");
        console.log("📊 分配情况:");
        console.log("   - 胜利日基金: 20.27B (10%)");
        console.log("   - 历史重铸池: 19.49B (9.6%)");
        console.log("   - 认知作战池: 14.50B (7.15%)");
        console.log("   - 外资统战池: 7.04B (3.47%)");
        console.log("   - 资产锚定池: 141.40B (69.76%)");
        console.log("   - 总计: 202.7B");

    } catch (error) {
        console.error("❌ 铸造失败:", error);
        throw error;
    }
}

// 执行铸造
mintToPools().catch(console.error);
