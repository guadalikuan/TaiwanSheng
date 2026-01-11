//! # 工具函数模块
//! 
//! 本模块提供了TOT代币系统的各种工具函数和计算器。
//! 
//! ## 模块职责
//! 
//! - 提供可复用的工具函数
//! - 实现核心业务逻辑（如税率计算）
//! - 提供验证和数学运算函数
//! 
//! ## 模块结构
//! 
//! - `tax_calculator`: 动态税率计算器（核心业务逻辑）
//! - `math`: 数学工具函数（安全运算、BPS计算等）
//! - `validation`: 验证工具函数（参数验证、范围检查等）
//! 
//! ## 依赖关系
//! 
//! - 依赖: `constants`, `errors`, `state`
//! - 被依赖: `instructions`
//! - 模块内部: tax_calculator依赖math模块
//! 
//! ## 公共API
//! 
//! 本模块只导出公共函数和结构体，隐藏内部实现细节：
//! - 计算器结构体和方法
//! - 工具函数
//! - 验证函数
//! 
//! ## 使用示例
//! 
//! ```rust
//! use crate::utils::{TaxCalculator, calculate_bps, validate_tax_rate};
//! 
//! // 计算税率
//! let calculation = TaxCalculator::calculate_tax(...)?;
//! 
//! // 验证参数
//! validate_tax_rate(200)?;
//! ```
//! 
//! ============================================
// 文件: src/utils/mod.rs
// 工具模块导出
// ============================================

pub mod tax_calculator;
pub mod math;
pub mod validation;

// 精确导出公共API，避免通配符导出导致的模块边界不清晰

// 税率计算器模块公共API
pub use tax_calculator::{
    TaxCalculator,
    TaxCalculation,
    TaxDistribution,
};

// 数学工具模块公共API
pub use math::{
    safe_mul,
    safe_div,
    safe_add,
    safe_sub,
    calculate_bps,
    calculate_amount_after_tax,
    apply_discount_to_tax,
    calculate_holding_days,
    power_fixed,
};

// 验证工具模块公共API
pub use validation::{
    validate_tax_rate,
    validate_transfer_amount,
    validate_freeze_reason,
    validate_pool_type,
    validate_bps,
    validate_timestamp,
    validate_not_zero_pubkey,
    validate_amount,
};
