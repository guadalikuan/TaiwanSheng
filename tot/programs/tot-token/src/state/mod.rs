//! # 状态账户模块
//! 
//! 本模块定义了TOT代币系统的所有状态账户结构。
//! 
//! ## 模块职责
//! 
//! - 定义所有链上状态账户的数据结构
//! - 提供账户的序列化/反序列化支持
//! - 提供账户的辅助方法和计算函数
//! 
//! ## 模块结构
//! 
//! - `config`: 全局配置账户（TotConfig）
//! - `pool`: 池子账户（PoolAccount, PoolType）
//! - `holder`: 持有者账户（HolderAccount）
//! - `tax`: 税收配置账户（TaxConfig）
//! 
//! ## 依赖关系
//! 
//! - 依赖: `constants`, `errors`
//! - 被依赖: `instructions`, `utils`
//! - 模块内部: config模块不依赖其他state子模块（已解耦）
//! 
//! ## 公共API
//! 
//! 本模块只导出公共接口，隐藏内部实现细节：
//! - 账户结构体（用于Anchor账户验证）
//! - 枚举类型（用于参数传递）
//! - 参数结构体（用于指令参数）
//! 
//! ## 使用示例
//! 
//! ```rust
//! use crate::state::{TotConfig, PoolAccount, PoolType, HolderAccount, TaxConfig};
//! 
//! // 在指令中使用
//! #[derive(Accounts)]
//! pub struct MyInstruction<'info> {
//!     #[account(mut)]
//!     pub config: Account<'info, TotConfig>,
//!     pub pool: Account<'info, PoolAccount>,
//! }
//! ```
//! 
//! ============================================
// 文件: programs/tot-token/src/state/mod.rs
// 状态模块导出
// ============================================

pub mod config;
pub mod pool;
pub mod holder;
pub mod tax;

// 精确导出公共API，避免通配符导出导致的模块边界不清晰
// 只导出外部模块需要使用的类型和常量

// 配置模块公共API
pub use config::{TotConfig, InitializeParams};

// 池子模块公共API
pub use pool::{PoolAccount, PoolType};

// 持有者模块公共API
pub use holder::HolderAccount;

// 税收配置模块公共API
pub use tax::TaxConfig;
