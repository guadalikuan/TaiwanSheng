// ============================================
// 文件: programs/tot-token/src/state/holder.rs
// 持有者账户定义
// ============================================

use anchor_lang::prelude::*;

/// 持有者账户
/// 用于追踪每个持有者的信息和统计
#[account]
pub struct HolderAccount {
    /// 持有者钱包地址
    pub owner: Pubkey,
    
    /// 关联的代币账户 - 持有者的TOT代币账户
    pub token_account: Pubkey,
    
    /// 首次持有时间 (Unix timestamp) - 用户首次获得TOT代币的时间
    pub first_hold_time: i64,
    
    /// 最后交易时间 (Unix timestamp) - 最后一次买入或卖出的时间
    pub last_transaction_time: i64,
    
    /// 累计持有天数 (加权) - 用于计算持有时间折扣
    pub weighted_hold_days: u64,
    
    /// 累计买入量 - 用户累计买入的TOT代币数量
    pub total_bought: u64,
    
    /// 累计卖出量 - 用户累计卖出的TOT代币数量
    pub total_sold: u64,
    
    /// 累计缴税量 - 用户累计支付的税收总额
    pub total_tax_paid: u64,
    
    /// 是否被冻结 - 管理员可以冻结违规账户
    pub is_frozen: bool,
    
    /// 冻结原因代码 - 0表示未冻结，其他值表示不同的冻结原因
    pub freeze_reason: u8,
    
    /// Bump seed - PDA派生种子
    pub bump: u8,
}

impl HolderAccount {
    /// 计算账户所需空间
    pub const LEN: usize = 8 + // discriminator
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
    
    /// 计算持有天数
    pub fn get_holding_days(&self, current_time: i64) -> u64 {
        if current_time <= self.first_hold_time {
            return 0;
        }
        let holding_seconds = current_time
            .saturating_sub(self.first_hold_time) as u64;
        holding_seconds / 86400 // 转换为天数
    }
    
    /// 更新持有者统计（买入）
    pub fn record_buy(&mut self, amount: u64, tax_paid: u64, timestamp: i64) -> Result<()> {
        self.total_bought = self.total_bought
            .checked_add(amount)
            .ok_or(anchor_lang::error!(crate::errors::TotError::MathOverflow))?;
        
        self.total_tax_paid = self.total_tax_paid
            .checked_add(tax_paid)
            .ok_or(anchor_lang::error!(crate::errors::TotError::MathOverflow))?;
        
        self.last_transaction_time = timestamp;
        
        // 如果是首次持有，更新首次持有时间
        if self.first_hold_time == 0 {
            self.first_hold_time = timestamp;
        }
        
        Ok(())
    }
    
    /// 更新持有者统计（卖出）
    pub fn record_sell(&mut self, amount: u64, tax_paid: u64, timestamp: i64) -> Result<()> {
        self.total_sold = self.total_sold
            .checked_add(amount)
            .ok_or(anchor_lang::error!(crate::errors::TotError::MathOverflow))?;
        
        self.total_tax_paid = self.total_tax_paid
            .checked_add(tax_paid)
            .ok_or(anchor_lang::error!(crate::errors::TotError::MathOverflow))?;
        
        self.last_transaction_time = timestamp;
        
        Ok(())
    }
}
