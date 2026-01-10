//! # 验证工具模块
//! 
//! 本模块提供了各种验证函数，用于确保输入参数的有效性。
//! 这些验证函数在指令执行前进行检查，防止无效操作。
//! 
//! ## 验证的重要性
//! 
//! 在智能合约中，输入验证至关重要：
//! - 防止无效操作
//! - 保护用户资金
//! - 确保系统稳定性
//! - 提供清晰的错误信息
//! 
//! ============================================
// 文件: programs/tot-token/src/utils/validation.rs
// 验证工具函数
// ============================================

use anchor_lang::prelude::*;
use crate::errors::TotError;
use crate::constants::*;

/// 验证税率是否在有效范围内
/// 
/// 检查税率是否超过系统允许的最大值。
/// 
/// # 参数
/// * `tax_bps` - 税率（basis points）
/// 
/// # 返回值
/// * `Result<()>` - 有效返回Ok(())，无效返回`TotError::TaxRateExceedsMaximum`
/// 
/// # 验证规则
/// - 税率必须 <= MAX_TAX_BPS (9900 = 99%)
/// 
/// # 使用场景
/// - 更新税率配置时验证
/// - 税率计算后验证
pub fn validate_tax_rate(tax_bps: u16) -> Result<()> {
    require!(
        tax_bps <= tax::MAX_TAX_BPS,
        TotError::TaxRateExceedsMaximum
    );
    Ok(())
}

/// 验证转账金额
/// 
/// 检查转账金额是否有效（必须大于0）。
/// 
/// # 参数
/// * `amount` - 转账金额
/// 
/// # 返回值
/// * `Result<()>` - 有效返回Ok(())，无效返回`TotError::ZeroTransferAmount`
/// 
/// # 验证规则
/// - 金额必须 > 0
/// 
/// # 使用场景
/// - 转账前验证
/// - 铸造前验证
pub fn validate_transfer_amount(amount: u64) -> Result<()> {
    require!(amount > 0, TotError::ZeroTransferAmount);
    Ok(())
}

/// 验证冻结原因长度
/// 
/// 检查冻结原因字符串是否超过最大长度限制。
/// 
/// # 参数
/// * `reason` - 冻结原因字符串
/// 
/// # 返回值
/// * `Result<()>` - 有效返回Ok(())，无效返回`TotError::FreezeReasonTooLong`
/// 
/// # 验证规则
/// - 字符串长度必须 <= MAX_FREEZE_REASON_LEN (100字符)
/// 
/// # 使用场景
/// - 冻结账户时验证原因长度
pub fn validate_freeze_reason(reason: &str) -> Result<()> {
    require!(
        reason.len() <= limits::MAX_FREEZE_REASON_LEN,
        TotError::FreezeReasonTooLong
    );
    Ok(())
}

/// 验证池子类型
/// 
/// 检查池子类型枚举值是否有效。
/// 
/// # 参数
/// * `pool_type` - 池子类型（u8，0-4）
/// 
/// # 返回值
/// * `Result<()>` - 有效返回Ok(())，无效返回`TotError::InvalidPoolType`
/// 
/// # 验证规则
/// - 池子类型必须 <= 4（对应5种池子类型：0-4）
/// 
/// # 使用场景
/// - 初始化池子时验证类型
pub fn validate_pool_type(pool_type: u8) -> Result<()> {
    require!(pool_type <= 4, TotError::InvalidPoolType);
    Ok(())
}

/// 验证基点值
/// 
/// 检查基点值是否在允许范围内。
/// 
/// # 参数
/// * `bps` - 基点值
/// * `max_bps` - 最大允许的基点值
/// 
/// # 返回值
/// * `Result<()>` - 有效返回Ok(())，无效返回`TotError::InvalidParameter`
/// 
/// # 验证规则
/// - 基点值必须 <= 最大允许值
/// 
/// # 使用场景
/// - 验证税率参数
/// - 验证比例参数
pub fn validate_bps(bps: u16, max_bps: u16) -> Result<()> {
    require!(bps <= max_bps, TotError::InvalidParameter);
    Ok(())
}

/// 验证时间戳
/// 
/// 检查时间戳是否有效（必须在合理范围内）。
/// 
/// # 参数
/// * `timestamp` - Unix时间戳
/// 
/// # 返回值
/// * `Result<()>` - 有效返回Ok(())，无效返回`TotError::InvalidTimestamp`
/// 
/// # 验证规则
/// - 时间戳必须 > 0
/// - 时间戳必须在合理范围内（1970-2100年）
///   - 最小值: 0 (1970-01-01 00:00:00 UTC)
///   - 最大值: 4102444800 (2100-01-01 00:00:00 UTC)
/// 
/// # 使用场景
/// - 验证解锁时间
/// - 验证释放时间
pub fn validate_timestamp(timestamp: i64) -> Result<()> {
    require!(timestamp > 0, TotError::InvalidTimestamp);
    // 检查时间戳是否在合理范围内（1970-2100年）
    // 2100-01-01 00:00:00 UTC 的时间戳是 4102444800
    require!(
        timestamp <= 4102444800,
        TotError::InvalidTimestamp
    );
    Ok(())
}

/// 验证账户地址不为空
/// 
/// 检查Pubkey是否为默认值（空地址）。
/// 
/// # 参数
/// * `pubkey` - 要验证的地址
/// 
/// # 返回值
/// * `Result<()>` - 有效返回Ok(())，无效返回`TotError::InvalidParameter`
/// 
/// # 验证规则
/// - 地址不能是`Pubkey::default()`（全零地址）
/// 
/// # 使用场景
/// - 验证管理员地址
/// - 验证目标地址
pub fn validate_not_zero_pubkey(pubkey: &Pubkey) -> Result<()> {
    require!(
        *pubkey != Pubkey::default(),
        TotError::InvalidParameter
    );
    Ok(())
}

/// 验证金额不为零
/// 
/// 检查金额是否有效（必须大于0）。
/// 
/// # 参数
/// * `amount` - 金额
/// 
/// # 返回值
/// * `Result<()>` - 有效返回Ok(())，无效返回`TotError::InvalidAmount`
/// 
/// # 验证规则
/// - 金额必须 > 0
/// 
/// # 使用场景
/// - 通用金额验证
pub fn validate_amount(amount: u64) -> Result<()> {
    require!(amount > 0, TotError::InvalidAmount);
    Ok(())
}
