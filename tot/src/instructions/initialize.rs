//! # 初始化指令模块
//! 
//! 本模块实现了TOT代币系统的初始化功能，包括创建Token-2022 Mint账户
//! 并初始化所有扩展功能。这是部署TOT代币的第一步，也是最关键的一步。
//! 
//! ## 初始化流程
//! 
//! 1. 计算Mint账户所需空间（包含所有扩展）
//! 2. 创建Mint账户
//! 3. 初始化Transfer Fee扩展（交易税功能）
//! 4. 初始化Permanent Delegate扩展（永久代理权）
//! 5. 初始化Metadata Pointer扩展（可更新元数据）
//! 6. 初始化Transfer Hook扩展（自定义转账逻辑，已合并到主程序）
//! 7. 初始化Mint（设置精度、权限等）
//! 8. 初始化全局配置账户
//! 
//! ## 重要说明
//! 
//! - 初始化顺序很重要：必须先初始化扩展，再初始化Mint
//! - Mint账户必须作为Signer传入（因为需要创建它）
//! - 所有扩展初始化后，Mint账户的结构就固定了，无法更改
//! 
//! ============================================
// 文件: src/instructions/initialize.rs
// 初始化指令 - 创建Token-2022 Mint并初始化所有扩展
// ============================================

use anchor_lang::prelude::*;
use anchor_spl::token_interface::TokenInterface;
use solana_program::program::invoke;
use spl_token_2022::{
    extension::ExtensionType,
    state::Mint,
    instruction as token_2022_instruction,
};
use spl_token_2022::extension::transfer_fee::instruction::initialize_transfer_fee_config;
use spl_token_2022::extension::metadata_pointer::instruction::initialize as initialize_metadata_pointer;
use spl_token_2022::extension::transfer_hook::instruction::initialize as initialize_transfer_hook;

use crate::constants::*;
use crate::state::config::*;
use crate::errors::TotError;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut)]
    pub mint: Signer<'info>,
    
    pub transfer_hook_program: Option<UncheckedAccount<'info>>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + TotConfig::LEN,
        seeds = [seeds::CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, TotConfig>,
    
    /// Token-2022程序
    /// 
    /// 说明:
    /// - Solana的Token-2022程序ID
    /// - 用于创建和操作Token-2022代币
    /// - 与标准Token程序不同，支持扩展功能
    pub token_program: Interface<'info, TokenInterface>,
    
    pub system_program: Program<'info, System>,
    
    pub rent: Sysvar<'info, Rent>,
}

/// 初始化处理器
/// 
/// 这是TOT代币系统初始化的核心函数，负责创建Mint账户并配置所有扩展功能。
/// 
/// # 功能说明
/// 
/// 本函数按照特定顺序执行以下操作：
/// 
/// 1. **计算Mint账户空间**: 根据需要的扩展计算账户大小
/// 2. **创建Mint账户**: 使用系统程序创建账户
/// 3. **初始化扩展**: 按顺序初始化所有Token-2022扩展
/// 4. **初始化Mint**: 设置代币的基本参数
/// 5. **初始化配置**: 创建全局配置账户
/// 
/// # 参数
/// * `ctx` - 初始化上下文，包含所有必需的账户
/// * `params` - 初始化参数
///   - `tax_config`: 可选，税率配置账户地址
///   - `liquidity_pool`: 可选，流动性池地址
/// 
/// # 返回值
/// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
/// 
/// # 初始化顺序的重要性
/// 
/// Token-2022的扩展必须在Mint初始化之前配置，因为：
/// - 扩展会修改Mint账户的数据结构
/// - 一旦Mint初始化完成，扩展结构就固定了
/// - 错误的顺序会导致初始化失败
/// 
/// # 扩展说明
/// 
/// 1. **Transfer Fee**: 启用交易税功能，初始税率0.5%
/// 2. **Permanent Delegate**: 设置永久代理，管理员可强制转移/销毁
/// 3. **Metadata Pointer**: 设置元数据指针，允许更新元数据
/// 4. **Transfer Hook**: 设置转账钩子，实现自定义转账逻辑（可选）
/// 
/// # 错误处理
/// 
/// - 如果Mint账户已存在，会返回错误
/// - 如果空间计算失败，返回`TotError::InvalidMint`
/// - 如果扩展初始化失败，会回滚所有操作
/// 
/// # 使用示例
/// ```rust
/// // 在客户端调用
/// program.methods
///     .initialize({
///         taxConfig: null,
///         liquidityPool: null,
///     })
///     .accounts({
///         authority: deployer,
///         mint: mintKeypair.publicKey,
///         config: configPda,
///         tokenProgram: TOKEN_2022_PROGRAM_ID,
///         systemProgram: SystemProgram.programId,
///         rent: SYSVAR_RENT_PUBKEY,
///     })
///     // 注意：Transfer Hook已合并到主程序，主程序ID自动作为transfer hook program ID
///     .signers([mintKeypair])
///     .rpc();
/// ```
pub fn handler(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
    // 获取账户引用
    let authority = &ctx.accounts.authority;
    let mint = &ctx.accounts.mint;
    let config = &mut ctx.accounts.config;
    let token_program = &ctx.accounts.token_program;
    let system_program = &ctx.accounts.system_program;
    let rent = &ctx.accounts.rent;
    
    // Create local variables for keys to avoid temporary borrowing issues
    let authority_key = authority.key();
    let mint_key = mint.key();
    let token_program_key = token_program.key();
    let transfer_hook_program_id = ctx
        .accounts
        .transfer_hook_program
        .as_ref()
        .map(|a| a.key());
    
    let mut extensions = vec![
        ExtensionType::TransferFeeConfig,
        ExtensionType::PermanentDelegate,
        ExtensionType::MetadataPointer,
    ];
    if transfer_hook_program_id.is_some() {
        extensions.push(ExtensionType::TransferHook);
    }
    
    let mint_space = ExtensionType::try_calculate_account_len::<Mint>(&extensions)
        .map_err(|_| TotError::InvalidMint)?;
    
    let mint_rent = rent.minimum_balance(mint_space);
    
    anchor_lang::system_program::create_account(
        CpiContext::new(
            system_program.to_account_info(),
            anchor_lang::system_program::CreateAccount {
                from: authority.to_account_info(),
                to: mint.to_account_info(),
            },
        ),
        mint_rent,
        mint_space as u64,
        &token_program_key,
    )?;
    
    let initial_fee_basis_points: u16 = 50;
    let max_fee: u64 = u64::MAX;
    
    invoke(
        &initialize_transfer_fee_config(
            &token_program_key,
            &mint_key,
            Some(&authority_key),
            Some(&authority_key),
            initial_fee_basis_points,
            max_fee,
        )?,
        &[
            mint.to_account_info(),
        ],
    )?;
    
    invoke(
        &token_2022_instruction::initialize_permanent_delegate(
            &token_program_key,
            &mint_key,
            &authority_key,
        )?,
        &[
            mint.to_account_info(),
        ],
    )?;
    
    invoke(
        &initialize_metadata_pointer(
            &token_program_key,
            &mint_key,
            Some(authority_key),
            Some(mint_key),
        )?,
        &[
            mint.to_account_info(),
        ],
    )?;
    
    // ========================================
    // 步骤6: 初始化 Transfer Hook 扩展
    // ========================================
    // 
    // Transfer Hook扩展允许在每次转账时调用自定义程序。
    // 这是实现TOT动态税收系统的关键。
    // 
    // 配置说明:
    // - hook_authority: 可以更新Transfer Hook配置的权限（保留给管理员）
    // - hook_program_id: Transfer Hook程序的地址（使用主程序ID）
    // 
    // 注意:
    // - Transfer Hook已合并到主程序，主程序ID同时作为transfer hook program ID
    // - 主程序同时处理自己的指令和transfer hook的execute指令
    // - 在初始化时，主程序ID会自动设置为transfer hook program ID
    
    if let Some(transfer_hook_program_id) = transfer_hook_program_id.as_ref() {
        invoke(
            &initialize_transfer_hook(
                &token_program_key,
                &mint_key,
                Some(authority_key),
                Some(*transfer_hook_program_id),
            )?,
            &[
                mint.to_account_info(),
            ],
        )?;
    }
    
    invoke(
        &token_2022_instruction::initialize_mint2(
            &token_program_key,
            &mint_key,
            &authority_key,
            Some(&authority_key),
            TOKEN_DECIMALS,
        )?,
        &[
            mint.to_account_info(),
        ],
    )?;

    let clock = Clock::get()?;
    
    // 设置管理员地址
    config.authority = authority.key();
    
    // 设置Mint地址
    config.mint = mint.key();
    
    // 设置国库地址（初始为管理员地址，后续可以更改）
    config.treasury = authority.key();
    
    // 设置流动性池地址（如果提供，验证有效性；否则使用mint地址作为占位符）
    // 注意：占位符地址需要在后续使用时验证，不能直接使用
    if let Some(pool) = params.liquidity_pool {
        require!(
            pool != Pubkey::default(),
            TotError::InvalidInitParams
        );
        config.liquidity_pool = pool;
    } else {
        // 使用mint地址作为占位符，后续需要更新为实际地址
        // 在使用此地址前，必须验证它不是占位符
        config.liquidity_pool = mint.key();
    }
    
    // 设置税率配置地址（如果提供，验证有效性；否则使用mint地址作为占位符）
    // 注意：占位符地址需要在后续使用时验证，不能直接使用
    if let Some(tax_cfg) = params.tax_config {
        require!(
            tax_cfg != Pubkey::default(),
            TotError::InvalidInitParams
        );
        config.tax_config = tax_cfg;
    } else {
        // 使用mint地址作为占位符，后续需要更新为实际地址
        // 在使用此地址前，必须验证它不是占位符
        config.tax_config = mint.key();
    }
    
    // 设置TWS财库地址（初始为mint地址作为占位符，后续通过管理员指令设置）
    // 注意：占位符地址需要在后续使用时验证，不能直接使用
    config.tws_treasury = mint.key();
    
    // 初始化系统状态
    config.panic_mode = false;                    // 未启用恐慌模式
    config.initialized_at = clock.unix_timestamp; // 记录初始化时间
    config.total_minted = 0;                      // 尚未铸造任何代币
    config.total_burned = 0;                      // 尚未销毁任何代币
    config.total_tax_collected = 0;              // 尚未收取任何税收
    config.version = 1;                          // 初始版本为1
    
    // 输出初始化信息（用于调试和审计）
    msg!("TOT Token 初始化完成!");
    msg!("Mint: {}", mint.key());
    msg!("Authority: {}", authority.key());
    msg!("Config: {}", config.key());
    
    Ok(())
}
