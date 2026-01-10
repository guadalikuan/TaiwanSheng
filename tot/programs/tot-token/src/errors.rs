// ============================================
// 文件: programs/tot-token/src/errors.rs
// 错误定义
// ============================================

use anchor_lang::prelude::*;

#[error_code]
pub enum TotError {
    // ============================================
    // 初始化错误 (6000-6009)
    // ============================================
    
    #[msg("Already initialized")]
    AlreadyInitialized,
    
    #[msg("Invalid authority")]
    InvalidAuthority,
    
    #[msg("Invalid mint")]
    InvalidMint,
    
    #[msg("Invalid initialization parameters")]
    InvalidInitParams,

    // ============================================
    // 池子错误 (6010-6019)
    // ============================================
    
    #[msg("Pool already initialized")]
    PoolAlreadyInitialized,
    
    #[msg("Pool not initialized")]
    PoolNotInitialized,
    
    #[msg("Invalid pool type")]
    InvalidPoolType,
    
    #[msg("Pool is locked")]
    PoolLocked,
    
    #[msg("Insufficient pool balance")]
    InsufficientPoolBalance,
    
    #[msg("Pool unlock time not reached")]
    PoolUnlockTimeNotReached,

    // ============================================
    // 税率错误 (6020-6039)
    // ============================================
    
    #[msg("Invalid tax rate - must be <= 10000 (100%)")]
    InvalidTaxRate,
    
    #[msg("Tax rate exceeds maximum allowed")]
    TaxRateExceedsMaximum,
    
    #[msg("Invalid tax tier configuration")]
    InvalidTaxTier,
    
    #[msg("Tax tiers must be in ascending order")]
    TaxTiersNotAscending,
    
    #[msg("Too many tax tiers")]
    TooManyTaxTiers,
    
    #[msg("Tax calculation overflow")]
    TaxCalculationOverflow,
    
    #[msg("Invalid holding period")]
    InvalidHoldingPeriod,
    
    #[msg("Tax too high")]
    TaxTooHigh,
    
    #[msg("Address already exempt")]
    AddressAlreadyExempt,
    
    #[msg("Address not exempt")]
    AddressNotExempt,
    
    #[msg("Too many exempt addresses")]
    TooManyExemptAddresses,

    // ============================================
    // 持有者错误 (6040-6059)
    // ============================================
    
    #[msg("Holder account already exists")]
    HolderAlreadyExists,
    
    #[msg("Holder account not found")]
    HolderNotFound,
    
    #[msg("Holder account is frozen")]
    HolderFrozen,
    
    #[msg("Holder account is not frozen")]
    HolderNotFrozen,
    
    #[msg("Invalid holder owner")]
    InvalidHolderOwner,
    
    #[msg("Holder stats update failed")]
    HolderStatsUpdateFailed,
    
    #[msg("String too long")]
    StringTooLong,

    // ============================================
    // 转账错误 (6060-6079)
    // ============================================
    
    #[msg("Transfer amount is zero")]
    ZeroTransferAmount,
    
    #[msg("Insufficient balance for transfer")]
    InsufficientBalance,
    
    #[msg("Transfer to self not allowed")]
    TransferToSelf,
    
    #[msg("Transfer hook validation failed")]
    TransferHookFailed,
    
    #[msg("Invalid transfer destination")]
    InvalidTransferDestination,
    
    #[msg("Transfer amount too small after tax")]
    TransferAmountTooSmall,
    
    #[msg("Invalid amount")]
    InvalidAmount,
    
    #[msg("Invalid owner")]
    InvalidOwner,
    
    #[msg("Invalid tax collector")]
    InvalidTaxCollector,
    
    #[msg("Token account mismatch")]
    TokenAccountMismatch,

    // ============================================
    // 管理员错误 (6080-6099)
    // ============================================
    
    #[msg("Unauthorized - admin only")]
    Unauthorized,
    
    #[msg("Invalid new authority")]
    InvalidNewAuthority,
    
    #[msg("Operation paused")]
    OperationPaused,
    
    #[msg("System not paused")]
    SystemNotPaused,
    
    #[msg("Invalid parameter")]
    InvalidParameter,
    
    #[msg("Freeze reason too long")]
    FreezeReasonTooLong,
    
    #[msg("System paused")]
    SystemPaused,

    // ============================================
    // 数学错误 (6100-6109)
    // ============================================
    
    #[msg("Math overflow")]
    MathOverflow,
    
    #[msg("Math underflow")]
    MathUnderflow,
    
    #[msg("Division by zero")]
    DivisionByZero,

    // ============================================
    // 时间错误 (6110-6119)
    // ============================================
    
    #[msg("Invalid timestamp")]
    InvalidTimestamp,
    
    #[msg("Lock period not expired")]
    LockPeriodNotExpired,
    
    #[msg("Vesting not started")]
    VestingNotStarted,
    
    #[msg("Invalid time parameter")]
    InvalidTimeParameter,
}
