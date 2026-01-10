// ============================================
// 文件: programs/tot-token/src/state/config.rs
// 全局配置账户定义
// ============================================

use anchor_lang::prelude::*;
use crate::state::tax::TaxConfig;

/// 全局配置账户
/// 存储TOT代币系统的全局状态和配置信息
#[account]
#[derive(Default)]
pub struct TotConfig {
    /// 管理员 (总司令) - 拥有系统最高权限
    pub authority: Pubkey,
    
    /// 代币 Mint 地址 - TOT代币的Mint账户
    pub mint: Pubkey,
    
    /// 国库地址 - 用于接收税收和运营资金
    pub treasury: Pubkey,
    
    /// 流动性池地址 (Raydium) - 主流动性池地址
    pub liquidity_pool: Pubkey,
    
    /// 当前税收配置 - 动态税收参数
    pub tax_config: Pubkey, // 指向TaxConfig账户
    
    /// 是否处于恐慌模式 - 当检测到大额抛售时启用
    pub panic_mode: bool,
    
    /// 初始化时间戳 - 系统初始化时的Unix时间戳
    pub initialized_at: i64,
    
    /// 总铸造量 - 累计铸造的代币数量
    pub total_minted: u64,
    
    /// 总销毁量 - 累计销毁的代币数量
    pub total_burned: u64,
    
    /// 累计收税量 - 累计收取的税收总额
    pub total_tax_collected: u64,
    
    /// 配置版本 - 用于未来升级和兼容性检查
    pub version: u8,
    
    /// 预留空间 - 用于未来扩展
    pub _reserved: [u8; 128],
}

impl TotConfig {
    /// 计算账户所需空间
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // mint
        32 + // treasury
        32 + // liquidity_pool
        32 + // tax_config
        1 + // panic_mode
        8 + // initialized_at
        8 + // total_minted
        8 + // total_burned
        8 + // total_tax_collected
        1 + // version
        128; // reserved
}

/// 初始化参数
/// 用于初始化TOT代币系统的参数
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeParams {
    /// 初始税收配置地址（可选，后续可设置）
    pub tax_config: Option<Pubkey>,
    
    /// 流动性池地址（可选，后续可设置）
    pub liquidity_pool: Option<Pubkey>,
}
