//! # 税收配置账户模块
//! 
//! 本模块定义了动态税收配置账户，存储了TOT动态重力场税收模型（TOT-DGTM）的所有参数。
//! 这些参数控制着税率计算的核心逻辑，管理员可以动态调整以适应市场变化。
//! 
//! ## 动态税收模型
//! 
//! TOT采用动态重力场税收模型，税率计算公式为：
//! ```
//! Tax = Base + (P_impact / L) × α + 1/(T_hold + 1)^β × γ
//! ```
//! 
//! 其中：
//! - Base: 基础税率
//! - (P_impact / L) × α: 大额交易惩罚项
//! - 1/(T_hold + 1)^β × γ: 持有时间折扣项
//! 
//! ============================================
// 文件: src/state/tax.rs
// 税收配置账户定义
// ============================================

use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct TaxConfig {
    pub base_tax_bps: u16,
    pub alpha: u64,
    pub beta: u64,
    pub gamma_bps: u16,
    pub panic_threshold_bps: u16,
    pub panic_tax_bps: u16,
    pub enabled: bool,
    
    /// 税收用于奖池的比例（basis points，4000=40%，400=4%）
    /// 
    /// 类型: u16 (2字节)
    /// 默认值: 4000 (40%)
    /// 取值范围: 400-4000 (4%-40%)
    /// 
    /// 说明:
    /// - 税收中用于注入奖池的比例（原用于销毁）
    /// - 可动态调整，范围: 4%-40%
    /// - 管理员可以通过指令调整
    /// 
    /// 用途:
    /// - 控制奖池积累速度
    /// - 实现成瘾机制（天命轮盘）
    /// - 根据市场情况动态调整
    pub jackpot_ratio_bps: u16,
    
    /// 免税地址列表
    /// 
    /// 类型: Vec<Pubkey> (动态数组，最多50个地址)
    /// 最大长度: 50个地址
    /// 
    /// 说明:
    /// - 存储所有免税地址
    /// - 这些地址的转账不收取任何税收
    /// - 通常包括流动性池、DEX合约等系统地址
    /// 
    /// 用途:
    /// - 系统地址免税（避免税收循环）
    /// - 特殊合约地址免税
    /// - 管理员可以动态添加/移除
    #[max_len(50)]
    pub exempt_addresses: Vec<Pubkey>,
    pub last_updated: i64,
    pub bump: u8,
}

impl TaxConfig {
    /// 计算账户所需空间
    /// 
    /// 返回税率配置账户所需的总字节数，用于账户初始化时的空间分配。
    /// 
    /// 总大小: 1657 字节
    /// 
    /// 注意: 由于Vec<Pubkey>需要预留最大空间（50个地址），账户大小较大。
    pub const LEN: usize = 8 + // discriminator (Anchor自动添加)
        2 + // base_tax_bps (u16)
        8 + // alpha (u64)
        8 + // beta (u64)
        2 + // gamma_bps (u16)
        2 + // panic_threshold_bps (u16)
        2 + // panic_tax_bps (u16)
        1 + // enabled (bool)
        2 + // jackpot_ratio_bps (u16)
        4 + // Vec length (u32)
        (32 * 50) + // exempt_addresses (Vec<Pubkey>, max 50 addresses)
        8 + // last_updated (i64)
        1; // bump (u8)
    
    pub fn is_exempt(&self, address: &Pubkey) -> bool {
        self.exempt_addresses.contains(address)
    }
    
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
    
    pub fn remove_exempt(&mut self, address: &Pubkey) -> Result<()> {
        let index = self.exempt_addresses
            .iter()
            .position(|&x| x == *address)
            .ok_or(anchor_lang::error!(crate::errors::TotError::AddressNotExempt))?;
        
        self.exempt_addresses.remove(index);
        Ok(())
    }
    
    /// 设置奖池比例
    /// 
    /// 更新税收用于奖池的比例。只有管理员可以执行此操作。
    /// 
    /// # 参数
    /// * `ratio_bps` - 新的奖池比例（basis points，400-4000，即4%-40%）
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 验证
    /// 1. 检查比例是否在有效范围内（4%-40%）
    /// 
    /// # 错误
    /// * 如果比例不在400-4000范围内，返回`TotError::InvalidJackpotRatio`
    /// 
    /// # 使用示例
    /// ```rust
    /// // 设置奖池比例为30%
    /// tax_config.set_jackpot_ratio(3000)?;
    /// ```
    pub fn set_jackpot_ratio(&mut self, ratio_bps: u16) -> Result<()> {
        use crate::constants::tax::distribution;
        use crate::errors::TotError;
        
        // 验证比例范围（4%-40%）
        require!(
            ratio_bps >= distribution::JACKPOT_MIN_RATIO_BPS 
                && ratio_bps <= distribution::JACKPOT_MAX_RATIO_BPS,
            TotError::InvalidJackpotRatio
        );
        
        self.jackpot_ratio_bps = ratio_bps;
        Ok(())
    }
}
