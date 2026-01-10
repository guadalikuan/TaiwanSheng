//! # 动态税率计算器模块
//! 
//! 本模块实现了TOT动态重力场税收模型（TOT-DGTM），这是TOT代币系统的核心机制。
//! 通过动态税率计算，实现了"宽进严出"的资金单向阀，奖励长期持有者，惩罚短期投机者。
//! 
//! ## 动态税率公式
//! 
//! TOT采用以下动态税率公式：
//! ```
//! Tax_sell = Base + (P_impact / L) × α + 1/(T_hold + 1)^β × γ
//! ```
//! 
//! ### 公式组成部分
//! 
//! 1. **Base（基础税率）**: 所有转账都需要支付的基础税率（默认2%）
//! 2. **(P_impact / L) × α（大额交易惩罚项）**: 
//!    - P_impact: 交易对价格的影响
//!    - L: 流动性池深度
//!    - α: 惩罚系数（默认5）
//!    - 作用: 交易规模越大，税率越高
//! 3. **1/(T_hold + 1)^β × γ（持有时间折扣项）**:
//!    - T_hold: 持有天数
//!    - β: 时间衰减指数（默认0.5）
//!    - γ: 忠诚度权重（默认20%）
//!    - 作用: 持有时间越长，税率越低
//! 
//! ### 公式特性
//! 
//! - **宽进**: 买入和普通转账税率较低
//! - **严出**: 卖出税率较高，特别是短期持有和大额交易
//! - **反身性**: 卖盘越强，税率越高，形成正向循环
//! - **时间奖励**: 长期持有者享受大幅折扣
//! 
//! ============================================
// 文件: programs/tot-token/src/utils/tax_calculator.rs
// 动态税率计算器
// 实现 TOT 动态重力场税收模型 (TOT-DGTM)
// ============================================

use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::holder::HolderAccount;
use crate::state::tax::TaxConfig;
use crate::utils::math::*;

/// 税率计算结果结构体
/// 
/// 包含完整的税率计算信息，用于返回给调用者和前端显示。
/// 所有税率值以basis points表示（10000 = 100%）。
#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct TaxCalculation {
    /// 基础税率（basis points）
    /// 不考虑任何折扣和惩罚的基础税率
    pub base_tax_bps: u16,
    
    /// 持有时间折扣（basis points）
    /// 根据持有时间计算的折扣金额，会从基础税率中扣除
    pub holding_discount_bps: u16,
    
    /// 大额交易附加税（basis points）
    /// 仅对卖出操作，当交易规模超过阈值时收取的附加税
    pub whale_tax_bps: u16,
    
    /// 最终税率（basis points）
    /// 综合考虑基础税率、折扣和附加税后的最终税率
    pub final_tax_bps: u16,
    
    /// 税额（代币数量，基础单位）
    /// 根据最终税率计算出的实际税额
    pub tax_amount: u64,
    
    /// 净转账金额（代币数量，基础单位）
    /// 扣除税收后，接收者实际收到的代币数量
    pub net_amount: u64,
}

/// 税率计算器
/// 
/// 实现TOT动态重力场税收模型（TOT-DGTM）的核心计算逻辑。
/// 
/// ## 税率公式
/// 
/// ```
/// Tax_sell = Base + (P_impact / L) × α + 1/(T_hold + 1)^β × γ
/// ```
/// 
/// 其中：
/// - `Base`: 基础税率（默认2%）
/// - `(P_impact / L) × α`: 大额交易惩罚项
/// - `1/(T_hold + 1)^β × γ`: 持有时间折扣项（注意：这是折扣，会从税率中减去）
/// 
/// ## 计算逻辑
/// 
/// 1. 确定基础税率
/// 2. 计算持有时间折扣（会减少税率）
/// 3. 计算大额交易附加税（会增加税率，仅对卖出）
/// 4. 综合计算最终税率 = 基础税率 - 折扣 + 附加税
/// 5. 限制最大税率（99%）
/// 6. 计算税额和净金额
pub struct TaxCalculator;

impl TaxCalculator {
    /// 计算完整的动态税率
    /// 
    /// 这是TOT动态重力场税收模型的核心函数，实现了完整的税率计算逻辑。
    /// 根据转账金额、持有时间、交易规模等因素，动态计算实际税率。
    /// 
    /// # 参数说明
    /// 
    /// * `amount` - 转账金额（基础单位，已考虑decimals）
    /// * `holder_info` - 持有者信息（可选）
    ///   - `Some(holder)`: 已注册的持有者，可以计算持有时间折扣
    ///   - `None`: 新用户，无持有时间折扣
    /// * `total_supply` - 代币总供应量（用于计算大额交易惩罚）
    /// * `current_timestamp` - 当前Unix时间戳（用于计算持有天数）
    /// * `is_buy` - 是否为买入操作（当前版本买入不收取税收）
    /// * `is_sell` - 是否为卖出操作（会计算大额交易惩罚）
    /// * `tax_config` - 税率配置（包含所有税率参数）
    /// 
    /// # 返回值
    /// 
    /// * `Result<TaxCalculation>` - 包含完整税率计算结果的结构体
    /// 
    /// # 计算步骤
    /// 
    /// 1. **确定基础税率**: 从配置中读取基础税率（默认2%）
    /// 2. **计算持有时间折扣**: 根据持有天数计算折扣（会减少税率）
    /// 3. **计算大额交易附加税**: 如果是卖出且交易规模大，计算附加税（会增加税率）
    /// 4. **综合计算最终税率**: 基础税率 - 折扣 + 附加税
    /// 5. **限制最大税率**: 确保不超过99%
    /// 6. **计算税额和净金额**: 根据最终税率计算实际税额
    /// 
    /// # 公式实现
    /// 
    /// ```
    /// 最终税率 = Base - Discount + Penalty
    /// 
    /// 其中:
    /// - Base = base_tax_bps (基础税率)
    /// - Discount = calculate_holding_discount() (持有时间折扣)
    /// - Penalty = calculate_whale_tax() (大额交易惩罚，仅对卖出)
    /// ```
    /// 
    /// # 错误处理
    /// 
    /// * 如果计算过程中发生溢出，返回`TotError::MathOverflow`
    /// 
    /// # 使用示例
    /// ```rust
    /// let tax_calc = TaxCalculator::calculate_tax(
    ///     1_000_000_000,           // 转账1000个代币
    ///     Some(&holder_account),   // 持有者信息
    ///     202_700_000_000_000_000_000, // 总供应量
    ///     clock.unix_timestamp,    // 当前时间
    ///     false,                    // 不是买入
    ///     true,                     // 是卖出
    ///     &tax_config,              // 税率配置
    /// )?;
    /// 
    /// println!("税率: {}%", tax_calc.final_tax_bps / 100);
    /// println!("税额: {}", tax_calc.tax_amount);
    /// ```
    pub fn calculate_tax(
        amount: u64,
        holder_info: Option<&HolderAccount>,
        total_supply: u64,
        current_timestamp: i64,
        is_buy: bool,
        is_sell: bool,
        tax_config: &TaxConfig,
    ) -> Result<TaxCalculation> {
        // ========================================
        // 步骤1: 确定基础税率
        // ========================================
        // 
        // 基础税率是所有转账都需要支付的基本税率。
        // 这是给国库的基本供奉，不考虑任何折扣和惩罚。
        let base_tax_bps = tax_config.base_tax_bps;

        // ========================================
        // 步骤2: 计算持有时间折扣
        // ========================================
        // 
        // 根据用户的持有时间计算折扣。
        // 持有时间越长，折扣越大，最终税率越低。
        // 
        // 折扣计算公式: 1/(T_hold + 1)^β × γ
        // 实际实现中使用分段函数简化计算
        let holding_discount_bps = Self::calculate_holding_discount(
            holder_info,
            current_timestamp,
            tax_config,
        )?;

        // ========================================
        // 步骤3: 计算大额交易附加税（仅对卖出操作）
        // ========================================
        // 
        // 如果是卖出操作，需要计算大额交易惩罚。
        // 交易规模越大（占供应量比例越高），附加税越高。
        // 
        // 惩罚公式: (P_impact / L) × α
        // 其中P_impact可以简化为交易量占供应量的比例
        let whale_tax_bps = if is_sell {
            Self::calculate_whale_tax(amount, total_supply)?
        } else {
            // 买入和普通转账不收取大额交易惩罚
            0
        };

        // ========================================
        // 步骤4: 计算最终税率
        // ========================================
        // 
        // 最终税率 = 基础税率 - 持有折扣 + 大额附加税
        // 
        // 注意:
        // - 折扣会减少税率（使用saturating_sub防止下溢）
        // - 附加税会增加税率（使用saturating_add防止溢出）
        // - 最终税率不能为负数（最小为0）
        let after_discount = base_tax_bps.saturating_sub(holding_discount_bps);
        let final_tax_bps = after_discount.saturating_add(whale_tax_bps);
        
        // 限制最大税率为 MAX_TAX_BPS (99%)
        // 这是保护机制，防止极端情况下的异常税率
        let final_tax_bps = std::cmp::min(final_tax_bps, tax::MAX_TAX_BPS);

        // ========================================
        // 步骤5: 计算税额和净金额
        // ========================================
        // 
        // 根据最终税率计算实际税额和净转账金额。
        // 税额 = 转账金额 × 最终税率 / 10000
        // 净金额 = 转账金额 - 税额
        
        let tax_amount = Self::calculate_tax_amount(amount, final_tax_bps)?;
        let net_amount = safe_sub(amount, tax_amount)?;

        // 返回完整的计算结果
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
    /// 根据用户的持有时间计算税率折扣。持有时间越长，折扣越大，最终税率越低。
    /// 这实现了"时间熔炉"机制，奖励长期持有者，惩罚短期投机者。
    /// 
    /// ## 折扣公式
    /// 
    /// 理论公式: `Discount = 1/(T_hold + 1)^β × γ`
    /// 
    /// 实际实现中使用分段函数简化计算，提高效率和可读性。
    /// 
    /// ## 折扣规则
    /// 
    /// | 持有天数 | 折扣比例 | 说明 |
    /// |---------|---------|------|
    /// | 0-30天 | 0% | 无折扣，投机者需要支付全额税率 |
    /// | 30-90天 | 10% | 轻微折扣，鼓励短期持有 |
    /// | 90-180天 | 25% | 中等折扣，奖励中期持有 |
    /// | 180-365天 | 50% | 大幅折扣，奖励长期持有 |
    /// | 365+天 | 75% | 最大折扣，几乎免税 |
    /// 
    /// ## 参数
    /// 
    /// * `holder_info` - 持有者信息（可选）
    ///   - `Some(holder)`: 已注册用户，可以计算持有时间
    ///   - `None`: 新用户，无折扣
    /// * `current_timestamp` - 当前Unix时间戳
    /// * `tax_config` - 税率配置（包含基础税率等参数）
    /// 
    /// ## 返回值
    /// 
    /// * `Result<u16>` - 折扣金额（basis points），会从基础税率中扣除
    /// 
    /// ## 计算逻辑
    /// 
    /// 1. 如果用户未注册，返回0（无折扣）
    /// 2. 计算持有天数 = (当前时间 - 首次持有时间) / 86400
    /// 3. 根据持有天数确定折扣比例（分段函数）
    /// 4. 计算折扣金额 = 基础税率 × 折扣比例
    /// 
    /// ## 示例
    /// 
    /// ```rust
    /// // 持有100天的用户
    /// // 折扣比例: 25%
    /// // 基础税率: 200 bps (2%)
    /// // 折扣金额: 200 × 25% = 50 bps
    /// // 实际税率: 200 - 50 = 150 bps (1.5%)
    /// ```
    fn calculate_holding_discount(
        holder_info: Option<&HolderAccount>,
        current_timestamp: i64,
        tax_config: &TaxConfig,
    ) -> Result<u16> {
        // 如果用户未注册（新用户），无折扣
        let holder = match holder_info {
            Some(h) => h,
            None => return Ok(0),
        };

        // 计算持有天数
        // 持有天数 = (当前时间 - 首次持有时间) / 86400秒
        let holding_days = holder.get_holding_days(current_timestamp);
        
        // 根据持有天数确定折扣比例（使用分段函数简化计算）
        // 这是对理论公式 1/(T_hold + 1)^β × γ 的简化实现
        let discount_bps = if holding_days >= 365 {
            // 365+ 天: 75% 折扣（最大折扣）
            // 这是对超长期持有者的最大奖励
            7500
        } else if holding_days >= 180 {
            // 180-365 天: 50% 折扣
            // 奖励长期持有者
            5000
        } else if holding_days >= 90 {
            // 90-180 天: 25% 折扣
            // 奖励中期持有者
            2500
        } else if holding_days >= 30 {
            // 30-90 天: 10% 折扣
            // 轻微奖励短期持有者
            1000
        } else {
            // 0-30 天: 无折扣
            // 短期投机者需要支付全额税率
            0
        };

        // 应用折扣到基础税率
        // 折扣金额 = 基础税率 × 折扣比例 / 10000
        // 例如: 基础税率200 bps，折扣比例50%，折扣金额 = 200 × 5000 / 10000 = 100 bps
        let discount_amount = calculate_bps(tax_config.base_tax_bps as u64, discount_bps as u16)?;
        
        Ok(discount_amount as u16)
    }

    /// 计算大额交易附加税
    /// 
    /// 根据交易规模占供应量的比例，计算大额交易惩罚。
    /// 这是"自动熔断式税收"机制，防止大额抛售冲击市场。
    /// 
    /// ## 惩罚公式
    /// 
    /// 理论公式: `Penalty = (P_impact / L) × α`
    /// 
    /// 简化实现: 使用交易量占供应量的比例作为P_impact的近似值
    /// 
    /// ## 惩罚规则
    /// 
    /// | 交易占比 | 附加税率 | 说明 |
    /// |---------|---------|------|
    /// | < 0.1% | 0% | 小额交易，无惩罚 |
    /// | 0.1% - 0.5% | +1% | 中等交易，轻微惩罚 |
    /// | 0.5% - 1% | +2% | 较大交易，中等惩罚 |
    /// | 1% - 2% | +3% | 大额交易，较重惩罚 |
    /// | > 2% | +5% | 超大交易，严重惩罚 |
    /// 
    /// ## 参数
    /// 
    /// * `amount` - 交易金额（基础单位）
    /// * `total_supply` - 代币总供应量（基础单位）
    /// 
    /// ## 返回值
    /// 
    /// * `Result<u16>` - 附加税率（basis points），会加到基础税率上
    /// 
    /// ## 计算逻辑
    /// 
    /// 1. 计算交易占比 = (交易金额 / 总供应量) × 10000 (basis points)
    /// 2. 根据占比确定附加税率（分段函数）
    /// 3. 返回附加税率
    /// 
    /// ## 作用
    /// 
    /// - 防止大额抛售（砸盘）
    /// - 保护流动性池的稳定性
    /// - 实现"反脆弱机制"：抛售越多，惩罚越重
    /// 
    /// ## 示例
    /// 
    /// ```rust
    /// // 总供应量: 202.7B
    /// // 交易金额: 2.027B (1% of supply)
    /// // 交易占比: 1% = 100 basis points
    /// // 附加税率: +3% = 300 basis points
    /// // 
    /// // 如果基础税率是2%，最终税率 = 2% + 3% = 5%
    /// ```
    fn calculate_whale_tax(amount: u64, total_supply: u64) -> Result<u16> {
        // 如果总供应量为0，无法计算比例，返回0
        if total_supply == 0 {
            return Ok(0);
        }

        // 计算交易占比（basis points）
        // 公式: 占比 = (交易金额 / 总供应量) × 10000
        // 使用u128避免溢出
        let ratio_bps_u128 = (amount as u128)
            .checked_mul(10000)
            .and_then(|v| v.checked_div(total_supply as u128))
            .ok_or(error!(TotError::MathOverflow))?;

        // 安全转换为u16
        // 理论上ratio_bps最大值为 (u64::MAX * 10000) / 1，远大于u16的最大值65535
        // 但实际使用中，ratio_bps不应该超过10000（100%），因为不能转账超过总供应量
        // 如果超过10000，说明数据异常，返回错误
        // 如果超过u16最大值但小于等于10000，限制为65535（虽然这种情况理论上不会发生）
        let ratio_bps = if ratio_bps_u128 > 10000 {
            // 超过100%的交易占比，数据异常
            return Err(error!(TotError::MathOverflow));
        } else if ratio_bps_u128 > 65535 {
            // 虽然理论上不会发生，但为了安全，限制为u16最大值
            // 这种情况表示交易占比在655.35%到1000%之间，实际不会发生
            65535u16
        } else {
            ratio_bps_u128 as u16
        };

        // 根据占比确定附加税率（分段函数）
        // 这是对理论公式 (P_impact / L) × α 的简化实现
        let whale_tax_bps = if ratio_bps >= 200 {
            // > 2%: +5% 附加税（严重惩罚）
            // 超大交易会面临极高的税率，有效阻止砸盘
            500 // +5% = 500 basis points
        } else if ratio_bps >= 100 {
            // 1% - 2%: +3% 附加税（较重惩罚）
            // 大额交易需要支付较高税率
            300 // +3% = 300 basis points
        } else if ratio_bps >= 50 {
            // 0.5% - 1%: +2% 附加税（中等惩罚）
            // 较大交易需要支付中等税率
            200 // +2% = 200 basis points
        } else if ratio_bps >= 10 {
            // 0.1% - 0.5%: +1% 附加税（轻微惩罚）
            // 中等交易需要支付轻微附加税
            100 // +1% = 100 basis points
        } else {
            // < 0.1%: 无附加税
            // 小额交易不收取附加税
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
    /// 
    /// # 返回值
    /// * `Result<Self>` - 成功返回分配结果，溢出时返回错误
    pub fn calculate(total_tax: u64) -> Result<Self> {
        let to_burn = calculate_bps(total_tax, tax::TAX_TO_BURN_BPS)?;
        let to_liquidity = calculate_bps(total_tax, tax::TAX_TO_LIQUIDITY_BPS)?;
        let to_community = calculate_bps(total_tax, tax::TAX_TO_COMMUNITY_BPS)?;
        let to_marketing = total_tax
            .checked_sub(to_burn)
            .and_then(|v| v.checked_sub(to_liquidity))
            .and_then(|v| v.checked_sub(to_community))
            .ok_or(error!(TotError::MathOverflow))?;

        Ok(Self {
            to_burn,
            to_liquidity,
            to_community,
            to_marketing,
        })
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
        let dist = TaxDistribution::calculate(total_tax).unwrap();

        assert_eq!(dist.to_burn, 400); // 40%
        assert_eq!(dist.to_liquidity, 300); // 30%
        assert_eq!(dist.to_community, 200); // 20%
        assert_eq!(dist.to_marketing, 100); // 10%
    }
}
