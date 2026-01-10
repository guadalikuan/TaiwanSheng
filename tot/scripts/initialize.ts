//! # TOT代币系统初始化脚本
//! 
//! 本脚本用于初始化TOT代币系统，包括创建Token-2022 Mint账户、
//! 初始化所有扩展功能、创建全局配置账户等。
//! 
//! ## 使用说明
//! 
//! 1. 确保已配置Anchor环境（Anchor.toml）
//! 2. 确保钱包有足够的SOL支付账户创建费用
//! 3. 运行脚本: `anchor run initialize`
//! 
//! ## 初始化流程
//! 
//! 1. 创建Mint账户密钥对
//! 2. 调用initialize指令创建Token-2022 Mint并初始化所有扩展
//! 3. 创建全局配置账户
//! 4. 验证初始化结果
//! 
//! ============================================
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
 * 这是部署TOT代币的第一步，会创建Token-2022 Mint账户并初始化所有扩展功能。
 * 
 * ## 执行步骤
 * 
 * 1. **创建Mint账户密钥对**: 生成Mint账户的密钥对
 * 2. **调用initialize指令**: 创建Token-2022 Mint并初始化所有扩展
 *    - Transfer Fee扩展（交易税功能）
 *    - Permanent Delegate扩展（永久代理权）
 *    - Metadata Pointer扩展（可更新元数据）
 *    - Transfer Hook扩展（自定义转账逻辑，可选）
 * 3. **创建全局配置账户**: 初始化TotConfig账户
 * 4. **验证初始化结果**: 检查Mint账户是否正确创建
 * 
 * ## 注意事项
 * 
 * - Mint账户密钥对需要妥善保管（用于后续操作）
 * - 初始化需要足够的SOL支付账户创建费用
 * - 初始化只能执行一次，重复调用会失败
 * - 建议在devnet上先测试，再部署到mainnet
 * 
 * ## 后续步骤
 * 
 * 初始化完成后，需要：
 * 1. 调用`initialize_tax_config`初始化税率配置
 * 2. 调用`init_pool`初始化各个池子
 * 3. 调用`mint_to_pools`铸造代币到池子
 */
async function initialize() {
    console.log("🔧 开始初始化TOT代币系统...");

    // 获取Anchor提供者和程序实例
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.TotToken as Program<any>;
    const wallet = provider.wallet as anchor.Wallet;

    // ========================================
    // 步骤1: 创建Mint账户密钥对
    // ========================================
    // 
    // Mint账户需要作为Signer传入，因为我们需要创建它。
    // 密钥对需要妥善保管，用于后续的铸造等操作。
    
    const mintKeypair = Keypair.generate();
    console.log(`📝 生成Mint密钥对: ${mintKeypair.publicKey.toString()}`);
    console.log(`⚠️  请妥善保管Mint密钥对，用于后续操作！`);

    // ========================================
    // 步骤2: 计算配置账户PDA
    // ========================================
    // 
    // 配置账户使用PDA（程序派生地址），确保地址的确定性。
    
    const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("tot_config")],
        program.programId
    );

    console.log(`📋 配置PDA: ${configPda.toString()}`);

    // ========================================
    // 步骤3: 调用initialize指令
    // ========================================
    // 
    // 这会创建Token-2022 Mint账户并初始化所有扩展功能。
    
    try {
        const tx = await program.methods
            .initialize({
                taxConfig: null,      // 税率配置（可选，后续可设置）
                liquidityPool: null,  // 流动性池地址（可选，后续可设置）
            })
            .accounts({
                authority: wallet.publicKey,           // 管理员地址
                mint: mintKeypair.publicKey,           // Mint账户地址
                config: configPda,                     // 配置账户PDA
                transferHookProgram: null,             // Transfer Hook程序（可选）
                tokenProgram: TOKEN_2022_PROGRAM_ID,  // Token-2022程序ID
                systemProgram: SystemProgram.programId, // 系统程序ID
                rent: anchor.web3.SYSVAR_RENT_PUBKEY, // 租金Sysvar
            })
            .signers([mintKeypair])  // Mint密钥对需要签名
            .rpc();

        console.log(`✅ 初始化交易签名: ${tx}`);
        console.log(`🔗 查看交易: https://solscan.io/tx/${tx}?cluster=devnet`);

        // ========================================
        // 步骤4: 验证Mint账户
        // ========================================
        // 
        // 验证Mint账户是否正确创建，并显示基本信息。
        
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
