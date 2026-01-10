//! # Transfer Hook 程序模块
//! 
//! 本模块实现了Token-2022的Transfer Hook扩展，在每次TOT代币转账时自动调用。
//! Hook程序可以验证转账合法性、更新统计信息、执行自定义逻辑等。
//! 
//! ## Transfer Hook 机制
//! 
//! Transfer Hook是Token-2022的强大功能，允许在每次转账时执行自定义程序：
//! - 在转账执行前验证
//! - 更新链上状态
//! - 记录统计信息
//! - 执行自定义业务逻辑
//! 
//! ## 执行流程
//! 
//! 1. 用户发起转账
//! 2. Token-2022程序检查是否配置了Transfer Hook
//! 3. 如果配置了，调用Hook程序的`execute`函数
//! 4. Hook程序验证和执行自定义逻辑
//! 5. 如果Hook成功，继续执行转账；如果失败，回滚转账
//! 
//! ============================================
// 文件: programs/transfer-hook/src/lib.rs
// Transfer Hook 程序入口
// ============================================

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

pub mod state;
pub mod errors;

use state::*;
use errors::*;

/// Transfer Hook程序ID
/// 注意：实际部署时需要替换为真实的程序ID
declare_id!("Hook111111111111111111111111111111111111111");

/// Transfer Hook 程序
/// 
/// 在每次TOT代币转账时被Token-2022程序自动调用，执行自定义验证和逻辑。
/// 
/// ## 主要功能
/// 
/// 1. **验证转账合法性**: 检查Mint地址、系统状态等
/// 2. **更新统计信息**: 记录转账次数、税收总额等
/// 3. **执行自定义逻辑**: 可以扩展更多功能
/// 
/// ## 注意事项
/// 
/// - Hook程序必须符合spl-transfer-hook-interface规范
/// - Hook执行失败会导致整个转账失败
/// - Hook应该尽量轻量，避免高gas消耗
#[program]
pub mod transfer_hook {
    use super::*;

    /// 初始化Hook配置
    /// 
    /// 创建Hook配置账户，设置TOT Mint地址和配置地址。
    /// 这是部署Hook程序后的第一步。
    /// 
    /// # 参数
    /// * `ctx` - 初始化上下文
    /// * `tot_mint` - TOT代币的Mint地址
    /// * `tot_config` - TOT全局配置账户地址
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())
    /// 
    /// # 功能
    /// - 创建Hook配置PDA账户
    /// - 设置管理员权限
    /// - 关联TOT Mint和配置账户
    /// - 初始化统计信息
    pub fn initialize(
        ctx: Context<InitializeHook>,
        tot_mint: Pubkey,
        tot_config: Pubkey,
    ) -> Result<()> {
        let hook_config = &mut ctx.accounts.hook_config;
        
        // 设置管理员
        hook_config.authority = ctx.accounts.authority.key();
        
        // 关联TOT Mint和配置
        hook_config.tot_mint = tot_mint;
        hook_config.tot_config = tot_config;
        
        // 初始化统计信息
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

    /// Transfer Hook执行入口
    /// 
    /// 这是Token-2022在每次转账时调用的核心函数。
    /// 必须符合spl-transfer-hook-interface规范。
    /// 
    /// # 参数
    /// * `ctx` - Hook执行上下文（由Token-2022程序自动传递）
    /// * `amount` - 转账金额
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败会导致转账回滚
    /// 
    /// # 执行流程
    /// 1. 检查Hook是否暂停
    /// 2. 验证Mint地址（确保是TOT代币）
    /// 3. 更新统计信息
    /// 4. 执行其他自定义逻辑（可扩展）
    /// 
    /// # 注意事项
    /// - 此函数由Token-2022程序调用，不是用户直接调用
    /// - 执行失败会导致整个转账失败
    /// - 应该尽量轻量，避免高gas消耗
    /// - 账户由Token-2022程序自动传递和验证
    pub fn execute(ctx: Context<TransferHookExecute>, amount: u64) -> Result<()> {
        let hook_config = &mut ctx.accounts.hook_config;
        
        // 检查Hook是否暂停
        // 如果暂停，拒绝所有转账
        require!(!hook_config.is_paused, TransferHookError::HookPaused);

        // 获取转账信息
        let source = &ctx.accounts.source_account;
        let destination = &ctx.accounts.destination_account;

        // 记录转账信息（用于调试和审计）
        msg!(
            "Transfer Hook: {} tokens from {} to {}",
            amount,
            source.key(),
            destination.key()
        );

        // 验证Mint地址
        // 确保这是TOT代币的转账，防止Hook被用于其他代币
        require!(
            ctx.accounts.mint.key() == hook_config.tot_mint,
            TransferHookError::InvalidMint
        );

        // 更新统计信息
        // 记录转账次数（用于分析和监控）
        hook_config.total_transfers = hook_config.total_transfers
            .checked_add(1)
            .ok_or(error!(TransferHookError::MathOverflow))?;

        msg!("Transfer Hook executed successfully");
        Ok(())
    }

    /// 暂停/恢复Hook
    /// 
    /// 管理员可以暂停或恢复Hook的执行。
    /// 暂停后，所有转账都会失败（因为Hook执行失败）。
    /// 
    /// # 参数
    /// * `ctx` - 管理员操作上下文
    /// * `paused` - 暂停状态（true=暂停，false=恢复）
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())
    /// 
    /// # 用途
    /// - 紧急情况下暂停所有转账
    /// - 系统维护时暂停
    /// - 升级Hook程序前暂停
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
