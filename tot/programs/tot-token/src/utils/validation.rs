// ============================================
// 文件: programs/tot-token/src/utils/validation.rs
// 验证工具函数
// ============================================

use anchor_lang::prelude::*;
use crate::errors::TotError;
use crate::constants::*;

/// 验证税率是否在有效范围内
pub fn validate_tax_rate(tax_bps: u16) -> Result<()> {
    require!(
        tax_bps <= tax::MAX_TAX_BPS,
        TotError::TaxRateExceedsMaximum
    );
    Ok(())
}

/// 验证转账金额
pub fn validate_transfer_amount(amount: u64) -> Result<()> {
    require!(amount > 0, TotError::ZeroTransferAmount);
    Ok(())
}

/// 验证冻结原因长度
pub fn validate_freeze_reason(reason: &str) -> Result<()> {
    require!(
        reason.len() <= limits::MAX_FREEZE_REASON_LEN,
        TotError::FreezeReasonTooLong
    );
    Ok(())
}

/// 验证池子类型
pub fn validate_pool_type(pool_type: u8) -> Result<()> {
    require!(pool_type <= 4, TotError::InvalidPoolType);
    Ok(())
}

/// 验证基点值
pub fn validate_bps(bps: u16, max_bps: u16) -> Result<()> {
    require!(bps <= max_bps, TotError::InvalidParameter);
    Ok(())
}

/// 验证时间戳
pub fn validate_timestamp(timestamp: i64) -> Result<()> {
    require!(timestamp > 0, TotError::InvalidTimestamp);
    Ok(())
}

/// 验证账户不为空
pub fn validate_not_zero_pubkey(pubkey: &Pubkey) -> Result<()> {
    require!(
        *pubkey != Pubkey::default(),
        TotError::InvalidParameter
    );
    Ok(())
}

/// 验证金额不为零
pub fn validate_amount(amount: u64) -> Result<()> {
    require!(amount > 0, TotError::InvalidAmount);
    Ok(())
}
