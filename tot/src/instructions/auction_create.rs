// ============================================
// 文件: src/instructions/auction_create.rs
// 拍卖创建指令
// ============================================

use anchor_lang::prelude::*;

use crate::state::config::TotConfig;
use crate::state::auction::AuctionAccount;
use crate::constants::seeds;
use crate::errors::TotError;

/// 拍卖创建账户结构
#[derive(Accounts)]
#[instruction(asset_id: String)]
pub struct CreateAuction<'info> {
    /// 创建者（签名者）
    pub creator: Signer<'info>,

    /// 拍卖账户（PDA）
    #[account(
        init,
        payer = creator,
        space = AuctionAccount::calculate_size(asset_id.len(), taunt_message.len()),
        seeds = [seeds::AUCTION_SEED, asset_id.as_bytes()],
        bump
    )]
    pub auction_account: Account<'info, AuctionAccount>,

    /// 全局配置
    #[account(
        seeds = [seeds::CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, TotConfig>,

    /// 系统程序
    pub system_program: Program<'info, System>,
}

/// 拍卖创建处理器
/// 
/// 这是创建拍卖的核心功能。
/// 将拍卖信息存储到链上，确保拍卖信息的不可篡改性和可追溯性。
/// 
/// # 功能流程
/// 
/// 1. **验证阶段**: 检查资产ID有效性、价格有效性
/// 2. **创建账户**: 创建拍卖账户（PDA）
/// 3. **存储信息**: 存储拍卖元数据、价格、留言等信息
/// 4. **发出事件**: 记录拍卖创建信息到链上日志
/// 
/// # 参数
/// * `ctx` - 拍卖创建上下文，包含所有必需的账户
/// * `asset_id` - 资产唯一ID（字符串）
/// * `start_price` - 起拍价（TOT代币，基础单位）
/// * `taunt_message` - 嘲讽留言（字符串，最大100字符）
/// 
/// # 返回值
/// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
/// 
/// # 注意事项
/// 
/// - 任何人都可以创建拍卖
/// - 资产ID必须唯一，重复创建会失败
/// - 起拍价必须大于0
/// - 留言长度不能超过100字符
/// 
/// # 使用示例
/// ```rust
/// // 执行拍卖创建
/// program.methods
///     .createAuction(
///         "asset_12345".to_string(),
///         new anchor.BN(1000000000), // 起拍价1000 TOT
///         "此资产已被TaiOne接管".to_string()
///     )
///     .accounts({...})
///     .rpc();
/// ```
pub fn create_auction_handler(
    ctx: Context<CreateAuction>,
    asset_id: String,
    start_price: u64,
    taunt_message: String,
) -> Result<()> {
    // 获取账户和配置引用
    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;
    let auction_account = &mut ctx.accounts.auction_account;

    // ========================================
    // 验证阶段
    // ========================================
    
    // 验证1: 资产ID不能为空
    require!(!asset_id.is_empty(), TotError::InvalidParameter);
    
    // 验证2: 起拍价必须大于0
    require!(start_price > 0, TotError::InvalidAmount);
    
    // 验证3: 留言长度不能超过100字符
    require!(taunt_message.len() <= 100, TotError::StringTooLong);

    // ========================================
    // 初始化拍卖账户
    // ========================================
    
    auction_account.asset_id = asset_id;
    auction_account.owner = ctx.accounts.creator.key();
    auction_account.price = start_price;
    auction_account.start_price = start_price;
    auction_account.taunt_message = taunt_message;
    auction_account.created_at = timestamp;
    auction_account.last_seized_at = timestamp;
    auction_account.bump = ctx.bumps.auction_account;

    // ========================================
    // 发出拍卖创建事件
    // ========================================
    // 
    // 记录拍卖创建信息到链上日志，便于前端监听和显示。
    // 事件包含完整的拍卖信息。
    
    emit!(AuctionCreatedEvent {
        asset_id: auction_account.asset_id.clone(),
        owner: auction_account.owner,
        start_price: auction_account.start_price,
        timestamp,
    });

    msg!("Auction created: {}", auction_account.asset_id);
    msg!("Owner: {}", auction_account.owner);
    msg!("Start price: {} TOT", auction_account.start_price);

    Ok(())
}

/// 拍卖创建事件
/// 
/// 每次拍卖创建都会发出此事件，记录完整的拍卖信息。
/// 前端可以通过监听此事件来实时显示拍卖创建信息。
#[event]
pub struct AuctionCreatedEvent {
    /// 资产ID
    pub asset_id: String,
    
    /// 所有者
    pub owner: Pubkey,
    
    /// 起拍价
    pub start_price: u64,
    
    /// 创建时间戳
    pub timestamp: i64,
}
