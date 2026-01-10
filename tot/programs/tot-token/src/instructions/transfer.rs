// ============================================
// 文件: programs/tot-token/src/instructions/transfer.rs
// 带税转账指令
// ============================================

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    self, Mint, TokenAccount, TokenInterface, TransferChecked, Burn,
};

use crate::state::config::TotConfig;
use crate::state::tax::TaxConfig;
use crate::state::holder::HolderAccount;
use crate::constants::seeds;
use crate::errors::TotError;
use crate::utils::tax_calculator::*;
use crate::utils::validation::validate_transfer_amount;

/// 带税转账账户结构
#[derive(Accounts)]
pub struct TransferWithTax<'info> {
    /// 发送者（签名者）
    #[account(mut)]
    pub sender: Signer<'info>,

    /// 发送者代币账户
    #[account(
        mut,
        constraint = sender_token_account.owner == sender.key() @ TotError::InvalidOwner,
        constraint = sender_token_account.mint == mint.key() @ TotError::InvalidMint
    )]
    pub sender_token_account: InterfaceAccount<'info, TokenAccount>,

    /// 接收者代币账户
    #[account(
        mut,
        constraint = receiver_token_account.mint == mint.key() @ TotError::InvalidMint
    )]
    pub receiver_token_account: InterfaceAccount<'info, TokenAccount>,

    /// TOT Mint
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,

    /// 全局配置
    #[account(
        seeds = [seeds::CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, TotConfig>,

    /// 税率配置
    #[account(
        seeds = [seeds::TAX_CONFIG_SEED],
        bump
    )]
    pub tax_config: Account<'info, TaxConfig>,

    /// 发送者持有者信息
    #[account(
        mut,
        seeds = [seeds::HOLDER_SEED, sender.key().as_ref()],
        bump = sender_holder_info.bump
    )]
    pub sender_holder_info: Account<'info, HolderAccount>,

    /// 接收者持有者信息（可能需要初始化）
    /// CHECK: 如果不存在，需要先初始化
    pub receiver_holder_info: Option<Account<'info, HolderAccount>>,

    /// 税收收集账户（流动性池）
    #[account(mut)]
    pub tax_collector: InterfaceAccount<'info, TokenAccount>,

    /// Token 程序
    pub token_program: Interface<'info, TokenInterface>,
}

/// 带税转账处理器
pub fn transfer_with_tax_handler(
    ctx: Context<TransferWithTax>,
    amount: u64,
    is_sell: bool,
) -> Result<()> {
    let config = &ctx.accounts.config;
    let tax_config = &ctx.accounts.tax_config;
    let sender_holder = &mut ctx.accounts.sender_holder_info;
    let clock = Clock::get()?;

    // 检查系统是否暂停
    require!(!config.panic_mode || !is_sell, TotError::SystemPaused);

    // 检查发送者是否被冻结
    require!(!sender_holder.is_frozen, TotError::AccountFrozen);

    // 检查金额
    validate_transfer_amount(amount)?;

    // 检查是否免税
    let sender_exempt = tax_config.is_exempt(&ctx.accounts.sender.key());
    let receiver_exempt = ctx.accounts.receiver_token_account.owner == Pubkey::default()
        || tax_config.is_exempt(&ctx.accounts.receiver_token_account.owner);

    let tax_calculation = if sender_exempt || receiver_exempt {
        // 免税转账
        TaxCalculation {
            base_tax_bps: 0,
            holding_discount_bps: 0,
            whale_tax_bps: 0,
            final_tax_bps: 0,
            tax_amount: 0,
            net_amount: amount,
        }
    } else {
        // 计算税率
        TaxCalculator::calculate_tax(
            amount,
            Some(sender_holder),
            ctx.accounts.mint.supply,
            clock.unix_timestamp,
            false, // 普通转账不是买入
            is_sell,
            tax_config,
        )?
    };

    msg!(
        "Transfer: {} tokens, Tax: {} ({}bps), Net: {}",
        amount,
        tax_calculation.tax_amount,
        tax_calculation.final_tax_bps,
        tax_calculation.net_amount
    );

    // 执行转账 - 净金额给接收者
    if tax_calculation.net_amount > 0 {
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.sender_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.receiver_token_account.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
        );

        token_interface::transfer_checked(
            transfer_ctx,
            tax_calculation.net_amount,
            ctx.accounts.mint.decimals,
        )?;
    }

    // 处理税收
    if tax_calculation.tax_amount > 0 {
        let tax_distribution = TaxDistribution::calculate(tax_calculation.tax_amount);

        // 销毁部分
        if tax_distribution.to_burn > 0 {
            let burn_ctx = CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.sender_token_account.to_account_info(),
                    authority: ctx.accounts.sender.to_account_info(),
                },
            );

            token_interface::burn(burn_ctx, tax_distribution.to_burn)?;
            
            msg!("Burned: {} tokens", tax_distribution.to_burn);
        }

        // 转入税收收集账户（流动性 + 社区 + 营销）
        let remaining_tax = tax_calculation.tax_amount
            .saturating_sub(tax_distribution.to_burn);

        if remaining_tax > 0 {
            let tax_transfer_ctx = CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.sender_token_account.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.tax_collector.to_account_info(),
                    authority: ctx.accounts.sender.to_account_info(),
                },
            );

            token_interface::transfer_checked(
                tax_transfer_ctx,
                remaining_tax,
                ctx.accounts.mint.decimals,
            )?;

            msg!("Tax collected: {} tokens", remaining_tax);
        }
    }

    // 更新持有者信息
    if is_sell {
        sender_holder.record_sell(amount, tax_calculation.tax_amount, clock.unix_timestamp)?;
    }

    // 发出事件
    emit!(TransferWithTaxEvent {
        from: ctx.accounts.sender.key(),
        to: ctx.accounts.receiver_token_account.owner,
        amount,
        tax_amount: tax_calculation.tax_amount,
        net_amount: tax_calculation.net_amount,
        tax_rate_bps: tax_calculation.final_tax_bps,
        burned: TaxDistribution::calculate(tax_calculation.tax_amount).to_burn,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// 转账事件
#[event]
pub struct TransferWithTaxEvent {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub tax_amount: u64,
    pub net_amount: u64,
    pub tax_rate_bps: u16,
    pub burned: u64,
    pub timestamp: i64,
}
