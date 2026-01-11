// ============================================
// 文件: src/instructions/auction_seize.rs
// 拍卖夺取指令
// ============================================

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    self, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::state::config::TotConfig;
use crate::state::auction::AuctionAccount;
use crate::state::holder::HolderAccount;
use crate::constants::seeds;
use crate::errors::TotError;
use crate::utils::validation::validate_transfer_amount;

/// 拍卖夺取账户结构
#[derive(Accounts)]
pub struct SeizeAuction<'info> {
    /// 新所有者（签名者）
    #[account(mut)]
    pub new_owner: Signer<'info>,

    /// 拍卖账户（PDA，可变）
    #[account(
        mut,
        seeds = [seeds::AUCTION_SEED, auction_account.asset_id.as_bytes()],
        bump = auction_account.bump
    )]
    pub auction_account: Account<'info, AuctionAccount>,

    /// 上一任房主代币账户
    #[account(
        mut,
        constraint = old_owner_token_account.mint == mint.key() @ TotError::InvalidMint
    )]
    pub old_owner_token_account: InterfaceAccount<'info, TokenAccount>,

    /// TWS财库代币账户
    #[account(
        mut,
        constraint = treasury_token_account.mint == mint.key() @ TotError::InvalidMint,
        constraint = treasury_token_account.owner == config.tws_treasury @ TotError::InvalidOwner
    )]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,

    /// 新所有者代币账户
    #[account(
        mut,
        constraint = new_owner_token_account.owner == new_owner.key() @ TotError::InvalidOwner,
        constraint = new_owner_token_account.mint == mint.key() @ TotError::InvalidMint
    )]
    pub new_owner_token_account: InterfaceAccount<'info, TokenAccount>,

    /// TOT Mint
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,

    /// 全局配置
    #[account(
        seeds = [seeds::CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, TotConfig>,

    /// 新所有者持有者信息（可选）
    #[account(
        mut,
        seeds = [seeds::HOLDER_SEED, new_owner.key().as_ref()],
        bump = new_owner_holder_info.bump
    )]
    pub new_owner_holder_info: Option<Account<'info, HolderAccount>>,

    /// Token 程序
    pub token_program: Interface<'info, TokenInterface>,
}

/// 拍卖夺取处理器
/// 
/// 这是夺取拍卖资产的核心功能。
/// 用户支付当前价格+10%来夺取资产，其中5%给财库，95%给上一任房主。
/// 
/// # 功能流程
/// 
/// 1. **验证阶段**: 检查价格、余额、账户状态
/// 2. **计算分账**: 5%给财库，95%给上一任房主
/// 3. **执行转账**: 从新所有者转出，分别转给财库和上一任房主
/// 4. **更新状态**: 更新拍卖账户的所有者和价格
/// 5. **发出事件**: 记录夺取信息到链上日志
/// 
/// # 参数
/// * `ctx` - 拍卖夺取上下文，包含所有必需的账户
/// * `bid_message` - 出价留言（字符串，最大100字符）
/// 
/// # 返回值
/// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
/// 
/// # 注意事项
/// 
/// - 新所有者必须支付当前价格+10%
/// - 5%给财库（免税，因为是向TWS官方消费）
/// - 95%给上一任房主（免税，因为是平台资产转移）
/// - 会更新新所有者的消费统计
/// 
/// # 使用示例
/// ```rust
/// // 执行拍卖夺取
/// program.methods
///     .seizeAuction(
///         "此资产已被TaiOne接管".to_string()
///     )
///     .accounts({...})
///     .rpc();
/// ```
pub fn seize_auction_handler(
    ctx: Context<SeizeAuction>,
    bid_message: String,
) -> Result<()> {
    // 获取账户和配置引用
    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;
    let auction_account = &mut ctx.accounts.auction_account;
    let config = &ctx.accounts.config;
    let mint_decimals = ctx.accounts.mint.decimals;

    // ========================================
    // 验证阶段
    // ========================================
    
    // 验证1: 留言长度不能超过100字符
    require!(bid_message.len() <= 100, TotError::StringTooLong);
    
    // 验证2: 验证TWS财库地址是否已配置
    require!(
        config.tws_treasury != config.mint,
        TotError::InvalidInitParams
    );
    
    // 验证3: 检查新所有者账户是否被冻结（如果存在持有者账户）
    if let Some(ref holder_info) = ctx.accounts.new_owner_holder_info {
        require!(!holder_info.is_frozen, TotError::HolderFrozen);
    }

    // ========================================
    // 计算最低出价和分账
    // ========================================
    
    // 计算最低出价（当前价格 + 10%）
    let min_required = auction_account.calculate_min_required()?;
    
    // 验证4: 新所有者余额必须足够支付最低出价
    require!(
        ctx.accounts.new_owner_token_account.amount >= min_required,
        TotError::InsufficientBalance
    );
    
    // 计算分账：5%给财库，95%给上一任房主
    let (fee_amount, payout_amount) = auction_account.calculate_split(min_required)?;
    
    // 验证分账金额正确性
    require!(
        fee_amount.checked_add(payout_amount).ok_or(TotError::MathOverflow)? == min_required,
        TotError::InvalidAmount
    );

    // ========================================
    // 执行转账 - 5%给财库
    // ========================================
    // 
    // 将5%转给TWS财库，免税（因为是向TWS官方消费）。
    
    let transfer_to_treasury_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.new_owner_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.new_owner.to_account_info(),
        },
    );

    token_interface::transfer_checked(
        transfer_to_treasury_ctx,
        fee_amount,
        mint_decimals,
    )?;

    // ========================================
    // 执行转账 - 95%给上一任房主
    // ========================================
    // 
    // 将95%转给上一任房主，免税（因为是平台资产转移）。
    
    let transfer_to_old_owner_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.new_owner_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.old_owner_token_account.to_account_info(),
            authority: ctx.accounts.new_owner.to_account_info(),
        },
    );

    token_interface::transfer_checked(
        transfer_to_old_owner_ctx,
        payout_amount,
        mint_decimals,
    )?;

    // ========================================
    // 更新拍卖状态
    // ========================================
    
    let old_owner = auction_account.owner;
    auction_account.owner = ctx.accounts.new_owner.key();
    auction_account.price = min_required;
    auction_account.taunt_message = bid_message;
    auction_account.last_seized_at = timestamp;

    // ========================================
    // 更新新所有者统计信息
    // ========================================
    // 
    // 更新新所有者的消费统计，记录消费金额和时间。
    
    if let Some(ref mut holder_info) = ctx.accounts.new_owner_holder_info {
        holder_info.record_consume(min_required, timestamp)?;
    }

    // ========================================
    // 发出拍卖夺取事件
    // ========================================
    // 
    // 记录拍卖夺取信息到链上日志，便于前端监听和显示。
    // 事件包含完整的夺取信息。
    
    emit!(AuctionSeizedEvent {
        asset_id: auction_account.asset_id.clone(),
        old_owner,
        new_owner: auction_account.owner,
        new_price: auction_account.price,
        fee_amount,
        payout_amount,
        timestamp,
    });

    msg!("Auction seized: {}", auction_account.asset_id);
    msg!("Old owner: {}", old_owner);
    msg!("New owner: {}", auction_account.owner);
    msg!("New price: {} TOT", auction_account.price);
    msg!("Fee (5%): {} TOT", fee_amount);
    msg!("Payout (95%): {} TOT", payout_amount);

    Ok(())
}

/// 拍卖夺取事件
/// 
/// 每次拍卖夺取都会发出此事件，记录完整的夺取信息。
/// 前端可以通过监听此事件来实时显示拍卖夺取信息。
#[event]
pub struct AuctionSeizedEvent {
    /// 资产ID
    pub asset_id: String,
    
    /// 上一任所有者
    pub old_owner: Pubkey,
    
    /// 新所有者
    pub new_owner: Pubkey,
    
    /// 新价格
    pub new_price: u64,
    
    /// 财库费用（5%）
    pub fee_amount: u64,
    
    /// 房主分账（95%）
    pub payout_amount: u64,
    
    /// 夺取时间戳
    pub timestamp: i64,
}
