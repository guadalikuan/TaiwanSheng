// ============================================
// 文件: programs/transfer-hook/src/state.rs
// Transfer Hook 状态定义
// ============================================

use anchor_lang::prelude::*;

/// Hook 全局配置
#[account]
pub struct HookConfig {
    /// 管理员
    pub authority: Pubkey,
    
    /// TOT Mint 地址
    pub tot_mint: Pubkey,
    
    /// TOT 全局配置地址
    pub tot_config: Pubkey,
    
    /// 总转账次数
    pub total_transfers: u64,
    
    /// 总收取税额
    pub total_tax_collected: u64,
    
    /// 总销毁数量
    pub total_burned: u64,
    
    /// 是否暂停
    pub is_paused: bool,
    
    /// PDA bump
    pub bump: u8,
}

impl HookConfig {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // tot_mint
        32 + // tot_config
        8 + // total_transfers
        8 + // total_tax_collected
        8 + // total_burned
        1 + // is_paused
        1; // bump
}
