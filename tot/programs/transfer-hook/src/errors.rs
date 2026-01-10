// ============================================
// 文件: programs/transfer-hook/src/errors.rs
// Transfer Hook 错误定义
// ============================================

use anchor_lang::prelude::*;

#[error_code]
pub enum TransferHookError {
    #[msg("Transfer hook is paused")]
    HookPaused,

    #[msg("Unauthorized access")]
    Unauthorized,

    #[msg("Invalid mint")]
    InvalidMint,

    #[msg("Account is frozen")]
    AccountFrozen,

    #[msg("Transfer amount too large")]
    AmountTooLarge,

    #[msg("Invalid holder info")]
    InvalidHolderInfo,

    #[msg("Math overflow")]
    MathOverflow,
}
