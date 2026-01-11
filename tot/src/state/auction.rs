//! # 拍卖账户模块
//! 
//! 本模块定义了拍卖系统的链上状态账户。
//! 用于存储拍卖资产的信息，包括所有者、价格、留言等。
//! 
//! ============================================
// 文件: src/state/auction.rs
// 拍卖账户定义
// ============================================

use anchor_lang::prelude::*;

/// 拍卖账户结构体
/// 
/// 存储拍卖资产的上链信息，包括资产ID、所有者、价格、留言等。
/// 每次创建拍卖时，会创建此账户并将拍卖信息上链。
/// 
/// ## 账户特性
/// 
/// - 使用PDA创建，种子: `["tot_auction", asset_id.as_bytes()]`
/// - 每个拍卖有唯一的账户地址
/// - 存储了拍卖的核心信息
#[account]
pub struct AuctionAccount {
    /// 资产ID
    /// 
    /// 类型: String (动态大小)
    /// 
    /// 说明:
    /// - 资产的唯一标识符
    /// - 与tws系统中的资产ID对应
    /// - 用于查询和关联
    pub asset_id: String,
    
    /// 当前所有者
    /// 
    /// 类型: Pubkey (32字节)
    /// 
    /// 说明:
    /// - 资产的当前所有者地址
    /// - 创建时，所有者是创建者
    /// - 每次夺取后，所有者更新为新夺取者
    pub owner: Pubkey,
    
    /// 当前价格
    /// 
    /// 类型: u64 (8字节，基础单位)
    /// 
    /// 说明:
    /// - 资产的当前价格（以TOT代币计价）
    /// - 已考虑decimals（乘以10^9）
    /// - 每次夺取时，价格会增加10%
    pub price: u64,
    
    /// 起拍价
    /// 
    /// 类型: u64 (8字节，基础单位)
    /// 
    /// 说明:
    /// - 拍卖创建时的起拍价
    /// - 用于记录初始价格
    /// - 不会改变
    pub start_price: u64,
    
    /// 嘲讽留言
    /// 
    /// 类型: String (动态大小，最大100字符)
    /// 
    /// 说明:
    /// - 创建或夺取时的留言
    /// - 用于展示和记录
    /// - 每次夺取时可以更新
    pub taunt_message: String,
    
    /// 创建时间
    /// 
    /// 类型: i64 (8字节，Unix时间戳)
    /// 
    /// 说明:
    /// - 拍卖创建的时间
    /// - 用于审计和统计
    pub created_at: i64,
    
    /// 最后夺取时间
    /// 
    /// 类型: i64 (8字节，Unix时间戳)
    /// 
    /// 说明:
    /// - 最后一次夺取的时间
    /// - 用于显示最近活动
    /// - 创建时等于created_at
    pub last_seized_at: i64,
    
    /// PDA Bump种子
    /// 
    /// 类型: u8 (1字节)
    /// 
    /// 说明:
    /// - 用于PDA派生的bump值
    /// - 确保账户地址的确定性
    /// - 在账户创建时自动计算
    pub bump: u8,
}

impl AuctionAccount {
    /// 计算账户所需空间
    /// 
    /// 返回拍卖账户所需的总字节数，用于账户初始化时的空间分配。
    /// 
    /// 注意：由于包含动态大小的String字段，实际大小可能变化。
    /// 这里提供一个估算值，实际使用时需要根据asset_id和taunt_message的长度调整。
    /// 
    /// 估算大小: 约 200-300 字节（取决于字符串长度）
    pub fn calculate_size(asset_id_len: usize, taunt_message_len: usize) -> usize {
        8 + // discriminator (Anchor自动添加)
        4 + asset_id_len + // asset_id (String)
        32 + // owner (Pubkey)
        8 + // price (u64)
        8 + // start_price (u64)
        4 + taunt_message_len + // taunt_message (String)
        8 + // created_at (i64)
        8 + // last_seized_at (i64)
        1 // bump (u8)
    }
    
    /// 计算最低出价
    /// 
    /// 根据当前价格计算最低出价（当前价格 + 10%）
    /// 
    /// 返回最低出价（基础单位）
    pub fn calculate_min_required(&self) -> Result<u64> {
        // 计算 110% = 当前价格 * 110 / 100
        self.price
            .checked_mul(110)
            .and_then(|v| v.checked_div(100))
            .ok_or_else(|| anchor_lang::error!(anchor_lang::error::ErrorCode::ArithmeticError))
    }
    
    /// 计算分账金额
    /// 
    /// 根据总金额计算分账：
    /// - 5%给财库
    /// - 95%给上一任房主
    /// 
    /// 返回 (财库金额, 房主金额)
    pub fn calculate_split(&self, total_amount: u64) -> Result<(u64, u64)> {
        // 计算5%给财库
        let fee_amount = total_amount
            .checked_mul(5)
            .and_then(|v| v.checked_div(100))
            .ok_or_else(|| anchor_lang::error!(anchor_lang::error::ErrorCode::ArithmeticError))?;
        
        // 计算95%给房主
        let payout_amount = total_amount
            .checked_sub(fee_amount)
            .ok_or_else(|| anchor_lang::error!(anchor_lang::error::ErrorCode::ArithmeticError))?;
        
        Ok((fee_amount, payout_amount))
    }
}
