// ============================================
// 文件: src/instructions/admin.rs
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
    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;
    
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
        timestamp,
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
    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;
    
    config.panic_mode = paused;

    msg!("System paused status: {}", paused);

    emit!(SystemPausedEvent {
        paused,
        timestamp,
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
    #[account(
        mut,
        constraint = source_account.mint == mint.key() @ TotError::InvalidMint
    )]
    pub source_account: InterfaceAccount<'info, TokenAccount>,

    /// 目标账户
    #[account(
        mut,
        constraint = destination_account.mint == mint.key() @ TotError::InvalidMint
    )]
    pub destination_account: InterfaceAccount<'info, TokenAccount>,

    /// Mint
    pub mint: InterfaceAccount<'info, Mint>,

    /// Token 程序
    pub token_program: Interface<'info, TokenInterface>,
}

/// 紧急提取处理器
/// 
/// 设计说明：
/// - 当前实现允许从任何代币账户提取，不限制为池子账户
/// - 如果未来需要限制为池子账户，可以添加PDA验证：
///   ```rust
///   // 验证源账户是否为池子PDA
///   let (pool_pda, _) = Pubkey::find_program_address(
///       &[seeds::POOL_SEED, &[pool_type as u8]],
///       ctx.program_id
///   );
///   require!(
///       pool_account.token_account == ctx.accounts.source_account.key(),
///       TotError::InvalidTransferDestination
///   );
///   ```
/// - 当前设计允许在紧急情况下从任何账户提取，提供更大的灵活性
pub fn emergency_withdraw_handler(
    ctx: Context<EmergencyWithdraw>,
    amount: u64,
) -> Result<()> {
    // 紧急提取需要系统处于暂停状态
    require!(ctx.accounts.config.panic_mode, TotError::SystemNotPaused);
    
    // 验证源账户余额是否足够
    require!(
        ctx.accounts.source_account.amount >= amount,
        TotError::InsufficientBalance
    );

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

    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;

    msg!("Emergency withdrawal: {} tokens", amount);

    emit!(EmergencyWithdrawEvent {
        from: ctx.accounts.source_account.key(),
        to: ctx.accounts.destination_account.key(),
        amount,
        timestamp,
    });

    Ok(())
}

/// 设置TWS财库地址
#[derive(Accounts)]
pub struct SetTwsTreasury<'info> {
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

/// 设置TWS财库地址处理器
/// 
/// 管理员可以设置TWS官方财库地址，用于接收用户消费。
/// 用户向此地址转账时，不收取税收（免税消费）。
/// 
/// # 参数
/// * `ctx` - 管理员操作上下文
/// * `tws_treasury` - TWS财库地址
/// 
/// # 返回值
/// * `Result<()>` - 成功返回Ok(())
/// 
/// # 用途
/// - 设置TWS官方财库地址
/// - 用于接收用户消费（地图操作、祖籍标记等）
/// - 免税转账验证
pub fn set_tws_treasury_handler(
    ctx: Context<SetTwsTreasury>,
    tws_treasury: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;
    
    // 验证地址有效性
    require!(
        tws_treasury != Pubkey::default(),
        TotError::InvalidNewAuthority
    );
    
    let old_treasury = config.tws_treasury;
    config.tws_treasury = tws_treasury;

    msg!(
        "TWS Treasury updated from {} to {}",
        old_treasury,
        tws_treasury
    );

    emit!(TwsTreasuryUpdated {
        old_treasury,
        new_treasury: tws_treasury,
        timestamp,
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

/// TWS财库地址更新事件
#[event]
pub struct TwsTreasuryUpdated {
    pub old_treasury: Pubkey,
    pub new_treasury: Pubkey,
    pub timestamp: i64,
}
