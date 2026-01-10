// ============================================
// 文件: programs/transfer-hook/src/lib.rs
// Transfer Hook 程序入口
// ============================================

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

pub mod state;
pub mod errors;

use state::*;
use errors::*;

declare_id!("Hook111111111111111111111111111111111111111");

/// Transfer Hook 程序
/// 
/// 在每次 TOT 代币转账时被调用，执行：
/// 1. 验证转账合法性
/// 2. 更新持有者信息
/// 3. 记录转账统计
#[program]
pub mod transfer_hook {
    use super::*;

    /// 初始化 Hook 配置
    pub fn initialize(
        ctx: Context<InitializeHook>,
        tot_mint: Pubkey,
        tot_config: Pubkey,
    ) -> Result<()> {
        let hook_config = &mut ctx.accounts.hook_config;
        hook_config.authority = ctx.accounts.authority.key();
        hook_config.tot_mint = tot_mint;
        hook_config.tot_config = tot_config;
        hook_config.total_transfers = 0;
        hook_config.total_tax_collected = 0;
        hook_config.total_burned = 0;
        hook_config.is_paused = false;
        hook_config.bump = ctx.bumps.hook_config;

        msg!("Transfer Hook initialized");
        msg!("TOT Mint: {}", tot_mint);
        msg!("TOT Config: {}", tot_config);
        Ok(())
    }

    /// Transfer Hook 执行入口
    /// 
    /// 这是 Token-2022 在每次转账时调用的函数
    /// 必须符合 spl-transfer-hook-interface 规范
    pub fn execute(ctx: Context<TransferHookExecute>, amount: u64) -> Result<()> {
        let hook_config = &mut ctx.accounts.hook_config;
        
        // 检查是否暂停
        require!(!hook_config.is_paused, TransferHookError::HookPaused);

        // 获取转账信息
        let source = &ctx.accounts.source_account;
        let destination = &ctx.accounts.destination_account;

        msg!(
            "Transfer Hook: {} tokens from {} to {}",
            amount,
            source.key(),
            destination.key()
        );

        // 验证Mint地址
        require!(
            ctx.accounts.mint.key() == hook_config.tot_mint,
            TransferHookError::InvalidMint
        );

        // 更新统计
        hook_config.total_transfers = hook_config.total_transfers
            .checked_add(1)
            .ok_or(error!(TransferHookError::MathOverflow))?;

        msg!("Transfer Hook executed successfully");
        Ok(())
    }

    /// 暂停/恢复 Hook
    pub fn set_paused(ctx: Context<AdminAction>, paused: bool) -> Result<()> {
        let hook_config = &mut ctx.accounts.hook_config;
        hook_config.is_paused = paused;
        
        msg!("Hook paused status: {}", paused);
        Ok(())
    }
}

/// 初始化 Hook 配置的账户
#[derive(Accounts)]
pub struct InitializeHook<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + HookConfig::LEN,
        seeds = [b"hook-config"],
        bump
    )]
    pub hook_config: Account<'info, HookConfig>,

    pub system_program: Program<'info, System>,
}

/// Transfer Hook 执行的账户
/// 
/// 这些账户由 Token-2022 程序自动传递
#[derive(Accounts)]
pub struct TransferHookExecute<'info> {
    /// 源代币账户
    #[account()]
    pub source_account: InterfaceAccount<'info, TokenAccount>,

    /// 目标代币账户
    #[account()]
    pub destination_account: InterfaceAccount<'info, TokenAccount>,

    /// 源账户所有者/授权者
    /// CHECK: 由Token-2022程序验证
    pub source_authority: AccountInfo<'info>,

    /// Mint 账户
    #[account()]
    pub mint: InterfaceAccount<'info, Mint>,

    /// Hook 配置
    #[account(
        mut,
        seeds = [b"hook-config"],
        bump = hook_config.bump
    )]
    pub hook_config: Account<'info, HookConfig>,
}

/// 管理员操作账户
#[derive(Accounts)]
pub struct AdminAction<'info> {
    #[account(
        constraint = authority.key() == hook_config.authority @ TransferHookError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"hook-config"],
        bump = hook_config.bump
    )]
    pub hook_config: Account<'info, HookConfig>,
}
