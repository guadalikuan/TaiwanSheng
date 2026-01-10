// ============================================
// 文件: programs/tot-token/src/instructions/init_pool.rs
// 池子初始化指令
// ============================================

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::constants::*;
use crate::state::config::TotConfig;
use crate::state::pool::*;
use crate::errors::TotError;

/// 初始化池子账户结构
#[derive(Accounts)]
#[instruction(pool_type: PoolType)]
pub struct InitPool<'info> {
    /// 管理员
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// 全局配置账户
    #[account(
        seeds = [seeds::CONFIG_SEED],
        bump,
        has_one = authority @ TotError::InvalidAuthority,
        has_one = mint @ TotError::InvalidMint,
    )]
    pub config: Account<'info, TotConfig>,
    
    /// TOT Mint
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    
    /// 池子状态账户
    #[account(
        init,
        payer = authority,
        space = 8 + PoolAccount::LEN,
        seeds = [seeds::POOL_SEED, &[pool_type as u8]],
        bump
    )]
    pub pool_account: Account<'info, PoolAccount>,
    
    /// 池子代币账户
    #[account(
        init,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = pool_account,
        associated_token::token_program = token_program,
    )]
    pub pool_token_account: InterfaceAccount<'info, TokenAccount>,
    
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

/// 初始化池子处理器
pub fn handler(ctx: Context<InitPool>, pool_type: PoolType) -> Result<()> {
    let pool_account = &mut ctx.accounts.pool_account;
    let clock = Clock::get()?;
    
    // 根据池子类型设置分配量和锁定参数
    let (allocation, unlock_time, vesting_start, vesting_period, requires_multisig) = match pool_type {
        PoolType::VictoryFund => (
            allocation::VICTORY_FUND,
            time::VICTORY_UNLOCK_TIME, // 锁定至2027年1月1日
            0, // 无线性释放
            0,
            false,
        ),
        PoolType::HistoryLP => (
            allocation::HISTORY_LP,
            0, // 无锁定，立即可用
            0,
            0,
            false,
        ),
        PoolType::CyberArmy => (
            allocation::CYBER_ARMY,
            0, // 无锁定
            clock.unix_timestamp, // 立即开始线性释放
            time::LINEAR_VESTING_PERIOD, // 365天
            false,
        ),
        PoolType::GlobalAlliance => (
            allocation::GLOBAL_ALLIANCE,
            0, // 无锁定
            0,
            0,
            true, // 需要多签
        ),
        PoolType::AssetAnchor => (
            allocation::ASSET_ANCHOR,
            0, // RWA触发释放，无时间锁
            0,
            0,
            false,
        ),
    };
    
    pool_account.pool_type = pool_type;
    pool_account.token_account = ctx.accounts.pool_token_account.key();
    pool_account.initial_allocation = allocation;
    pool_account.released_amount = 0;
    pool_account.unlock_time = unlock_time;
    pool_account.vesting_start = vesting_start;
    pool_account.vesting_period = vesting_period;
    pool_account.requires_multisig = requires_multisig;
    pool_account.multisig_threshold = if requires_multisig { 3 } else { 0 }; // 3-of-5多签
    pool_account.multisig_signers = [Pubkey::default(); 5]; // 后续可设置
    pool_account.bump = ctx.bumps.pool_account;
    
    // 合并所有消息为一个，减少gas消耗
    msg!(
        "池子初始化完成: 类型={:?}, 分配量={}, 解锁时间={}, 代币账户={}",
        pool_type,
        allocation,
        unlock_time,
        pool_account.token_account
    );
    
    Ok(())
}
