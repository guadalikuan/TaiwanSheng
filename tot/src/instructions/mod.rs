//! # 指令实现模块
//! 
//! 本模块实现了TOT代币系统的所有链上指令。
//! 
//! ## 模块职责
//! 
//! - 定义所有指令的账户结构（用于Anchor账户验证）
//! - 实现指令的处理逻辑
//! - 发出链上事件
//! 
//! ## 模块结构
//! 
//! - `initialize`: 系统初始化指令
//! - `init_pool`: 池子初始化指令
//! - `mint_to_pools`: 铸造代币到池子指令
//! - `holder`: 持有者管理指令（初始化、冻结、解冻）
//! - `tax`: 税率管理指令（初始化、更新、免税地址管理）
//! - `transfer`: 带税转账指令（核心功能）
//! - `admin`: 管理员指令（权限管理、系统暂停、紧急提取）
//! - `query`: 查询指令（只读，计算税率、获取统计）
//! - `hook`: Transfer Hook指令（initialize_transfer_hook, execute_internal, set_transfer_hook_paused）
//! 
//! ## 依赖关系
//! 
//! - 依赖: `constants`, `errors`, `state`, `utils`
//! - 被依赖: `lib.rs`（主程序入口）
//! - 模块间: 各指令模块相互独立，无循环依赖
//! 
//! ## 公共API
//! 
//! 本模块只导出公共接口（账户结构体），隐藏内部实现细节：
//! - 账户结构体（用于Context类型）
//! - 事件结构体（如果需要外部访问）
//! 
//! ## 使用示例
//! 
//! ```rust
//! use crate::instructions::{Initialize, TransferWithTax, UpdateAuthority};
//! 
//! // 在lib.rs中使用
//! pub fn initialize(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
//!     instructions::initialize::handler(ctx, params)
//! }
//! ```
//! 
//! ============================================
// 文件: src/instructions/mod.rs
// 指令模块导出
// ============================================

pub mod initialize;
pub mod init_pool;
pub mod mint_to_pools;
pub mod holder;
pub mod tax;
pub mod transfer;
pub mod consume;
pub mod platform_transfer;
pub mod admin;
pub mod query;
pub mod hook;
pub mod asset_mint;
pub mod auction_create;
pub mod auction_seize;

// 精确导出公共接口，避免通配符导出导致的模块边界不清晰
// 只导出外部模块（如lib.rs）需要使用的账户结构体

// 初始化指令公共接口
pub use initialize::Initialize;

// 池子初始化指令公共接口
pub use init_pool::InitPool;

// 铸造指令公共接口
pub use mint_to_pools::MintToPools;

// 持有者管理指令公共接口
pub use holder::{
    InitializeHolder,
    FreezeHolder,
    UnfreezeHolder,
};

// 税率管理指令公共接口
pub use tax::{
    InitializeTaxConfig,
    UpdateTaxConfig,
    ManageTaxExempt,
};

// 转账指令公共接口
pub use transfer::TransferWithTax;

// 消费指令公共接口
pub use consume::{
    ConsumeToTreasury,
    ConsumeType,
};

// 平台转账指令公共接口
pub use platform_transfer::PlatformTransfer;

// 管理员指令公共接口
pub use admin::{
    UpdateAuthority,
    SetPaused,
    EmergencyWithdraw,
    SetTwsTreasury,
};

// 查询指令公共接口
pub use query::{
    CalculateTax,
    GetHolderStats,
    DiscountTier,
};

// Transfer Hook指令公共接口
pub use hook::{
    InitializeTransferHook,
    ExecuteTransferHook,
    TransferHookAdminAction,
};

// 资产上链指令公共接口
pub use asset_mint::MintAsset;

// 拍卖指令公共接口
pub use auction_create::CreateAuction;
pub use auction_seize::SeizeAuction;
