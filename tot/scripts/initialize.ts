// ============================================
// 文件: scripts/initialize.ts
// 初始化脚本 - 初始化TOT代币系统
// ============================================

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { 
    PublicKey, 
    Keypair, 
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
} from "@solana/web3.js";
import { 
    TOKEN_2022_PROGRAM_ID,
    getMint,
} from "@solana/spl-token";

/**
 * 初始化TOT代币系统
 * 
 * 步骤:
 * 1. 创建Mint账户密钥对
 * 2. 调用initialize指令创建Token-2022 Mint
 * 3. 初始化全局配置账户
 * 4. 初始化税率配置
 */
async function initialize() {
    console.log("🔧 开始初始化TOT代币系统...");

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.TotToken as Program<any>;
    const wallet = provider.wallet as anchor.Wallet;

    // 1. 创建Mint账户密钥对
    const mintKeypair = Keypair.generate();
    console.log(`📝 生成Mint密钥对: ${mintKeypair.publicKey.toString()}`);

    // 2. 调用initialize指令
    const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("tot_config")],
        program.programId
    );

    console.log(`📋 配置PDA: ${configPda.toString()}`);

    try {
        const tx = await program.methods
            .initialize({
                taxConfig: null,
                liquidityPool: null,
            })
            .accounts({
                authority: wallet.publicKey,
                mint: mintKeypair.publicKey,
                config: configPda,
                transferHookProgram: null,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .signers([mintKeypair])
            .rpc();

        console.log(`✅ 初始化交易签名: ${tx}`);
        console.log(`🔗 查看交易: https://solscan.io/tx/${tx}?cluster=devnet`);

        // 3. 验证Mint账户
        const mintInfo = await getMint(
            provider.connection,
            mintKeypair.publicKey,
            undefined,
            TOKEN_2022_PROGRAM_ID
        );

        console.log("✅ Mint账户创建成功");
        console.log(`   - 地址: ${mintKeypair.publicKey.toString()}`);
        console.log(`   - 精度: ${mintInfo.decimals}`);
        console.log(`   - 供应量: ${mintInfo.supply.toString()}`);

    } catch (error) {
        console.error("❌ 初始化失败:", error);
        throw error;
    }

    console.log("✅ TOT代币系统初始化完成！");
}

// 执行初始化
initialize().catch(console.error);
