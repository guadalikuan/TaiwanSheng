// ============================================
// 文件: src/instructions/consume.rs
// 用户向TWS财库免税消费转账指令
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

/// 消费类型枚举
/// 
/// 定义用户向TWS官方消费的不同类型
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum ConsumeType {
    /// 地图功能操作（修缮妈祖庙、放飞孔明灯、祭拜祖先等）
    MapAction = 0,
    /// 祖籍标记
    AncestorMarking = 1,
    /// 其他消费
    Other = 2,
    /// 拍卖创建费
    AuctionCreate = 3,
    /// 拍卖手续费（5%）
    AuctionFee = 4,
    /// 预测下注
    PredictionBet = 5,
    /// 预测平台费
    PredictionFee = 6,
}

/// 消费转账账户结构
#[derive(Accounts)]
pub struct ConsumeToTreasury<'info> {
    /// 用户（签名者）
    #[account(mut)]
    pub user: Signer<'info>,

    /// 用户代币账户
    #[account(
        mut,
        constraint = user_token_account.owner == user.key() @ TotError::InvalidOwner,
        constraint = user_token_account.mint == mint.key() @ TotError::InvalidMint
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    /// TWS财库代币账户
    #[account(
        mut,
        constraint = treasury_token_account.mint == mint.key() @ TotError::InvalidMint,
        constraint = treasury_token_account.owner == config.tws_treasury @ TotError::InvalidOwner
    )]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,

    /// TOT Mint
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,

    /// 全局配置
    #[account(
        seeds = [seeds::CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, TotConfig>,

    /// 用户持有者信息（可选）
    #[account(
        mut,
        seeds = [seeds::HOLDER_SEED, user.key().as_ref()],
        bump = user_holder_info.bump
    )]
    pub user_holder_info: Option<Account<'info, HolderAccount>>,

    /// Token 程序
    pub token_program: Interface<'info, TokenInterface>,
}

/// 消费转账处理器
/// 
/// 这是用户向TWS官方财库消费的核心功能，实现免税转账机制。
/// 用户向TWS财库转账时，不收取任何税收，但会记录消费统计。
/// 
/// # 功能流程
/// 
/// 1. **验证阶段**: 检查系统状态、账户状态、金额有效性
/// 2. **财库验证**: 验证接收者是否为配置的TWS财库地址
/// 3. **执行转账**: 将全额金额转给TWS财库（无税收）
/// 4. **更新统计**: 更新用户的消费统计信息
/// 5. **发出事件**: 记录消费信息到链上日志
/// 
/// # 参数
/// * `ctx` - 消费转账上下文，包含所有必需的账户
/// * `amount` - 消费金额（全额转账，无税收）
/// * `consume_type` - 消费类型（地图操作、祖籍标记等）
/// 
/// # 返回值
/// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
/// 
/// # 注意事项
/// 
/// - 用户账户不能处于冻结状态
/// - 系统处于恐慌模式时，消费仍可进行（消费不受限制）
/// - 消费不收取税收，全额转账给TWS财库
/// - 消费会更新用户的消费统计
/// 
/// # 使用示例
/// ```rust
/// // 执行消费转账
/// program.methods
///     .consumeToTreasury(
///         new anchor.BN(100000000), // 消费100个代币
///         { mapAction: {} } // 地图操作
///     )
///     .accounts({...})
///     .rpc();
/// ```
pub fn consume_to_treasury_handler(
    ctx: Context<ConsumeToTreasury>,
    amount: u64,
    consume_type: ConsumeType,
) -> Result<()> {
    // 获取账户和配置引用
    let config = &ctx.accounts.config;
    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;

    // 缓存常用值以减少重复访问
    let user_key = ctx.accounts.user.key();
    let treasury_owner = ctx.accounts.treasury_token_account.owner;
    let mint_decimals = ctx.accounts.mint.decimals;

    // ========================================
    // 验证阶段
    // ========================================
    
    // 验证1: 检查消费金额是否有效（必须大于0）
    validate_transfer_amount(amount)?;

    // 验证2: 验证财库地址
    // 确保接收者代币账户的所有者是配置的TWS财库地址
    require!(
        treasury_owner == config.tws_treasury,
        TotError::InvalidTransferDestination
    );

    // 验证3: 检查TWS财库地址是否已配置（不是占位符）
    // 如果tws_treasury等于mint地址，说明是占位符，需要先配置
    require!(
        config.tws_treasury != config.mint,
        TotError::InvalidInitParams
    );

    // 验证4: 检查用户账户是否被冻结（如果存在持有者账户）
    if let Some(ref user_holder) = ctx.accounts.user_holder_info {
        require!(!user_holder.is_frozen, TotError::HolderFrozen);
    }

    // ========================================
    // 余额验证（在转账前验证，避免无效转账浪费gas）
    // ========================================
    // 
    // 验证用户账户余额是否足够支付消费金额。
    // 消费是全额转账，不需要扣除税收。
    require!(
        ctx.accounts.user_token_account.amount >= amount,
        TotError::InsufficientBalance
    );

    // ========================================
    // 执行转账 - 全额金额给TWS财库
    // ========================================
    // 
    // 将全额金额转给TWS财库，不收取任何税收。
    
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.user_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
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
    // 更新用户的消费统计，记录消费金额和时间。
    
    if let Some(ref mut user_holder) = ctx.accounts.user_holder_info {
        user_holder.record_consume(amount, timestamp)?;
    }

    // ========================================
    // 发出消费事件
    // ========================================
    // 
    // 记录消费信息到链上日志，便于前端监听和显示。
    // 事件包含完整的消费信息。
    
    emit!(ConsumeToTreasuryEvent {
        user: user_key,
        treasury: treasury_owner,
        amount,
        consume_type: consume_type as u8,
        timestamp,
    });

    Ok(())
}

/// 消费转账事件
/// 
/// 每次消费转账都会发出此事件，记录完整的消费信息。
/// 前端可以通过监听此事件来实时显示消费信息。
#[event]
pub struct ConsumeToTreasuryEvent {
    /// 用户地址
    pub user: Pubkey,
    
    /// TWS财库地址
    pub treasury: Pubkey,
    
    /// 消费金额（全额转账，无税收）
    pub amount: u64,
    
    /// 消费类型（0=地图操作, 1=祖籍标记, 2=其他）
    pub consume_type: u8,
    
    /// 交易时间戳
    pub timestamp: i64,
}
