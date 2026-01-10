// ============================================
// 文件: programs/tot-token/src/instructions/mint_to_pools.rs
// 铸造代币到各池子指令
// ============================================

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    mint_to, Mint, MintTo, TokenAccount, TokenInterface,
};

use crate::constants::*;
use crate::state::config::TotConfig;
use crate::state::pool::*;
use crate::errors::TotError;

/// 铸造到池子账户结构
#[derive(Accounts)]
pub struct MintToPools<'info> {
    /// 管理员
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// 全局配置账户
    #[account(
        mut,
        seeds = [seeds::CONFIG_SEED],
        bump,
        has_one = authority @ TotError::InvalidAuthority,
        has_one = mint @ TotError::InvalidMint,
    )]
    pub config: Account<'info, TotConfig>,
    
    /// TOT Mint
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    
    // 五大池子账户
    #[account(
        mut,
        seeds = [seeds::POOL_SEED, &[PoolType::VictoryFund as u8]],
        bump = victory_pool.bump,
    )]
    pub victory_pool: Account<'info, PoolAccount>,
    
    #[account(mut, address = victory_pool.token_account @ TotError::TokenAccountMismatch)]
    pub victory_token_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [seeds::POOL_SEED, &[PoolType::HistoryLP as u8]],
        bump = history_pool.bump,
    )]
    pub history_pool: Account<'info, PoolAccount>,
    
    #[account(mut, address = history_pool.token_account @ TotError::TokenAccountMismatch)]
    pub history_token_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [seeds::POOL_SEED, &[PoolType::CyberArmy as u8]],
        bump = cyber_pool.bump,
    )]
    pub cyber_pool: Account<'info, PoolAccount>,
    
    #[account(mut, address = cyber_pool.token_account @ TotError::TokenAccountMismatch)]
    pub cyber_token_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [seeds::POOL_SEED, &[PoolType::GlobalAlliance as u8]],
        bump = global_pool.bump,
    )]
    pub global_pool: Account<'info, PoolAccount>,
    
    #[account(mut, address = global_pool.token_account @ TotError::TokenAccountMismatch)]
    pub global_token_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [seeds::POOL_SEED, &[PoolType::AssetAnchor as u8]],
        bump = asset_pool.bump,
    )]
    pub asset_pool: Account<'info, PoolAccount>,
    
    #[account(mut, address = asset_pool.token_account @ TotError::TokenAccountMismatch)]
    pub asset_token_account: InterfaceAccount<'info, TokenAccount>,
    
    pub token_program: Interface<'info, TokenInterface>,
}

/// 铸造到池子处理器
pub fn handler(ctx: Context<MintToPools>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    
    // 确保只能铸造一次
    require!(
        config.total_minted == 0,
        TotError::AlreadyInitialized
    );
    
    let mint = &ctx.accounts.mint;
    let authority = &ctx.accounts.authority;
    let token_program = &ctx.accounts.token_program;
    
    // 铸造到各池子
    let pools_and_amounts = [
        (&ctx.accounts.victory_token_account, allocation::VICTORY_FUND),
        (&ctx.accounts.history_token_account, allocation::HISTORY_LP),
        (&ctx.accounts.cyber_token_account, allocation::CYBER_ARMY),
        (&ctx.accounts.global_token_account, allocation::GLOBAL_ALLIANCE),
        (&ctx.accounts.asset_token_account, allocation::ASSET_ANCHOR),
    ];
    
    for (token_account, amount) in pools_and_amounts.iter() {
        mint_to(
            CpiContext::new(
                token_program.to_account_info(),
                MintTo {
                    mint: mint.to_account_info(),
                    to: token_account.to_account_info(),
                    authority: authority.to_account_info(),
                },
            ),
            *amount,
        )?;
        
        msg!("铸造 {} 到 {}", amount, token_account.key());
    }
    
    // 更新配置
    config.total_minted = TOTAL_SUPPLY;
    
    msg!("总供应量铸造完成: {}", TOTAL_SUPPLY);
    msg!("胜利日基金: {}", allocation::VICTORY_FUND);
    msg!("历史重铸池: {}", allocation::HISTORY_LP);
    msg!("认知作战池: {}", allocation::CYBER_ARMY);
    msg!("外资统战池: {}", allocation::GLOBAL_ALLIANCE);
    msg!("资产锚定池: {}", allocation::ASSET_ANCHOR);
    
    Ok(())
}
