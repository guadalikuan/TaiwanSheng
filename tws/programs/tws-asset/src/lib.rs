use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod tws_asset {
    use super::*;

    /// 初始化资产账户（地堡）
    pub fn initialize_bunker(
        ctx: Context<InitializeBunker>,
        bunker_id: u64,
        sector_code: String,
        total_shares: u64,
    ) -> Result<()> {
        let bunker = &mut ctx.accounts.bunker;
        bunker.authority = ctx.accounts.authority.key();
        bunker.bunker_id = bunker_id;
        bunker.sector_code = sector_code;
        bunker.total_shares = total_shares;
        bunker.minted_shares = 0;
        bunker.price_per_share = 1_000_000; // 1 USDC equivalent (6 decimals)
        bunker.is_redeemed = false;
        bunker.unification_achieved = false;
        bunker.minted_at = Clock::get()?.unix_timestamp;
        bunker.bump = ctx.bumps.bunker;
        bunker.twscoin_mint = ctx.accounts.twscoin_mint.key();
        
        emit!(BunkerInitialized {
            bunker_id,
            sector_code: bunker.sector_code.clone(),
            total_shares,
            authority: bunker.authority,
        });
        
        Ok(())
    }

        /// 铸造资产份额（使用TaiOneToken支付）
    pub fn mint_bunker_shares(
        ctx: Context<MintBunkerShares>,
        amount: u64,
    ) -> Result<()> {
        let bunker = &mut ctx.accounts.bunker;
        
        // 验证 TaiOneToken mint 地址
        require!(
            ctx.accounts.twscoin_mint.key() == bunker.twscoin_mint,
            ErrorCode::InvalidTokenMint
        );
        
        // 检查是否有足够的份额
        require!(
            bunker.total_shares >= bunker.minted_shares.checked_add(amount).ok_or(ErrorCode::Overflow)?,
            ErrorCode::InsufficientShares
        );
        
        // 从用户账户转移TaiOneToken到资产池
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.bunker_token_account.to_account_info(),
            authority: ctx.accounts.user_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        bunker.minted_shares = bunker.minted_shares.checked_add(amount).ok_or(ErrorCode::Overflow)?;
        
        emit!(BunkerMinted {
            bunker_id: bunker.bunker_id,
            amount,
            to: ctx.accounts.user_authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// 触发统一事件（仅预言机或管理员）
    pub fn trigger_unification(ctx: Context<TriggerUnification>) -> Result<()> {
        let bunker = &mut ctx.accounts.bunker;
        
        // 验证调用者是否为授权地址（预言机或管理员）
        require!(
            ctx.accounts.authority.key() == bunker.authority || 
            ctx.accounts.authority.key() == bunker.oracle_address.unwrap_or(bunker.authority),
            ErrorCode::Unauthorized
        );
        
        require!(!bunker.unification_achieved, ErrorCode::UnificationAlreadyAchieved);
        
        bunker.unification_achieved = true;
        let timestamp = Clock::get()?.unix_timestamp;
        
        emit!(UnificationAchieved {
            bunker_id: bunker.bunker_id,
            timestamp,
        });
        
        emit!(DoomsdayTriggered {
            timestamp,
        });
        
        Ok(())
    }

    /// 设置预言机地址
    pub fn set_oracle_address(
        ctx: Context<SetOracleAddress>,
        oracle_address: Pubkey,
    ) -> Result<()> {
        let bunker = &mut ctx.accounts.bunker;
        require!(
            ctx.accounts.authority.key() == bunker.authority,
            ErrorCode::Unauthorized
        );
        bunker.oracle_address = Some(oracle_address);
        Ok(())
    }

    /// 赎回资产（统一后才能使用）
    pub fn redeem_property(
        ctx: Context<RedeemProperty>,
        amount: u64,
    ) -> Result<()> {
        let bunker = &mut ctx.accounts.bunker;
        
        require!(bunker.unification_achieved, ErrorCode::UnificationNotAchieved);
        require!(!bunker.is_redeemed, ErrorCode::PropertyAlreadyRedeemed);

        // 从资产池转移TaiOneToken回用户
        let seeds = &[
            b"bunker",
            bunker.bunker_id.to_le_bytes().as_ref(),
            &[bunker.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.bunker_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.bunker.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        // 如果全部赎回，标记为已赎回
        if bunker.minted_shares == amount {
            bunker.is_redeemed = true;
        }

        emit!(AssetRedeemed {
            bunker_id: bunker.bunker_id,
            amount,
            redeemer: ctx.accounts.user_authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// 初始化拍卖资产（挂出通缉令）
    pub fn initialize_auction(
        ctx: Context<InitializeAuction>,
        asset_id: u64,
        start_price: u64,
        taunt_message: String,
    ) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;
        
        require!(
            taunt_message.len() <= 100,
            ErrorCode::MessageTooLong
        );
        
        auction.owner = ctx.accounts.authority.key(); // 初始房主（通常是TWS官方）
        auction.price = start_price;
        auction.taunt_message = taunt_message;
        auction.asset_id = asset_id;
        auction.created_at = clock.unix_timestamp;
        auction.last_seized_at = clock.unix_timestamp;
        auction.bump = ctx.bumps.auction;
        auction.twscoin_mint = ctx.accounts.twscoin_mint.key();
        auction.treasury = ctx.accounts.treasury.key();
        
        emit!(AuctionInitialized {
            asset_id,
            start_price,
            owner: auction.owner,
            timestamp: clock.unix_timestamp,
        });
        
        Ok(())
    }

    /// 夺取资产（开火！10%溢价机制）
    pub fn seize_asset(
        ctx: Context<SeizeAsset>,
        bid_message: String,
    ) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let current_price = auction.price;
        let new_owner = &ctx.accounts.new_owner;
        let old_owner = &ctx.accounts.old_owner;
        let treasury = &ctx.accounts.treasury;
        let clock = Clock::get()?;

        require!(
            bid_message.len() <= 100,
            ErrorCode::MessageTooLong
        );

        // 1. 验证出价必须比当前价格高至少 10%
        // 计算公式：min_bid = current_price * 110 / 100
        let min_required = current_price
            .checked_mul(110)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(100)
            .ok_or(ErrorCode::MathOverflow)?;

        // 验证传入的支付金额（前端应该传递 min_required）
        let payment_amount = min_required;

        // 2. 计算分赃比例
        // TWS 抽水 5% (军费)
        let fee = payment_amount
            .checked_mul(5)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(100)
            .ok_or(ErrorCode::MathOverflow)?;

        // 上家拿走剩余的 95% (本金 + 利润)
        let payout = payment_amount
            .checked_sub(fee)
            .ok_or(ErrorCode::MathOverflow)?;

        // 3. 验证 TWSCoin mint 地址
        require!(
            ctx.accounts.twscoin_mint.key() == auction.twscoin_mint,
            ErrorCode::InvalidTokenMint
        );

        // 4. 验证旧房主
        require!(
            old_owner.key() == auction.owner,
            ErrorCode::InvalidOldOwner
        );

        // 5. 执行转账 (使用 SPL Token)
        // 转账给财库 (5%)
        let cpi_accounts_fee = Transfer {
            from: ctx.accounts.new_owner_token_account.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.new_owner.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx_fee = CpiContext::new(cpi_program.clone(), cpi_accounts_fee);
        token::transfer(cpi_ctx_fee, fee)?;

        // 转账给旧房主 (95%)
        let cpi_accounts_payout = Transfer {
            from: ctx.accounts.new_owner_token_account.to_account_info(),
            to: ctx.accounts.old_owner_token_account.to_account_info(),
            authority: ctx.accounts.new_owner.to_account_info(),
        };
        let cpi_ctx_payout = CpiContext::new(cpi_program, cpi_accounts_payout);
        token::transfer(cpi_ctx_payout, payout)?;

        // 6. 更新资产状态（主权移交）
        auction.owner = new_owner.key();
        auction.price = payment_amount;
        auction.taunt_message = bid_message;
        auction.last_seized_at = clock.unix_timestamp;

        emit!(AssetSeized {
            asset_id: auction.asset_id,
            new_owner: new_owner.key(),
            old_owner: old_owner.key(),
            price: payment_amount,
            fee,
            payout,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }
}

/// 资产账户结构
#[account]
pub struct Bunker {
    pub authority: Pubkey,              // 管理员地址
    pub bunker_id: u64,                 // 资产ID
    pub sector_code: String,             // 战区代码
    pub total_shares: u64,              // 总份额
    pub minted_shares: u64,             // 已铸造份额
    pub price_per_share: u64,           // 单价
    pub is_redeemed: bool,              // 是否已赎回
    pub unification_achieved: bool,      // 是否已统一
    pub minted_at: i64,                 // 铸造时间
    pub bump: u8,                       // PDA bump
    pub twscoin_mint: Pubkey,           // TWSCoin 铸造地址
    pub oracle_address: Option<Pubkey>, // 预言机地址（可选）
}

impl Bunker {
    pub const LEN: usize = 32      // authority
        + 8                         // bunker_id
        + 4 + 32                    // sector_code (String, max 32 chars)
        + 8                         // total_shares
        + 8                         // minted_shares
        + 8                         // price_per_share
        + 1                         // is_redeemed
        + 1                         // unification_achieved
        + 8                         // minted_at
        + 1                         // bump
        + 32                        // twscoin_mint
        + 1 + 32;                   // oracle_address (Option<Pubkey>)
}

/// 拍卖资产账户结构
#[account]
pub struct AuctionAsset {
    pub owner: Pubkey,              // 当前持有者
    pub price: u64,                 // 当前价格 (TaiOneToken, 9 decimals)
    pub taunt_message: String,      // 嘲讽留言 (最大 100 字符)
    pub asset_id: u64,              // 资产ID（关联到 bunker_id）
    pub created_at: i64,            // 创建时间
    pub last_seized_at: i64,        // 最后被夺取时间
    pub bump: u8,                   // PDA bump
    pub twscoin_mint: Pubkey,       // TaiOneToken 铸造地址
    pub treasury: Pubkey,           // TWS 财库地址
}

impl AuctionAsset {
    pub const LEN: usize = 32       // owner
        + 8                          // price
        + 4 + 100                    // taunt_message (String, max 100 chars)
        + 8                          // asset_id
        + 8                          // created_at
        + 8                          // last_seized_at
        + 1                          // bump
        + 32                         // twscoin_mint
        + 32;                        // treasury
}

/// 初始化资产账户上下文
#[derive(Accounts)]
#[instruction(bunker_id: u64)]
pub struct InitializeBunker<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Bunker::LEN,
        seeds = [b"bunker", bunker_id.to_le_bytes().as_ref()],
        bump
    )]
    pub bunker: Account<'info, Bunker>,
    
    /// CHECK: 验证这是正确的 TaiOneToken mint 地址
    /// TaiOneToken Mint: ZRGboZN3K6JZYhGe8PHDcazwKuqhgp2tTG7h8G5fKGk
    pub twscoin_mint: AccountInfo<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// 铸造资产份额上下文
#[derive(Accounts)]
pub struct MintBunkerShares<'info> {
    #[account(mut)]
    pub bunker: Account<'info, Bunker>,
    
    /// CHECK: TaiOneToken mint 账户
    pub twscoin_mint: AccountInfo<'info>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub bunker_token_account: Account<'info, TokenAccount>,
    
    pub user_authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

/// 触发统一事件上下文
#[derive(Accounts)]
pub struct TriggerUnification<'info> {
    #[account(mut)]
    pub bunker: Account<'info, Bunker>,
    pub authority: Signer<'info>,
}

/// 设置预言机地址上下文
#[derive(Accounts)]
pub struct SetOracleAddress<'info> {
    #[account(mut)]
    pub bunker: Account<'info, Bunker>,
    pub authority: Signer<'info>,
}

/// 赎回资产上下文
#[derive(Accounts)]
pub struct RedeemProperty<'info> {
    #[account(mut)]
    pub bunker: Account<'info, Bunker>,
    
    /// CHECK: TaiOneToken mint 账户
    pub twscoin_mint: AccountInfo<'info>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub bunker_token_account: Account<'info, TokenAccount>,
    
    pub user_authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

/// 初始化拍卖上下文
#[derive(Accounts)]
#[instruction(asset_id: u64)]
pub struct InitializeAuction<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + AuctionAsset::LEN,
        seeds = [b"auction", asset_id.to_le_bytes().as_ref()],
        bump
    )]
    pub auction: Account<'info, AuctionAsset>,
    
    /// CHECK: TaiOneToken mint 地址
    pub twscoin_mint: AccountInfo<'info>,
    
    /// CHECK: TWS 财库地址
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// 夺取资产上下文
#[derive(Accounts)]
pub struct SeizeAsset<'info> {
    #[account(mut)]
    pub auction: Account<'info, AuctionAsset>,
    
    /// CHECK: TaiOneToken mint 账户
    pub twscoin_mint: AccountInfo<'info>,
    
    /// CHECK: 旧房主的 TWSCoin 账户
    #[account(mut)]
    pub old_owner_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: TaiOne 财库的 TaiOneToken 账户
    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: 新房主的 TaiOneToken 账户（出价者）
    #[account(mut)]
    pub new_owner_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub new_owner: Signer<'info>, // 出价者（你）
    
    /// CHECK: 旧房主账户（用于验证）
    pub old_owner: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
}

/// 事件定义
#[event]
pub struct BunkerInitialized {
    pub bunker_id: u64,
    pub sector_code: String,
    pub total_shares: u64,
    pub authority: Pubkey,
}

#[event]
pub struct BunkerMinted {
    pub bunker_id: u64,
    pub amount: u64,
    pub to: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct UnificationAchieved {
    pub bunker_id: u64,
    pub timestamp: i64,
}

#[event]
pub struct DoomsdayTriggered {
    pub timestamp: i64,
}

#[event]
pub struct AssetRedeemed {
    pub bunker_id: u64,
    pub amount: u64,
    pub redeemer: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AuctionInitialized {
    pub asset_id: u64,
    pub start_price: u64,
    pub owner: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AssetSeized {
    pub asset_id: u64,
    pub new_owner: Pubkey,
    pub old_owner: Pubkey,
    pub price: u64,
    pub fee: u64,
    pub payout: u64,
    pub timestamp: i64,
}

/// 错误码定义
#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient shares available")]
    InsufficientShares,
    #[msg("Unification already achieved")]
    UnificationAlreadyAchieved,
    #[msg("Unification not achieved yet")]
    UnificationNotAchieved,
    #[msg("Property already redeemed")]
    PropertyAlreadyRedeemed,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid token mint address")]
    InvalidTokenMint,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Math overflow in calculation")]
    MathOverflow,
    #[msg("Invalid old owner address")]
    InvalidOldOwner,
    #[msg("Message too long (max 100 characters)")]
    MessageTooLong,
}

