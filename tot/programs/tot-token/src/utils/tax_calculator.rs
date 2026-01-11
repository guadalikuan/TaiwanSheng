use anchor_lang::prelude::*;
use crate::state::holder::HolderAccount;
use crate::state::tax::TaxConfig;
use crate::errors::TotError;

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct TaxCalculation {
    pub base_tax_bps: u16,
    pub holding_discount_bps: u16,
    pub whale_tax_bps: u16,
    pub final_tax_bps: u16,
    pub tax_amount: u64,
    pub net_amount: u64,
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct TaxDistribution {
    pub to_burn: u64,
    pub to_liquidity: u64,
    pub to_community: u64,
    pub to_marketing: u64,
}

impl TaxDistribution {
    pub fn calculate(tax_amount: u64) -> Result<Self> {
        // 40% Burn
        let to_burn = tax_amount.checked_mul(40).ok_or(error!(TotError::MathOverflow))?
            .checked_div(100).ok_or(error!(TotError::DivisionByZero))?;

        // 30% Liquidity
        let to_liquidity = tax_amount.checked_mul(30).ok_or(error!(TotError::MathOverflow))?
            .checked_div(100).ok_or(error!(TotError::DivisionByZero))?;

        // 20% Community
        let to_community = tax_amount.checked_mul(20).ok_or(error!(TotError::MathOverflow))?
            .checked_div(100).ok_or(error!(TotError::DivisionByZero))?;

        // 10% Marketing (Remaining to ensure total matches)
        let to_marketing = tax_amount.checked_sub(to_burn).ok_or(error!(TotError::MathUnderflow))?
            .checked_sub(to_liquidity).ok_or(error!(TotError::MathUnderflow))?
            .checked_sub(to_community).ok_or(error!(TotError::MathUnderflow))?;

        Ok(Self {
            to_burn,
            to_liquidity,
            to_community,
            to_marketing,
        })
    }
}

pub struct TaxCalculator;

impl TaxCalculator {
    pub fn calculate_tax(
        amount: u64,
        holder_info: Option<&HolderAccount>,
        total_supply: u64,
        current_timestamp: i64,
        _is_buy: bool,
        is_sell: bool,
        tax_config: &TaxConfig,
    ) -> Result<TaxCalculation> {
        let base_tax_bps = tax_config.base_tax_bps;

        let holding_discount_bps = Self::calculate_holding_discount(
            holder_info,
            current_timestamp,
            tax_config,
        )?;

        let whale_tax_bps = if is_sell {
            Self::calculate_whale_tax(
                amount,
                total_supply,
                tax_config,
            )?
        } else {
            0
        };

        let mut final_tax_bps = base_tax_bps;
        
        if final_tax_bps > holding_discount_bps {
            final_tax_bps -= holding_discount_bps;
        } else {
            final_tax_bps = 0;
        }
        
        final_tax_bps = final_tax_bps.checked_add(whale_tax_bps)
            .ok_or(error!(TotError::MathOverflow))?;
            
        if final_tax_bps > 9900 {
            final_tax_bps = 9900;
        }

        let tax_amount = (amount as u128)
            .checked_mul(final_tax_bps as u128)
            .ok_or(error!(TotError::MathOverflow))?
            .checked_div(10000)
            .ok_or(error!(TotError::DivisionByZero))? as u64;

        let net_amount = amount.checked_sub(tax_amount)
            .ok_or(error!(TotError::MathUnderflow))?;

        Ok(TaxCalculation {
            base_tax_bps,
            holding_discount_bps,
            whale_tax_bps,
            final_tax_bps,
            tax_amount,
            net_amount,
        })
    }

    fn calculate_holding_discount(
        holder_info: Option<&HolderAccount>,
        current_timestamp: i64,
        tax_config: &TaxConfig,
    ) -> Result<u16> {
        if let Some(holder) = holder_info {
            let holding_time = current_timestamp.checked_sub(holder.first_hold_time)
                .ok_or(error!(TotError::MathUnderflow))?;
            
            if holding_time < 0 {
                return Ok(0);
            }
            
            let holding_days = (holding_time as u64) / 86400;
            
            // Discount = gamma / (days + 1)^beta
            // Simplified: gamma * 100 / sqrt(days + 1) if beta is 0.5
            // Using pre-calculated logic or approximation
            
            // For now, using linear interpolation based on tiers as approximation if formula is complex
            // or simple step function as defined in requirements
            // Requirement:
            // 30 days: 10%
            // 90 days: 25%
            // 180 days: 50%
            // 365 days: 75%
            
            // Assuming base tax is around 5-10% (500-1000 bps)
            // Discount is percentage of TAX, not bps directly? 
            // "Hold for 30 days -> 10% tax discount" usually means tax * 0.9
            
            // But here we return bps to subtract.
            // Let's assume the discount is percentage of Base Tax.
            
            let discount_percent = if holding_days >= 365 {
                75
            } else if holding_days >= 180 {
                50
            } else if holding_days >= 90 {
                25
            } else if holding_days >= 30 {
                10
            } else {
                0
            };
            
            let discount_bps = (tax_config.base_tax_bps as u64)
                .checked_mul(discount_percent)
                .ok_or(error!(TotError::MathOverflow))?
                .checked_div(100)
                .ok_or(error!(TotError::DivisionByZero))? as u16;
                
            Ok(discount_bps)
        } else {
            Ok(0)
        }
    }

    fn calculate_whale_tax(
        amount: u64,
        total_supply: u64,
        tax_config: &TaxConfig,
    ) -> Result<u16> {
        // Panic Threshold: e.g. 1% of total supply
        let threshold_amount = (total_supply as u128)
            .checked_mul(tax_config.panic_threshold_bps as u128)
            .ok_or(error!(TotError::MathOverflow))?
            .checked_div(10000)
            .ok_or(error!(TotError::DivisionByZero))? as u64;
            
        if amount >= threshold_amount {
            Ok(tax_config.panic_tax_bps)
        } else {
            Ok(0)
        }
    }
}
