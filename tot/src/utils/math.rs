// ============================================
// 文件: src/utils/math.rs
// 数学工具函数
// ============================================

use anchor_lang::prelude::*;
use crate::errors::TotError;
use crate::constants::BASIS_POINTS;

/// 安全乘法 - 防止溢出
pub fn safe_mul(a: u64, b: u64) -> Result<u64> {
    a.checked_mul(b).ok_or(error!(TotError::MathOverflow))
}

/// 安全除法 - 防止除零和溢出
pub fn safe_div(a: u64, b: u64) -> Result<u64> {
    if b == 0 {
        return Err(error!(TotError::DivisionByZero));
    }
    a.checked_div(b).ok_or(error!(TotError::MathOverflow))
}

/// 安全加法 - 防止溢出
pub fn safe_add(a: u64, b: u64) -> Result<u64> {
    a.checked_add(b).ok_or(error!(TotError::MathOverflow))
}

/// 安全减法 - 防止下溢
pub fn safe_sub(a: u64, b: u64) -> Result<u64> {
    a.checked_sub(b).ok_or(error!(TotError::MathUnderflow))
}

/// 计算基点百分比
/// 公式: amount * bps / 10000
pub fn calculate_bps(amount: u64, bps: u16) -> Result<u64> {
    let result = safe_mul(amount, bps as u64)?;
    safe_div(result, BASIS_POINTS)
}

/// 计算税后金额
/// 返回: (税后金额, 税额)
pub fn calculate_amount_after_tax(amount: u64, tax_bps: u16) -> Result<(u64, u64)> {
    let tax_amount = calculate_bps(amount, tax_bps)?;
    let amount_after_tax = safe_sub(amount, tax_amount)?;
    Ok((amount_after_tax, tax_amount))
}

/// 应用折扣到税率
/// 公式: base_tax_bps - (base_tax_bps * discount_bps / 10000)
pub fn apply_discount_to_tax(base_tax_bps: u16, discount_bps: u16) -> Result<u16> {
    let discount_amount = calculate_bps(base_tax_bps as u64, discount_bps)?;
    let discounted_tax = safe_sub(base_tax_bps as u64, discount_amount)?;
    // 安全转换：由于base_tax_bps是u16，discounted_tax不会超过u16最大值
    // 但为了防御性编程，添加显式检查
    require!(
        discounted_tax <= u16::MAX as u64,
        TotError::MathOverflow
    );
    Ok(discounted_tax as u16)
}

/// 计算持有天数
/// 
/// 从首次购买时间到当前时间的天数。
/// 
/// # 参数
/// * `first_buy_time` - 首次购买时间（Unix时间戳）
/// * `current_time` - 当前时间（Unix时间戳）
/// 
/// # 返回值
/// * `u64` - 持有天数（向下取整）
/// 
/// # 边界情况
/// * 如果`current_time <= first_buy_time`，返回0
/// * 如果时间差小于86400秒（1天），返回0
/// * 如果时间差过大导致溢出，返回最大安全值（约584,942,417,355天）
/// 
/// # 示例
/// ```rust
/// let days = calculate_holding_days(1000000000, 1000086400); // 返回1
/// let days = calculate_holding_days(1000000000, 1000000000); // 返回0
/// ```
pub fn calculate_holding_days(first_buy_time: i64, current_time: i64) -> u64 {
    if current_time <= first_buy_time {
        return 0;
    }
    
    // 使用checked_sub防止下溢，如果发生下溢返回0
    let time_diff = match current_time.checked_sub(first_buy_time) {
        Some(diff) => diff,
        None => return 0, // 如果下溢，返回0
    };
    
    // 限制最大持有天数，防止溢出
    // u64::MAX / 86400 ≈ 213,503,982,334,601 天（约5840亿年）
    // 为了安全，限制为更合理的值：100,000年 ≈ 36,500,000天
    const MAX_HOLDING_DAYS: i64 = 36_500_000; // 100,000年
    let time_diff_limited = std::cmp::min(time_diff, MAX_HOLDING_DAYS * 86400);
    
    // 转换为天数
    (time_diff_limited / 86400) as u64
}

/// 计算幂次方（用于时间衰减）
/// 使用定点数运算，避免浮点数
/// 计算: base^(exponent/100)
/// 这里使用简化的整数近似
pub fn power_fixed(base: u64, exponent: u64, scale: u64) -> Result<u64> {
    // 简化的幂次计算
    // 对于小指数，使用线性近似
    if exponent == 0 {
        return Ok(scale);
    }
    
    // 对于 0.5 次方 (exponent = 50, scale = 100)
    // 使用 sqrt 近似: sqrt(x) ≈ x * scale / sqrt(x * scale)
    if exponent == 50 {
        // 简化的平方根近似
        let scaled = safe_mul(base, scale)?;
        // 使用牛顿法简化版本
        let mut result = scaled;
        for _ in 0..10 {
            let temp = safe_div(scaled, result)?;
            result = safe_div(safe_add(result, temp)?, 2)?;
        }
        return Ok(result);
    }
    
    // 其他情况使用线性近似
    Ok(base)
}

/// 生成伪随机数种子
/// 
/// 使用交易本身的不可预测因素生成随机数，实现零额外Gas。
/// 
/// # 参数
/// * `sender` - 发送者地址
/// * `slot` - 当前区块slot
/// * `amount` - 转账金额
/// * `timestamp` - 时间戳
/// 
/// # 返回值
/// * `u64` - 随机数种子
/// 
/// # 说明
/// 使用简单的哈希组合，避免引入外部依赖。
/// 在Solana中，这些因素在交易执行时已经可用。
pub fn generate_random_seed(
    sender: &anchor_lang::prelude::Pubkey,
    slot: u64,
    amount: u64,
    timestamp: i64,
) -> u64 {
    // 组合多个不可预测的因素
    let mut seed = Vec::new();
    seed.extend_from_slice(sender.as_ref());
    seed.extend_from_slice(&slot.to_le_bytes());
    seed.extend_from_slice(&amount.to_le_bytes());
    seed.extend_from_slice(&timestamp.to_le_bytes());
    
    // 使用简单的哈希函数（避免引入外部依赖）
    // 使用Anchor内置的hash函数
    use anchor_lang::solana_program::hash::hash;
    let hash_result = hash(&seed);
    
    // 取前8字节作为随机数
    let hash_bytes = hash_result.as_ref();
    u64::from_le_bytes([
        hash_bytes[0], hash_bytes[1], hash_bytes[2], hash_bytes[3],
        hash_bytes[4], hash_bytes[5], hash_bytes[6], hash_bytes[7],
    ])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_bps() {
        // 1000 * 500 / 10000 = 50
        assert_eq!(calculate_bps(1000, 500).unwrap(), 50);
        
        // 10000 * 2500 / 10000 = 2500
        assert_eq!(calculate_bps(10000, 2500).unwrap(), 2500);
        
        // 100 * 100 / 10000 = 1
        assert_eq!(calculate_bps(100, 100).unwrap(), 1);
    }

    #[test]
    fn test_calculate_amount_after_tax() {
        // 1000 with 5% tax = 950 after tax, 50 tax
        let (after, tax) = calculate_amount_after_tax(1000, 500).unwrap();
        assert_eq!(after, 950);
        assert_eq!(tax, 50);
    }

    #[test]
    fn test_apply_discount() {
        // 500 bps with 50% discount = 250 bps
        let discounted = apply_discount_to_tax(500, 5000).unwrap();
        assert_eq!(discounted, 250);
    }

    #[test]
    fn test_holding_days() {
        let first_buy = 1000000;
        let current = 1000000 + (30 * 86400); // 30 days later
        assert_eq!(calculate_holding_days(first_buy, current), 30);
    }
}
