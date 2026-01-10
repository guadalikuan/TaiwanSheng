// ============================================
// 文件: programs/tot-token/src/state/pool.rs
// 池子账户定义
// ============================================

use anchor_lang::prelude::*;

/// 池子类型枚举
/// 对应五大池子分配方案
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum PoolType {
    /// 胜利日基金 - 20.27B (10%) - 锁定至2027年1月1日
    VictoryFund = 0,
    
    /// 历史重铸池 - 19.49B (9.6%) - 初始流动性
    HistoryLP = 1,
    
    /// 认知作战池 - 14.50B (7.15%) - 365天线性释放
    CyberArmy = 2,
    
    /// 外资统战池 - 7.04B (3.47%) - 多签控制
    GlobalAlliance = 3,
    
    /// 资产锚定池 - 141.40B (69.76%) - RWA触发释放
    AssetAnchor = 4,
}

impl PoolType {
    /// 获取池子类型的种子字节
    pub fn as_seed(&self) -> &[u8] {
        match self {
            PoolType::VictoryFund => b"victory",
            PoolType::HistoryLP => b"history",
            PoolType::CyberArmy => b"cyber",
            PoolType::GlobalAlliance => b"global",
            PoolType::AssetAnchor => b"asset",
        }
    }
    
    /// 从u8转换为PoolType
    pub fn from_u8(value: u8) -> Result<Self> {
        match value {
            0 => Ok(PoolType::VictoryFund),
            1 => Ok(PoolType::HistoryLP),
            2 => Ok(PoolType::CyberArmy),
            3 => Ok(PoolType::GlobalAlliance),
            4 => Ok(PoolType::AssetAnchor),
            _ => Err(anchor_lang::error!(crate::errors::TotError::InvalidPoolType)),
        }
    }
}

/// 池子账户
/// 存储每个池子的状态和配置信息
#[account]
pub struct PoolAccount {
    /// 池子类型
    pub pool_type: PoolType,
    
    /// 关联的代币账户 - 存储该池子的代币
    pub token_account: Pubkey,
    
    /// 初始分配量 - 该池子初始分配的代币数量
    pub initial_allocation: u64,
    
    /// 已释放量 - 已从该池子释放的代币数量
    pub released_amount: u64,
    
    /// 解锁时间 (Unix timestamp) - 0表示无时间锁
    /// 胜利日基金锁定至2027年1月1日
    pub unlock_time: i64,
    
    /// 释放开始时间 (Unix timestamp) - 用于线性释放
    pub vesting_start: i64,
    
    /// 释放周期 (秒) - 线性释放的总时长
    /// 认知作战池为365天
    pub vesting_period: i64,
    
    /// 是否需要多签 - 外资统战池需要多签控制
    pub requires_multisig: bool,
    
    /// 多签阈值 - 需要多少个签名才能执行操作
    pub multisig_threshold: u8,
    
    /// 多签签名者 - 最多5个签名者
    pub multisig_signers: [Pubkey; 5],
    
    /// Bump seed - PDA派生种子
    pub bump: u8,
}

impl PoolAccount {
    /// 计算账户所需空间
    pub const LEN: usize = 8 + // discriminator
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
    
    /// 检查池子是否已解锁
    pub fn is_unlocked(&self, current_time: i64) -> bool {
        self.unlock_time == 0 || current_time >= self.unlock_time
    }
    
    /// 计算可释放的代币数量（线性释放）
    pub fn calculate_releasable(&self, current_time: i64) -> Result<u64> {
        // 如果未到解锁时间，返回0
        if !self.is_unlocked(current_time) {
            return Ok(0);
        }
        
        // 如果没有线性释放，返回全部剩余
        if self.vesting_period == 0 {
            return Ok(self.initial_allocation
                .checked_sub(self.released_amount)
                .ok_or(anchor_lang::error!(crate::errors::TotError::MathOverflow))?);
        }
        
        // 如果还未开始释放，返回0
        if current_time < self.vesting_start {
            return Ok(0);
        }
        
        // 计算已过时间
        let elapsed = current_time
            .checked_sub(self.vesting_start)
            .ok_or(anchor_lang::error!(crate::errors::TotError::MathUnderflow))?;
        
        // 如果已过释放周期，返回全部剩余
        if elapsed >= self.vesting_period {
            return Ok(self.initial_allocation
                .checked_sub(self.released_amount)
                .ok_or(anchor_lang::error!(crate::errors::TotError::MathOverflow))?);
        }
        
        // 计算应该释放的总量
        let total_should_release = (self.initial_allocation as u128)
            .checked_mul(elapsed as u128)
            .and_then(|v| v.checked_div(self.vesting_period as u128))
            .ok_or(anchor_lang::error!(crate::errors::TotError::MathOverflow))? as u64;
        
        // 计算可释放量 = 应该释放的总量 - 已释放量
        let releasable = total_should_release
            .checked_sub(self.released_amount)
            .ok_or(anchor_lang::error!(crate::errors::TotError::MathUnderflow))?;
        
        Ok(releasable)
    }
}
