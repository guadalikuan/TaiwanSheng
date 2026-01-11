use anchor_lang::prelude::*;

#[error_code]
pub enum TotError {
    #[msg("Already initialized")]
    AlreadyInitialized,
    
    #[msg("Invalid authority")]
    InvalidAuthority,
    
    #[msg("Invalid mint")]
    InvalidMint,
    
    #[msg("Invalid initialization parameters")]
    InvalidInitParams,

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

    #[msg("Holder account already exists")]
    HolderAccountAlreadyExists,

    #[msg("Holder account not found")]
    HolderAccountNotFound,

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

    #[msg("Transfer amount is zero")]
    ZeroTransferAmount,

    #[msg("Transfer amount is zero")]
    TransferAmountZero,

    #[msg("Insufficient balance for transfer")]
    InsufficientBalance,

    #[msg("Transfer to self not allowed")]
    TransferToSelfNotAllowed,

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

    #[msg("Math overflow")]
    MathOverflow,

    #[msg("Math underflow")]
    MathUnderflow,

    #[msg("Division by zero")]
    DivisionByZero,

    #[msg("Invalid timestamp")]
    InvalidTimestamp,

    #[msg("Lock period not expired")]
    LockPeriodNotExpired,

    #[msg("Vesting not started")]
    VestingNotStarted,

    #[msg("Invalid time parameter")]
    InvalidTimeParameter,
}
