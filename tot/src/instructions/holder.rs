// ============================================
// 文件: src/instructions/holder.rs
// 持有者管理指令
// ============================================

use anchor_lang::prelude::*;
use crate::state::config::TotConfig;
use crate::state::holder::HolderAccount;
use crate::constants::seeds;
use crate::errors::TotError;
use crate::utils::validation::validate_freeze_reason;

/// 初始化持有者信息
/// 当用户首次接收 TOT 代币时调用
#[derive(Accounts)]
pub struct InitializeHolder<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// 持有者钱包
    /// CHECK: 任何有效的钱包地址
    pub holder_wallet: AccountInfo<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + HolderAccount::LEN,
        seeds = [seeds::HOLDER_SEED, holder_wallet.key().as_ref()],
        bump
    )]
    pub holder_info: Account<'info, HolderAccount>,

    pub system_program: Program<'info, System>,
}

/// 初始化持有者处理器
pub fn initialize_holder_handler(ctx: Context<InitializeHolder>) -> Result<()> {
    let holder_info = &mut ctx.accounts.holder_info;
    let clock = Clock::get()?;

    holder_info.owner = ctx.accounts.holder_wallet.key();
    // token_account初始化为default，在用户首次接收代币时自动设置
    // 注意：由于transfer.rs中接收者持有者账户是Option类型，且没有自动初始化机制，
    // 当前设计允许token_account在初始化时为空，后续在首次接收代币时设置。
    // 如果需要在初始化时设置，需要在transfer指令中添加自动初始化逻辑。
    holder_info.token_account = Pubkey::default();
    holder_info.first_hold_time = clock.unix_timestamp;
    holder_info.last_transaction_time = clock.unix_timestamp;
    holder_info.weighted_hold_days = 0;
    holder_info.total_bought = 0;
    holder_info.total_sold = 0;
    holder_info.total_tax_paid = 0;
    holder_info.is_frozen = false;
    holder_info.freeze_reason = 0;
    holder_info.bump = ctx.bumps.holder_info;

    msg!("Holder info initialized for: {}", holder_info.owner);
    Ok(())
}

/// 冻结持有者账户
#[derive(Accounts)]
pub struct FreezeHolder<'info> {
    #[account(
        constraint = authority.key() == config.authority @ TotError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [seeds::HOLDER_SEED, holder_info.owner.as_ref()],
        bump = holder_info.bump
    )]
    pub holder_info: Account<'info, HolderAccount>,

    #[account(
        seeds = [seeds::CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, TotConfig>,
}

/// 冻结持有者处理器
pub fn freeze_holder_handler(
    ctx: Context<FreezeHolder>,
    reason_code: u8,
) -> Result<()> {
    let holder_info = &mut ctx.accounts.holder_info;
    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;
    
    require!(!holder_info.is_frozen, TotError::HolderFrozen);
    
    holder_info.is_frozen = true;
    holder_info.freeze_reason = reason_code;

    msg!("Account frozen: {} - Reason code: {}", holder_info.owner, reason_code);
    
    emit!(AccountFrozen {
        holder: holder_info.owner,
        reason_code,
        timestamp,
    });

    Ok(())
}

/// 解冻持有者账户
#[derive(Accounts)]
pub struct UnfreezeHolder<'info> {
    #[account(
        constraint = authority.key() == config.authority @ TotError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [seeds::HOLDER_SEED, holder_info.owner.as_ref()],
        bump = holder_info.bump
    )]
    pub holder_info: Account<'info, HolderAccount>,

    #[account(
        seeds = [seeds::CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, TotConfig>,
}

/// 解冻持有者处理器
pub fn unfreeze_holder_handler(ctx: Context<UnfreezeHolder>) -> Result<()> {
    let holder_info = &mut ctx.accounts.holder_info;
    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;
    
    require!(holder_info.is_frozen, TotError::HolderNotFrozen);
    
    holder_info.is_frozen = false;
    holder_info.freeze_reason = 0;

    msg!("Account unfrozen: {}", holder_info.owner);
    
    emit!(AccountUnfrozen {
        holder: holder_info.owner,
        timestamp,
    });

    Ok(())
}

/// 账户冻结事件
#[event]
pub struct AccountFrozen {
    pub holder: Pubkey,
    pub reason_code: u8,
    pub timestamp: i64,
}

/// 账户解冻事件
#[event]
pub struct AccountUnfrozen {
    pub holder: Pubkey,
    pub timestamp: i64,
}
