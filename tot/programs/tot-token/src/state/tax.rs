// ============================================
// 文件: programs/tot-token/src/state/tax.rs
// 税收配置账户定义
// ============================================

use anchor_lang::prelude::*;

/// 动态税收配置
/// 存储税率参数和免税地址列表
#[account]
#[derive(Default)]
pub struct TaxConfig {
    /// 基础税率 (basis points) - 默认2% (200 bps)
    pub base_tax_bps: u16,
    
    /// 惩罚系数 α (放大100倍存储) - 默认5 (存储为500)
    pub alpha: u64,
    
    /// 时间衰减指数 β (放大100倍存储) - 默认0.5 (存储为50)
    pub beta: u64,
    
    /// 忠诚度权重 γ (basis points) - 默认20% (2000 bps)
    pub gamma_bps: u16,
    
    /// 恐慌阈值 (basis points of pool) - 0.5% (50 bps)
    pub panic_threshold_bps: u16,
    
    /// 恐慌税率 (basis points) - 30% (3000 bps)
    pub panic_tax_bps: u16,
    
    /// 是否启用动态税
    pub enabled: bool,
    
    /// 免税地址列表 - 最多50个地址
    #[max_len(50)]
    pub exempt_addresses: Vec<Pubkey>,
    
    /// 最后更新时间戳
    pub last_updated: i64,
    
    /// Bump seed - PDA派生种子
    pub bump: u8,
}

impl TaxConfig {
    /// 计算账户所需空间
    pub const LEN: usize = 8 + // discriminator
        2 + // base_tax_bps
        8 + // alpha
        8 + // beta
        2 + // gamma_bps
        2 + // panic_threshold_bps
        2 + // panic_tax_bps
        1 + // enabled
        4 + // Vec length
        (32 * 50) + // exempt_addresses (max 50)
        8 + // last_updated
        1; // bump
    
    /// 检查地址是否免税
    pub fn is_exempt(&self, address: &Pubkey) -> bool {
        self.exempt_addresses.contains(address)
    }
    
    /// 添加免税地址
    pub fn add_exempt(&mut self, address: Pubkey) -> Result<()> {
        require!(
            !self.exempt_addresses.contains(&address),
            crate::errors::TotError::AddressAlreadyExempt
        );
        require!(
            self.exempt_addresses.len() < 50,
            crate::errors::TotError::TooManyExemptAddresses
        );
        self.exempt_addresses.push(address);
        Ok(())
    }
    
    /// 移除免税地址
    pub fn remove_exempt(&mut self, address: &Pubkey) -> Result<()> {
        let index = self.exempt_addresses
            .iter()
            .position(|&x| x == *address)
            .ok_or(anchor_lang::error!(crate::errors::TotError::AddressNotExempt))?;
        self.exempt_addresses.remove(index);
        Ok(())
    }
}
