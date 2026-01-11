// ============================================
// 文件: src/instructions/platform_transfer.rs
// 平台向用户免税转账指令
// ============================================

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    self, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::state::config::TotConfig;
use crate::state::holder::HolderAccount;
use crate::constants::seeds;
use crate::errors::TotError;
use crate::utils::validation::validate_transfer_amount;

/// 平台转账账户结构
#[derive(Accounts)]
pub struct PlatformTransfer<'info> {
    /// 平台钱包（签名者，需要验证权限）
    #[account(
        mut,
        constraint = platform.key() == config.authority @ TotError::Unauthorized
    )]
    pub platform: Signer<'info>,

    /// 平台代币账户
    #[account(
        mut,
        constraint = platform_token_account.owner == platform.key() @ TotError::InvalidOwner,
        constraint = platform_token_account.mint == mint.key() @ TotError::InvalidMint
    )]
    pub platform_token_account: InterfaceAccount<'info, TokenAccount>,

    /// 用户代币账户
    #[account(
        mut,
        constraint = user_token_account.mint == mint.key() @ TotError::InvalidMint
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    /// TOT Mint
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,

    /// 全局配置
    #[account(
        seeds = [seeds::CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, TotConfig>,

    /// 用户持有者信息（可选，如果不存在则不需要）
    /// CHECK: 如果不存在，需要先初始化
    pub user_holder_info: Option<Account<'info, HolderAccount>>,

    /// Token 程序
    pub token_program: Interface<'info, TokenInterface>,
}

/// 平台转账处理器
/// 
/// 这是平台向用户转账的核心功能，实现免税转账机制。
/// 平台钱包向用户转账时，不收取任何税收，用于TOT购买订单完成后的转账等场景。
/// 
/// # 功能流程
/// 
/// 1. **验证阶段**: 检查系统状态、账户状态、金额有效性
/// 2. **权限验证**: 验证签名者是否为系统管理员（平台钱包）
/// 3. **执行转账**: 将全额金额转给用户（无税收）
/// 4. **更新统计**: 更新用户的买入统计信息（如果是首次接收，初始化持有时间）
/// 5. **发出事件**: 记录转账信息到链上日志
/// 
/// # 参数
/// * `ctx` - 平台转账上下文，包含所有必需的账户
/// * `amount` - 转账金额（全额转账，无税收）
/// 
/// # 返回值
/// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
/// 
/// # 注意事项
/// 
/// - 只有系统管理员（config.authority）可以执行此操作
/// - 系统处于恐慌模式时，平台转账仍可进行（不受限制）
/// - 转账不收取税收，全额转账给用户
/// - 会更新用户的买入统计和首次持有时间
/// 
/// # 使用示例
/// ```rust
/// // 执行平台转账
/// program.methods
///     .platformTransfer(
///         new anchor.BN(1000000000) // 转账1000个代币
///     )
///     .accounts({...})
///     .rpc();
/// ```
pub fn platform_transfer_handler(
    ctx: Context<PlatformTransfer>,
    amount: u64,
) -> Result<()> {
    // 获取账户和配置引用
    let config = &ctx.accounts.config;
    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;

    // 缓存常用值以减少重复访问
    let platform_key = ctx.accounts.platform.key();
    let user_owner = ctx.accounts.user_token_account.owner;
    let mint_decimals = ctx.accounts.mint.decimals;

    // ========================================
    // 验证阶段
    // ========================================
    
    // 验证1: 检查转账金额是否有效（必须大于0）
    validate_transfer_amount(amount)?;

    // 验证2: 权限验证（已在账户结构中验证）
    // 确保签名者是系统管理员

    // 验证3: 检查用户账户是否被冻结（如果存在持有者账户）
    if let Some(ref user_holder) = ctx.accounts.user_holder_info {
        require!(!user_holder.is_frozen, TotError::HolderFrozen);
    }

    // ========================================
    // 余额验证（在转账前验证，避免无效转账浪费gas）
    // ========================================
    // 
    // 验证平台账户余额是否足够支付转账金额。
    // 平台转账是全额转账，不需要扣除税收。
    require!(
        ctx.accounts.platform_token_account.amount >= amount,
        TotError::InsufficientBalance
    );

    // ========================================
    // 执行转账 - 全额金额给用户
    // ========================================
    // 
    // 将全额金额转给用户，不收取任何税收。
    
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.platform_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.platform.to_account_info(),
        },
    );

    // 执行转账（使用transfer_checked确保金额和精度正确）
    token_interface::transfer_checked(
        transfer_ctx,
        amount,  // 全额转账，无税收
        mint_decimals,  // 代币精度
    )?;

    // ========================================
    // 更新用户统计信息
    // ========================================
    // 
    // 更新用户的买入统计，记录接收金额和时间。
    // 如果是首次接收，初始化首次持有时间。
    
    if let Some(ref mut user_holder) = ctx.accounts.user_holder_info {
        // 平台转账相当于用户买入，使用record_buy方法
        // 接收者不支付税收，所以tax_paid为0
        user_holder.record_buy(amount, 0, timestamp)?;
        
        // 如果用户的代币账户地址未设置，更新为当前接收者代币账户
        if user_holder.token_account == Pubkey::default() {
            user_holder.token_account = ctx.accounts.user_token_account.key();
        }
    }

    // ========================================
    // 发出转账事件
    // ========================================
    // 
    // 记录转账信息到链上日志，便于前端监听和显示。
    // 事件包含完整的转账信息。
    
    emit!(PlatformTransferEvent {
        platform: platform_key,
        user: user_owner,
        amount,
        timestamp,
    });

    Ok(())
}

/// 平台转账事件
/// 
/// 每次平台转账都会发出此事件，记录完整的转账信息。
/// 前端可以通过监听此事件来实时显示转账信息。
#[event]
pub struct PlatformTransferEvent {
    /// 平台地址
    pub platform: Pubkey,
    
    /// 用户地址
    pub user: Pubkey,
    
    /// 转账金额（全额转账，无税收）
    pub amount: u64,
    
    /// 交易时间戳
    pub timestamp: i64,
}
