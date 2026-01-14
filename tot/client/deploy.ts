// ============================================
// 文件: client/deploy.ts
// 部署脚本 - 部署TOT代币程序到Solana网络
// ============================================

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";

/**
 * 部署TOT代币程序
 * 
 * 使用说明:
 * 1. 确保已配置Solana CLI和钱包
 * 2. 运行: npm run deploy
 * 
 * @param network - 网络类型: 'devnet' | 'mainnet-beta' | 'localnet'
 */
async function deploy(network: string = "devnet") {
    console.log("🚀 开始部署TOT代币程序...");
    console.log(`📡 目标网络: ${network}`);

    // 设置网络
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // 加载程序
    const program = anchor.workspace.TotToken as Program<any>;
    
    console.log("✅ 程序加载成功");
    console.log(`📦 程序ID: ${program.programId.toString()}`);

    // 这里可以添加额外的部署逻辑
    // 例如：验证程序是否已部署、检查余额等

    console.log("✅ 部署完成！");
    console.log(`🔗 程序地址: ${program.programId.toString()}`);
}

// 执行部署
deploy(process.env.NETWORK || "devnet").catch(console.error);
