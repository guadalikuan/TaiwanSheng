// ============================================
// 文件: programs/tot-token/src/constants.rs
// 常量定义 - TOT 数学宇宙
// ============================================

use anchor_lang::prelude::*;

/// 代币基础参数
pub const TOKEN_NAME: &str = "TaiOneToken";
pub const TOKEN_SYMBOL: &str = "TOT";
pub const TOKEN_DECIMALS: u8 = 9;

/// 总供应量: 202,700,000,000 (2027亿)
/// 实际存储值需要乘以 10^9 (decimals)
/// 202.7B * 10^9 = 202,700,000,000,000,000,000
pub const TOTAL_SUPPLY: u64 = 202_700_000_000_000_000_000;

/// 五大池子分配 (单位: 基础单位, 已乘以 10^9)
pub mod allocation {
    use super::*;
    
    /// 胜利日基金: 20.27B (10%) - 锁定至2027年1月1日
    pub const VICTORY_FUND: u64 = 20_270_000_000_000_000_000;
    
    /// 历史重铸池: 19.49B (9.6%) - 初始流动性
    pub const HISTORY_LP: u64 = 19_490_000_000_000_000_000;
    
    /// 认知作战池: 14.50B (7.15%) - 365天线性释放
    pub const CYBER_ARMY: u64 = 14_500_000_000_000_000_000;
    
    /// 外资统战池: 7.04B (3.47%) - 多签控制
    pub const GLOBAL_ALLIANCE: u64 = 7_040_000_000_000_000_000;
    
    /// 资产锚定池: 141.40B (69.76%) - RWA触发释放
    pub const ASSET_ANCHOR: u64 = 141_400_000_000_000_000_000;
}

/// 时间常量
pub mod time {
    use super::*;
    
    /// 2027年1月1日 00:00:00 UTC 的 Unix 时间戳
    /// 计算: 2027-01-01 00:00:00 UTC = 1798761600
    pub const VICTORY_UNLOCK_TIME: i64 = 1798761600;
    
    /// 线性释放周期: 365天 (秒)
    pub const LINEAR_VESTING_PERIOD: i64 = 365 * 24 * 60 * 60;
    
    /// 每日释放量计算基数
    pub const SECONDS_PER_DAY: i64 = 86400;
}

/// 动态税收模型参数
pub mod tax {
    use super::*;
    
    /// 基础税率: 2% (以 basis points 表示, 200 = 2%)
    pub const BASE_TAX_BPS: u16 = 200;
    
    /// 最大税率: 99% (9900 basis points)
    pub const MAX_TAX_BPS: u16 = 9900;
    
    /// 惩罚系数 α: 5 (放大100倍存储为500)
    pub const ALPHA_COEFFICIENT: u64 = 500;
    
    /// 时间衰减指数 β: 0.5 (放大100倍存储为50)
    pub const BETA_EXPONENT: u64 = 50;
    
    /// 忠诚度权重 γ: 20% (2000 basis points)
    pub const GAMMA_WEIGHT_BPS: u16 = 2000;
    
    /// 恐慌模式触发阈值: 0.5% 的池子深度 (50 basis points)
    pub const PANIC_THRESHOLD_BPS: u16 = 50;
    
    /// 恐慌模式税率: 30% (3000 basis points)
    pub const PANIC_TAX_BPS: u16 = 3000;
    
    /// 流动性注入比例: 80% (8000 basis points)
    pub const LP_INJECTION_RATIO_BPS: u16 = 8000;
    
    /// 国库比例: 20% (2000 basis points)
    pub const TREASURY_RATIO_BPS: u16 = 2000;
    
    /// 税收分配比例
    /// 40% 销毁
    pub const TAX_TO_BURN_BPS: u16 = 4000;
    /// 30% 流动性
    pub const TAX_TO_LIQUIDITY_BPS: u16 = 3000;
    /// 20% 社区
    pub const TAX_TO_COMMUNITY_BPS: u16 = 2000;
    /// 10% 营销
    pub const TAX_TO_MARKETING_BPS: u16 = 1000;
}

/// 种子常量 (用于 PDA 派生)
pub mod seeds {
    use super::*;
    
    pub const CONFIG_SEED: &[u8] = b"tot_config";
    pub const POOL_SEED: &[u8] = b"tot_pool";
    pub const HOLDER_SEED: &[u8] = b"tot_holder";
    pub const TREASURY_SEED: &[u8] = b"tot_treasury";
    pub const MINT_AUTHORITY_SEED: &[u8] = b"tot_mint_auth";
    pub const TAX_CONFIG_SEED: &[u8] = b"tot_tax_config";
    pub const HOOK_CONFIG_SEED: &[u8] = b"hook_config";
}

/// 基点常量 (10000 = 100%)
pub const BASIS_POINTS: u64 = 10000;

/// 账户大小常量
pub mod size {
    use super::*;
    
    /// 配置账户大小
    pub const CONFIG_SIZE: usize = 8 + // discriminator
        32 + // authority
        32 + // mint
        32 + // treasury
        32 + // liquidity_pool
        1 + // panic_mode
        8 + // initialized_at
        8 + // total_minted
        8 + // total_burned
        8 + // total_tax_collected
        1 + // version
        128; // reserved
    
    /// 池子账户大小
    pub const POOL_SIZE: usize = 8 + // discriminator
        1 + // pool_type
        32 + // token_account
        8 + // initial_allocation
        8 + // released_amount
        8 + // unlock_time
        8 + // vesting_start
        8 + // vesting_period
        1 + // requires_multisig
        1 + // multisig_threshold
        (32 * 5) + // multisig_signers
        1; // bump
    
    /// 持有者账户大小
    pub const HOLDER_SIZE: usize = 8 + // discriminator
        32 + // owner
        32 + // token_account
        8 + // first_hold_time
        8 + // last_transaction_time
        8 + // weighted_hold_days
        8 + // total_bought
        8 + // total_sold
        8 + // total_tax_paid
        1 + // is_frozen
        1 + // freeze_reason
        1; // bump
}

/// 限制常量
pub mod limits {
    use super::*;
    
    /// 最大冻结原因长度
    pub const MAX_FREEZE_REASON_LEN: usize = 100;
    
    /// 最大免税地址数量
    pub const MAX_TAX_EXEMPT_ADDRESSES: usize = 50;
    
    /// 最大税率层级数
    pub const MAX_TAX_TIERS: usize = 10;
}
