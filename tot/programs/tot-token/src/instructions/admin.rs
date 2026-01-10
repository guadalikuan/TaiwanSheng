// ============================================
// 文件: programs/tot-token/src/instructions/admin.rs
// 管理员操作指令
// ============================================

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    self, TokenAccount, TokenInterface, TransferChecked, Mint,
};

use crate::state::config::TotConfig;
use crate::constants::seeds;
use crate::errors::TotError;

/// 更新管理员
#[derive(Accounts)]
pub struct UpdateAuthority<'info> {
    #[account(
        constraint = authority.key() == config.authority @ TotError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [seeds::CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, TotConfig>,
}

/// 更新管理员处理器
pub fn update_authority_handler(
    ctx: Context<UpdateAuthority>,
    new_authority: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let old_authority = config.authority;
    
    require!(
        new_authority != Pubkey::default(),
        TotError::InvalidNewAuthority
    );
    
    config.authority = new_authority;

    msg!(
        "Authority updated from {} to {}",
        old_authority,
        new_authority
    );

    emit!(AuthorityUpdated {
        old_authority,
        new_authority,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// 暂停/恢复系统
#[derive(Accounts)]
pub struct SetPaused<'info> {
    #[account(
        constraint = authority.key() == config.authority @ TotError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [seeds::CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, TotConfig>,
}

/// 设置暂停状态处理器
pub fn set_paused_handler(
    ctx: Context<SetPaused>,
    paused: bool,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.panic_mode = paused;

    msg!("System paused status: {}", paused);

    emit!(SystemPausedEvent {
        paused,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// 紧急提取
#[derive(Accounts)]
pub struct EmergencyWithdraw<'info> {
    #[account(
        constraint = authority.key() == config.authority @ TotError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        seeds = [seeds::CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, TotConfig>,

    /// 源账户（池子）
    #[account(mut)]
    pub source_account: InterfaceAccount<'info, TokenAccount>,

    /// 目标账户
    #[account(mut)]
    pub destination_account: InterfaceAccount<'info, TokenAccount>,

    /// Mint
    pub mint: InterfaceAccount<'info, Mint>,

    /// Token 程序
    pub token_program: Interface<'info, TokenInterface>,
}

/// 紧急提取处理器
pub fn emergency_withdraw_handler(
    ctx: Context<EmergencyWithdraw>,
    amount: u64,
) -> Result<()> {
    // 紧急提取需要系统处于暂停状态
    require!(ctx.accounts.config.panic_mode, TotError::SystemNotPaused);

    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.source_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.destination_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        },
    );

    token_interface::transfer_checked(
        transfer_ctx,
        amount,
        ctx.accounts.mint.decimals,
    )?;

    msg!("Emergency withdrawal: {} tokens", amount);

    emit!(EmergencyWithdrawEvent {
        from: ctx.accounts.source_account.key(),
        to: ctx.accounts.destination_account.key(),
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// 管理员更新事件
#[event]
pub struct AuthorityUpdated {
    pub old_authority: Pubkey,
    pub new_authority: Pubkey,
    pub timestamp: i64,
}

/// 系统暂停事件
#[event]
pub struct SystemPausedEvent {
    pub paused: bool,
    pub timestamp: i64,
}

/// 紧急提取事件
#[event]
pub struct EmergencyWithdrawEvent {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
