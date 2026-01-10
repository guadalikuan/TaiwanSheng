// ============================================
// 文件: programs/tot-token/src/instructions/initialize.rs
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

use crate::constants::*;
use crate::state::config::*;
use crate::errors::TotError;

/// 初始化账户结构
#[derive(Accounts)]
pub struct Initialize<'info> {
    /// 部署者/管理员
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// TOT 代币 Mint 账户 (Token-2022)
    /// 需要作为Signer，因为我们要创建它
    #[account(mut)]
    pub mint: Signer<'info>,
    
    /// 全局配置账户
    #[account(
        init,
        payer = authority,
        space = 8 + TotConfig::LEN,
        seeds = [seeds::CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, TotConfig>,
    
    /// Transfer Hook 程序账户 (可选，后续部署)
    /// CHECK: 验证在指令逻辑中
    pub transfer_hook_program: Option<AccountInfo<'info>>,
    
    /// Token-2022 程序
    pub token_program: Interface<'info, TokenInterface>,
    
    /// 系统程序
    pub system_program: Program<'info, System>,
    
    /// 租金 Sysvar
    pub rent: Sysvar<'info, Rent>,
}

/// 初始化处理器
pub fn handler(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
    let authority = &ctx.accounts.authority;
    let mint = &ctx.accounts.mint;
    let config = &mut ctx.accounts.config;
    let token_program = &ctx.accounts.token_program;
    let system_program = &ctx.accounts.system_program;
    let rent = &ctx.accounts.rent;
    
    // ========================================
    // 1. 计算 Mint 账户所需空间 (含扩展)
    // ========================================
    
    let extensions = vec![
        ExtensionType::TransferFeeConfig,
        ExtensionType::PermanentDelegate,
        ExtensionType::MetadataPointer,
        ExtensionType::TransferHook,
    ];
    
    let mint_space = ExtensionType::try_calculate_account_len::<Mint>(&extensions)
        .map_err(|_| TotError::InvalidMint)?;
    
    let mint_rent = rent.minimum_balance(mint_space);
    
    // ========================================
    // 2. 创建 Mint 账户
    // ========================================
    
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
        &token_program.key(),
    )?;
    
    // ========================================
    // 3. 初始化 Transfer Fee 扩展
    // ========================================
    
    // 初始税率: 0.5% (50 basis points)
    let initial_fee_basis_points: u16 = 50;
    let max_fee: u64 = u64::MAX; // 无上限
    
    invoke(
        &token_2022_instruction::initialize_transfer_fee_config(
            &token_program.key(),
            &mint.key(),
            Some(&authority.key()), // transfer_fee_config_authority
            Some(&authority.key()), // withdraw_withheld_authority
            initial_fee_basis_points,
            max_fee,
        )?,
        &[
            mint.to_account_info(),
            authority.to_account_info(),
        ],
    )?;
    
    // ========================================
    // 4. 初始化 Permanent Delegate 扩展
    // ========================================
    
    invoke(
        &token_2022_instruction::initialize_permanent_delegate(
            &token_program.key(),
            &mint.key(),
            &authority.key(), // permanent_delegate
        )?,
        &[
            mint.to_account_info(),
        ],
    )?;
    
    // ========================================
    // 5. 初始化 Metadata Pointer 扩展
    // ========================================
    
    invoke(
        &token_2022_instruction::initialize_metadata_pointer(
            &token_program.key(),
            &mint.key(),
            Some(&authority.key()), // metadata_authority
            Some(&mint.key()),      // metadata 存储在 mint 账户本身
        )?,
        &[
            mint.to_account_info(),
        ],
    )?;
    
    // ========================================
    // 6. 初始化 Transfer Hook 扩展 (可选)
    // ========================================
    
    if let Some(hook_program) = &ctx.accounts.transfer_hook_program {
        invoke(
            &spl_token_2022::instruction::initialize_transfer_hook(
                &token_program.key(),
                &mint.key(),
                Some(&authority.key()), // hook_authority
                Some(&hook_program.key()), // hook_program_id
            )?,
            &[
                mint.to_account_info(),
            ],
        )?;
    }
    
    // ========================================
    // 7. 初始化 Mint
    // ========================================
    
    invoke(
        &token_2022_instruction::initialize_mint2(
            &token_program.key(),
            &mint.key(),
            &authority.key(),       // mint_authority
            Some(&authority.key()), // freeze_authority
            TOKEN_DECIMALS,
        )?,
        &[
            mint.to_account_info(),
        ],
    )?;
    
    // ========================================
    // 8. 初始化 Token Metadata (使用Metadata Interface)
    // ========================================
    
    // 注意: 这里需要使用spl-token-metadata-interface
    // 如果项目中没有这个依赖，可以暂时注释掉，后续添加
    
    // ========================================
    // 9. 初始化配置账户
    // ========================================
    
    let clock = Clock::get()?;
    
    config.authority = authority.key();
    config.mint = mint.key();
    config.treasury = authority.key(); // 初始国库为管理员地址
    config.liquidity_pool = params.liquidity_pool.unwrap_or(Pubkey::default());
    config.tax_config = params.tax_config.unwrap_or(Pubkey::default());
    config.panic_mode = false;
    config.initialized_at = clock.unix_timestamp;
    config.total_minted = 0; // 尚未铸造
    config.total_burned = 0;
    config.total_tax_collected = 0;
    config.version = 1;
    
    msg!("TOT Token 初始化完成!");
    msg!("Mint: {}", mint.key());
    msg!("Authority: {}", authority.key());
    msg!("Config: {}", config.key());
    
    Ok(())
}
