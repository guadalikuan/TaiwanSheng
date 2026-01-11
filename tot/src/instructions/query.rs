// ============================================
// 文件: src/instructions/query.rs
// 查询指令（只读）
// ============================================

use anchor_lang::prelude::*;
use crate::state::config::TotConfig;
use crate::state::tax::TaxConfig;
use crate::state::holder::HolderAccount;
use crate::constants::seeds;
use crate::utils::tax_calculator::*;

/// 税率折扣等级枚举
/// 
/// 使用枚举替代String类型，减少序列化开销和gas消耗
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum DiscountTier {
    None,
    Bronze,    // 10% discount (30-90 days)
    Silver,    // 25% discount (90-180 days)
    Gold,      // 50% discount (180-365 days)
    Diamond,   // 75% discount (365+ days)
}

/// 计算税率（只读查询）
#[derive(Accounts)]
pub struct CalculateTax<'info> {
    /// 查询者（可以是任何人）
    pub user: Signer<'info>,

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

    /// Mint（用于获取总供应量）
    pub mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,

    /// 用户持有者信息（可选）
    pub holder_info: Option<Account<'info, HolderAccount>>,
}

/// 计算税率处理器
pub fn calculate_tax_handler(
    ctx: Context<CalculateTax>,
    amount: u64,
    is_buy: bool,
    is_sell: bool,
) -> Result<TaxCalculationResult> {
    let clock = Clock::get()?;
    
    let holder_ref = ctx.accounts.holder_info.as_ref().map(|h| h.as_ref());

    let calculation = TaxCalculator::calculate_tax(
        amount,
        holder_ref,
        ctx.accounts.mint.supply,
        clock.unix_timestamp,
        is_buy,
        is_sell,
        &ctx.accounts.tax_config,
    )?;

    Ok(TaxCalculationResult {
        base_tax_bps: calculation.base_tax_bps,
        holding_discount_bps: calculation.holding_discount_bps,
        whale_tax_bps: calculation.whale_tax_bps,
        final_tax_bps: calculation.final_tax_bps,
        tax_amount: calculation.tax_amount,
        net_amount: calculation.net_amount,
    })
}

/// 获取持有者统计
#[derive(Accounts)]
pub struct GetHolderStats<'info> {
    #[account(
        seeds = [seeds::HOLDER_SEED, holder_info.owner.as_ref()],
        bump = holder_info.bump
    )]
    pub holder_info: Account<'info, HolderAccount>,
}

/// 持有者统计结果
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct HolderStats {
    pub owner: Pubkey,
    pub holding_days: u64,
    pub total_bought: u64,
    pub total_sold: u64,
    pub total_tax_paid: u64,
    pub is_frozen: bool,
    pub tax_discount_tier: DiscountTier,
}

/// 获取持有者统计处理器
pub fn get_holder_stats_handler(
    ctx: Context<GetHolderStats>,
) -> Result<HolderStats> {
    let holder = &ctx.accounts.holder_info;
    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;  // 缓存timestamp以提高一致性
    
    let holding_days = holder.get_holding_days(timestamp);

    // 折扣等级判断（从高到低）
    // 使用枚举替代String，减少序列化开销和gas消耗
    // 365+天: Diamond (75%折扣)
    // 180-364天: Gold (50%折扣)
    // 90-179天: Silver (25%折扣)
    // 30-89天: Bronze (10%折扣)
    // 0-29天: None (无折扣)
    let tax_discount_tier = if holding_days >= 365 {
        DiscountTier::Diamond
    } else if holding_days >= 180 {
        DiscountTier::Gold
    } else if holding_days >= 90 {
        DiscountTier::Silver
    } else if holding_days >= 30 {
        DiscountTier::Bronze
    } else {
        DiscountTier::None
    };

    Ok(HolderStats {
        owner: holder.owner,
        holding_days,
        total_bought: holder.total_bought,
        total_sold: holder.total_sold,
        total_tax_paid: holder.total_tax_paid,
        is_frozen: holder.is_frozen,
        tax_discount_tier,
    })
}

/// 税率计算结果（用于返回给客户端）
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TaxCalculationResult {
    pub base_tax_bps: u16,
    pub holding_discount_bps: u16,
    pub whale_tax_bps: u16,
    pub final_tax_bps: u16,
    pub tax_amount: u64,
    pub net_amount: u64,
}
