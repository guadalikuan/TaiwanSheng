// ============================================
// 文件: src/instructions/jackpot.rs
// 奖池初始化指令
// ============================================

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::state::config::TotConfig;
use crate::state::jackpot::JackpotAccount;
use crate::constants::seeds;
use crate::errors::TotError;

/// 初始化奖池账户结构
#[derive(Accounts)]
pub struct InitializeJackpot<'info> {
    /// 管理员
    #[account(
        mut,
        constraint = authority.key() == config.authority @ TotError::Unauthorized
    )]
    pub authority: Signer<'info>,
    
    /// 全局配置账户
    #[account(
        seeds = [seeds::CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, TotConfig>,
    
    /// TOT Mint
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    
    /// 奖池状态账户
    #[account(
        init,
        payer = authority,
        space = 8 + JackpotAccount::LEN,
        seeds = [seeds::JACKPOT_SEED],
        bump
    )]
    pub jackpot_account: Account<'info, JackpotAccount>,
    
    /// 奖池代币账户
    #[account(
        init,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = jackpot_account,
        associated_token::token_program = token_program,
    )]
    pub jackpot_token_account: InterfaceAccount<'info, TokenAccount>,
    
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

/// 初始化奖池处理器
/// 
/// 这是初始化奖池账户的核心功能。
/// 创建奖池账户并设置初始参数，包括基础难度、保留比例等。
/// 
/// # 功能流程
/// 
/// 1. **验证阶段**: 检查权限、系统状态
/// 2. **创建账户**: 创建奖池账户（PDA）和关联代币账户（ATA）
/// 3. **设置参数**: 设置初始难度、保留比例等
/// 4. **发出事件**: 记录奖池初始化信息到链上日志
/// 
/// # 参数
/// * `ctx` - 奖池初始化上下文，包含所有必需的账户
/// 
/// # 返回值
/// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
/// 
/// # 注意事项
/// 
/// - 只有系统管理员可以执行此操作
/// - 奖池账户只能初始化一次
/// - 初始难度设置为1000（对应0.1%中奖概率）
/// - 保留比例设置为20%
pub fn initialize_jackpot_handler(ctx: Context<InitializeJackpot>) -> Result<()> {
    let jackpot_account = &mut ctx.accounts.jackpot_account;
    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;
    
    // 从TaxConfig读取奖池比例（如果已初始化）
    // 否则使用默认值40%
    use crate::constants::tax::distribution;
    let jackpot_ratio_bps = distribution::TAX_TO_JACKPOT_BPS; // 默认40%
    
    // 初始化奖池账户
    jackpot_account.balance = 0;
    jackpot_account.base_difficulty = 1000; // 初始难度1000，对应0.1%中奖概率
    jackpot_account.difficulty = 1000;
    jackpot_account.total_transactions = 0;
    jackpot_account.total_wins = 0;
    jackpot_account.total_payouts = 0;
    jackpot_account.jackpot_ratio_bps = jackpot_ratio_bps;
    jackpot_account.reserve_ratio_bps = distribution::JACKPOT_RESERVE_RATIO_BPS; // 20%
    jackpot_account.last_updated = timestamp;
    jackpot_account.bump = ctx.bumps.jackpot_account;
    
    // 初始化新字段（两阶段检查机制）
    jackpot_account.last_win_time = 0; // 从未开过奖
    jackpot_account.transactions_since_last_win = 0;
    jackpot_account.target_win_interval = 86400; // 默认24小时
    jackpot_account.hash_difficulty_bits = 16; // 初始难度：前16位必须为0
    
    msg!(
        "Jackpot initialized: difficulty={}, ratio={}%, reserve={}%, hash_difficulty={} bits, target_interval={}s",
        jackpot_account.difficulty,
        jackpot_account.jackpot_ratio_bps as f64 / 100.0,
        jackpot_account.reserve_ratio_bps as f64 / 100.0,
        jackpot_account.hash_difficulty_bits,
        jackpot_account.target_win_interval
    );
    
    Ok(())
}
