use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Burn};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod prediction_market {
    use super::*;

    // 1. 初始化市场 (仅管理员)
    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        question: String,
        end_timestamp: i64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        market.authority = ctx.accounts.authority.key();
        market.question = question;
        market.end_timestamp = end_timestamp;
        market.total_pool_yes = 0;
        market.total_pool_no = 0;
        market.is_resolved = false;
        market.outcome = Outcome::Undecided;
        market.bump = *ctx.bumps.get("market").unwrap();
        Ok(())
    }

    // 2. 下注 (用户)
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        amount: u64,
        choice: Outcome,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let user_token_account = &ctx.accounts.user_token_account;
        
        // 检查时间
        let clock = Clock::get()?;
        if clock.unix_timestamp > market.end_timestamp {
            return err!(ErrorCode::MarketEnded);
        }

        // 门槛检查：持有 > 10,000 TWSCoin
        // 注意：这里检查的是余额账户。实际项目中可能需要检查用户的"主"代币账户，
        // 或者假设下注用的币就是 TWSCoin，那么余额自然要够。
        // 这里我们假设 bet_token 就是 TWSCoin。
        if user_token_account.amount < 10_000 * 1_000_000 { // 假设 6 decimals
            return err!(ErrorCode::InsufficientHolding);
        }

        // 转移代币到 Market Vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.market_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        token::transfer(CpiContext::new(cpi_program, cpi_accounts), amount)?;

        // 更新市场池子
        match choice {
            Outcome::Yes => market.total_pool_yes += amount,
            Outcome::No => market.total_pool_no += amount,
            _ => return err!(ErrorCode::InvalidOutcome),
        }

        // 记录/更新用户注单
        let bet = &mut ctx.accounts.bet;
        bet.user = ctx.accounts.user.key();
        bet.market = market.key();
        match choice {
            Outcome::Yes => bet.amount_yes += amount,
            Outcome::No => bet.amount_no += amount,
            _ => {},
        }
        
        Ok(())
    }

    // 3. 上帝裁决 (仅管理员)
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        outcome: Outcome,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(!market.is_resolved, ErrorCode::AlreadyResolved);
        require!(outcome != Outcome::Undecided, ErrorCode::InvalidOutcome);

        market.outcome = outcome;
        market.is_resolved = true;
        
        Ok(())
    }

    // 4. 领奖 (赢家)
    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let bet = &mut ctx.accounts.bet;
        
        require!(market.is_resolved, ErrorCode::MarketNotResolved);
        require!(!bet.claimed, ErrorCode::AlreadyClaimed);

        let total_pool = market.total_pool_yes + market.total_pool_no;
        let mut reward_amount = 0;

        // 计算奖金
        match market.outcome {
            Outcome::Yes => {
                if bet.amount_yes > 0 && market.total_pool_yes > 0 {
                    // 份额 = (我的YES / 总YES) * 总池子
                    reward_amount = (bet.amount_yes as u128 * total_pool as u128 / market.total_pool_yes as u128) as u64;
                }
            },
            Outcome::No => {
                if bet.amount_no > 0 && market.total_pool_no > 0 {
                    // 份额 = (我的NO / 总NO) * 总池子
                    reward_amount = (bet.amount_no as u128 * total_pool as u128 / market.total_pool_no as u128) as u64;
                }
            },
            _ => return err!(ErrorCode::InvalidOutcome),
        }

        require!(reward_amount > 0, ErrorCode::NoReward);

        // 扣除 5% 手续费销毁
        let fee = reward_amount * 5 / 100;
        let user_receive = reward_amount - fee;

        // 转账给用户
        let seeds = &[
            b"market".as_ref(), 
            market.question.as_bytes(),
            &[market.bump]
        ];
        let signer = &[&seeds[..]];

        let transfer_cpi = Transfer {
            from: ctx.accounts.market_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: market.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                transfer_cpi,
                signer
            ),
            user_receive
        )?;

        // 销毁手续费
        let burn_cpi = Burn {
            mint: ctx.accounts.token_mint.to_account_info(),
            from: ctx.accounts.market_vault.to_account_info(),
            authority: market.to_account_info(),
        };
        token::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                burn_cpi,
                signer
            ),
            fee
        )?;

        bet.claimed = true;
        Ok(())
    }
}

// 数据结构
#[derive(Accounts)]
#[instruction(question: String)]
pub struct InitializeMarket<'info> {
    #[account(
        init, 
        payer = authority, 
        space = 8 + 32 + 200 + 8 + 8 + 8 + 1 + 1 + 1, // 估算空间
        seeds = [b"market", question.as_bytes()],
        bump
    )]
    pub market: Account<'info, Market>,
    
    #[account(
        init,
        payer = authority,
        token::mint = token_mint,
        token::authority = market,
        seeds = [b"vault", market.key().as_ref()],
        bump
    )]
    pub market_vault: Account<'info, TokenAccount>,
    
    pub token_mint: Account<'info, token::Mint>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 32 + 8 + 8 + 1,
        seeds = [b"bet", market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub bet: Account<'info, Bet>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub market_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut, has_one = authority)]
    pub market: Account<'info, Market>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(mut, has_one = user, has_one = market)]
    pub bet: Account<'info, Bet>,
    
    #[account(mut)]
    pub market_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub token_mint: Account<'info, token::Mint>, // 用于销毁
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Market {
    pub authority: Pubkey,
    pub question: String,
    pub end_timestamp: i64,
    pub total_pool_yes: u64,
    pub total_pool_no: u64,
    pub is_resolved: bool,
    pub outcome: Outcome,
    pub bump: u8,
}

#[account]
pub struct Bet {
    pub user: Pubkey,
    pub market: Pubkey,
    pub amount_yes: u64,
    pub amount_no: u64,
    pub claimed: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Outcome {
    Undecided,
    Yes,
    No,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Market has ended")]
    MarketEnded,
    #[msg("Insufficient TaiOneToken holdings (Need > 10,000)")]
    InsufficientHolding,
    #[msg("Invalid outcome")]
    InvalidOutcome,
    #[msg("Market already resolved")]
    AlreadyResolved,
    #[msg("Market not resolved yet")]
    MarketNotResolved,
    #[msg("Reward already claimed")]
    AlreadyClaimed,
    #[msg("No reward to claim")]
    NoReward,
}
