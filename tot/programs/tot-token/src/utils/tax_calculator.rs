// ============================================
// 文件: programs/tot-token/src/utils/tax_calculator.rs
// 动态税率计算器
// 实现 TOT 动态重力场税收模型 (TOT-DGTM)
// ============================================

use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::holder::HolderAccount;
use crate::state::tax::TaxConfig;
use crate::utils::math::*;

/// 税率计算结果
#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct TaxCalculation {
    /// 基础税率 (basis points)
    pub base_tax_bps: u16,
    /// 持有时间折扣 (basis points 减少)
    pub holding_discount_bps: u16,
    /// 大额交易附加税 (basis points)
    pub whale_tax_bps: u16,
    /// 最终税率 (basis points)
    pub final_tax_bps: u16,
    /// 税额
    pub tax_amount: u64,
    /// 净转账金额
    pub net_amount: u64,
}

/// 税率计算器
/// 实现动态税率公式: Tax_sell = Base + (P_impact / L) × α + 1/(T_hold + 1)^β × γ
pub struct TaxCalculator;

impl TaxCalculator {
    /// 计算完整的税率
    /// 
    /// # Arguments
    /// * `amount` - 转账金额
    /// * `holder_info` - 持有者信息（可选，新用户为 None）
    /// * `total_supply` - 总供应量
    /// * `current_timestamp` - 当前时间戳
    /// * `is_buy` - 是否为买入操作
    /// * `is_sell` - 是否为卖出操作
    /// * `tax_config` - 税收配置
    pub fn calculate_tax(
        amount: u64,
        holder_info: Option<&HolderAccount>,
        total_supply: u64,
        current_timestamp: i64,
        is_buy: bool,
        is_sell: bool,
        tax_config: &TaxConfig,
    ) -> Result<TaxCalculation> {
        // 1. 确定基础税率
        let base_tax_bps = tax_config.base_tax_bps;

        // 2. 计算持有时间折扣
        let holding_discount_bps = Self::calculate_holding_discount(
            holder_info,
            current_timestamp,
            tax_config,
        )?;

        // 3. 计算大额交易附加税（仅对卖出）
        let whale_tax_bps = if is_sell {
            Self::calculate_whale_tax(amount, total_supply)?
        } else {
            0
        };

        // 4. 计算最终税率
        // 最终税率 = 基础税率 - 持有折扣 + 大额附加税
        let after_discount = base_tax_bps.saturating_sub(holding_discount_bps);
        let final_tax_bps = after_discount.saturating_add(whale_tax_bps);
        
        // 限制最大税率为 MAX_TAX_BPS (99%)
        let final_tax_bps = std::cmp::min(final_tax_bps, tax::MAX_TAX_BPS);

        // 5. 计算税额和净金额
        let tax_amount = Self::calculate_tax_amount(amount, final_tax_bps)?;
        let net_amount = safe_sub(amount, tax_amount)?;

        Ok(TaxCalculation {
            base_tax_bps,
            holding_discount_bps,
            whale_tax_bps,
            final_tax_bps,
            tax_amount,
            net_amount,
        })
    }

    /// 计算持有时间折扣
    /// 
    /// 基于公式: 1/(T_hold + 1)^β × γ
    /// 折扣规则：
    /// - 0-30 天: 无折扣
    /// - 30-90 天: 10% 折扣
    /// - 90-180 天: 25% 折扣
    /// - 180-365 天: 50% 折扣
    /// - 365+ 天: 75% 折扣 (最大)
    fn calculate_holding_discount(
        holder_info: Option<&HolderAccount>,
        current_timestamp: i64,
        tax_config: &TaxConfig,
    ) -> Result<u16> {
        let holder = match holder_info {
            Some(h) => h,
            None => return Ok(0), // 新用户无折扣
        };

        // 计算持有天数
        let holding_days = holder.get_holding_days(current_timestamp);
        
        // 根据持有天数确定折扣层级
        let discount_bps = if holding_days >= 365 {
            // 365+ 天: 75% 折扣
            7500
        } else if holding_days >= 180 {
            // 180-365 天: 50% 折扣
            5000
        } else if holding_days >= 90 {
            // 90-180 天: 25% 折扣
            2500
        } else if holding_days >= 30 {
            // 30-90 天: 10% 折扣
            1000
        } else {
            // 0-30 天: 无折扣
            0
        };

        // 应用折扣到基础税率
        // 折扣 = 基础税率 * discount_bps / 10000
        let discount_amount = calculate_bps(tax_config.base_tax_bps as u64, discount_bps as u16)?;
        
        Ok(discount_amount as u16)
    }

    /// 计算大额交易附加税
    /// 
    /// 基于公式: (P_impact / L) × α
    /// 规则：
    /// - 交易量 < 0.1% 总供应: 无附加税
    /// - 0.1% - 0.5%: +1% 附加税
    /// - 0.5% - 1%: +2% 附加税
    /// - 1% - 2%: +3% 附加税
    /// - > 2%: +5% 附加税
    fn calculate_whale_tax(amount: u64, total_supply: u64) -> Result<u16> {
        if total_supply == 0 {
            return Ok(0);
        }

        // 计算交易占比 (basis points)
        let ratio_bps = (amount as u128)
            .checked_mul(10000)
            .and_then(|v| v.checked_div(total_supply as u128))
            .unwrap_or(0) as u16;

        // 根据占比确定附加税
        let whale_tax_bps = if ratio_bps >= 200 {
            // > 2%
            500 // +5%
        } else if ratio_bps >= 100 {
            // 1% - 2%
            300 // +3%
        } else if ratio_bps >= 50 {
            // 0.5% - 1%
            200 // +2%
        } else if ratio_bps >= 10 {
            // 0.1% - 0.5%
            100 // +1%
        } else {
            0
        };

        Ok(whale_tax_bps)
    }

    /// 计算税额
    fn calculate_tax_amount(amount: u64, tax_bps: u16) -> Result<u64> {
        calculate_bps(amount, tax_bps)
    }

    /// 检查是否为免税地址
    pub fn is_tax_exempt(address: &Pubkey, tax_config: &TaxConfig) -> bool {
        tax_config.is_exempt(address)
    }
}

/// 税收分配计算
/// 根据配置的分配比例计算税收的分配
#[derive(Debug, Clone)]
pub struct TaxDistribution {
    pub to_burn: u64,           // 销毁
    pub to_liquidity: u64,      // 流动性池
    pub to_community: u64,      // 社区奖励
    pub to_marketing: u64,      // 营销
}

impl TaxDistribution {
    /// 计算税收分配
    /// 
    /// 分配比例（根据constants.rs）：
    /// - 40% 销毁
    /// - 30% 流动性池
    /// - 20% 社区奖励
    /// - 10% 营销
    pub fn calculate(total_tax: u64) -> Self {
        let to_burn = calculate_bps(total_tax, tax::TAX_TO_BURN_BPS).unwrap_or(0);
        let to_liquidity = calculate_bps(total_tax, tax::TAX_TO_LIQUIDITY_BPS).unwrap_or(0);
        let to_community = calculate_bps(total_tax, tax::TAX_TO_COMMUNITY_BPS).unwrap_or(0);
        let to_marketing = total_tax
            .saturating_sub(to_burn)
            .saturating_sub(to_liquidity)
            .saturating_sub(to_community);

        Self {
            to_burn,
            to_liquidity,
            to_community,
            to_marketing,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::tax::TaxConfig;

    fn create_test_tax_config() -> TaxConfig {
        TaxConfig {
            base_tax_bps: 200, // 2%
            alpha: 500,
            beta: 50,
            gamma_bps: 2000,
            panic_threshold_bps: 50,
            panic_tax_bps: 3000,
            enabled: true,
            exempt_addresses: vec![],
            last_updated: 0,
            bump: 0,
        }
    }

    #[test]
    fn test_basic_tax_calculation() {
        let tax_config = create_test_tax_config();
        let result = TaxCalculator::calculate_tax(
            1_000_000, // 1M tokens
            None,      // 新用户
            1_000_000_000_000, // 1T total supply
            0,
            false,
            true, // 卖出
            &tax_config,
        ).unwrap();

        assert_eq!(result.base_tax_bps, 200);
        assert_eq!(result.holding_discount_bps, 0);
        assert_eq!(result.whale_tax_bps, 0); // 小额交易
    }

    #[test]
    fn test_whale_tax() {
        let tax_config = create_test_tax_config();
        let total_supply = 1_000_000_000_000u64; // 1T
        let large_amount = total_supply * 3 / 100; // 3% of supply

        let result = TaxCalculator::calculate_tax(
            large_amount,
            None,
            total_supply,
            0,
            false,
            true,
            &tax_config,
        ).unwrap();

        assert_eq!(result.whale_tax_bps, 500); // +5% for > 2%
    }

    #[test]
    fn test_tax_distribution() {
        let total_tax = 1000u64;
        let dist = TaxDistribution::calculate(total_tax);

        assert_eq!(dist.to_burn, 400); // 40%
        assert_eq!(dist.to_liquidity, 300); // 30%
        assert_eq!(dist.to_community, 200); // 20%
        assert_eq!(dist.to_marketing, 100); // 10%
    }
}
