//! # TOT 错误定义模块
//! 
//! 本模块定义了TOT代币系统中所有可能的错误类型。
//! 错误按照功能模块分类，每个错误都有明确的错误码和错误消息。
//! 
//! ## 错误分类
//! 
//! 1. **初始化错误** (6000-6009): 系统初始化相关的错误
//! 2. **池子错误** (6010-6019): 池子操作相关的错误
//! 3. **税率错误** (6020-6039): 税率计算和配置相关的错误
//! 4. **持有者错误** (6040-6059): 持有者账户管理相关的错误
//! 5. **转账错误** (6060-6079): 转账操作相关的错误
//! 6. **管理员错误** (6080-6099): 管理员操作相关的错误
//! 7. **数学错误** (6100-6109): 数学运算相关的错误
//! 8. **时间错误** (6110-6119): 时间相关验证的错误
//! 
//! ============================================
// 文件: src/errors.rs
// 错误定义
// ============================================

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
    TransferToSelf,
    
    /// Transfer Hook验证失败
    /// 
    /// 触发场景:
    /// - Transfer Hook程序验证失败
    /// - Transfer Hook执行出错
    /// 
    /// 解决方案:
    /// - 检查Transfer Hook程序的配置
    /// - 确认转账符合Hook的要求
    #[msg("Transfer hook validation failed")]
    TransferHookFailed,
    
    /// Transfer Hook已暂停
    /// 
    /// 触发场景:
    /// - Hook被管理员暂停
    /// - 系统维护中
    /// 
    /// 解决方案:
    /// - 等待Hook恢复
    /// - 联系管理员
    #[msg("Transfer hook is paused")]
    HookPaused,
    
    /// 无效的转账目标
    /// 
    /// 触发场景:
    /// - 转账目标地址无效
    /// - 目标账户不符合要求
    /// 
    /// 解决方案:
    /// - 检查目标地址的有效性
    /// - 确认目标账户已创建
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
    
    // ============================================
    // 奖池错误 (6120-6139)
    // ============================================
    
    /// 无效的奖池比例
    /// 
    /// 触发场景:
    /// - 尝试设置超出范围的奖池比例
    /// - 奖池比例 < 4% 或 > 40%
    /// 
    /// 解决方案:
    /// - 确保奖池比例在400-4000 basis points范围内
    /// - 检查输入参数的有效性
    #[msg("Invalid jackpot ratio, must be between 4% and 40%")]
    InvalidJackpotRatio,
    
    /// 奖池余额不足
    /// 
    /// 触发场景:
    /// - 尝试开奖但奖池余额低于最小阈值
    /// - 奖池余额不足以支付奖金
    /// 
    /// 解决方案:
    /// - 等待奖池积累更多资金
    /// - 检查奖池余额是否足够
    #[msg("Insufficient jackpot balance")]
    InsufficientJackpotBalance,
}
