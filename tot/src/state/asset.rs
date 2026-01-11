//! # 资产账户模块
//! 
//! 本模块定义了RWA（Real World Assets）资产的上链状态账户。
//! 用于存储资产审核通过后上链到Solana的资产信息。
//! 
//! ============================================
// 文件: src/state/asset.rs
// 资产账户定义
// ============================================

use anchor_lang::prelude::*;

/// 资产位置信息
/// 
/// 存储资产的地理位置坐标
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct AssetLocation {
    /// 纬度
    pub latitude: f64,
    
    /// 经度
    pub longitude: f64,
    
    /// 省份
    pub province: String,
    
    /// 城市
    pub city: String,
    
    /// 区县（可选）
    pub district: Option<String>,
    
    /// 详细地址（可选）
    pub address: Option<String>,
}

impl AssetLocation {
    /// 计算位置信息所需的空间
    /// 
    /// 使用固定大小估算，实际大小取决于字符串长度
    pub const ESTIMATED_SIZE: usize = 8 + // latitude (f64)
        8 + // longitude (f64)
        4 + 100 + // province (String, 最大100字符)
        4 + 100 + // city (String, 最大100字符)
        1 + 4 + 100 + // district (Option<String>, 最大100字符)
        1 + 4 + 200; // address (Option<String>, 最大200字符)
}

/// 资产账户结构体
/// 
/// 存储RWA资产的上链信息，包括资产ID、类型、位置、价值等。
/// 资产审核通过后，会创建此账户并将资产信息上链。
/// 
/// ## 账户特性
/// 
/// - 使用PDA创建，种子: `["asset", asset_id.as_bytes()]`
/// - 每个资产有唯一的账户地址
/// - 存储了资产的核心信息
#[account]
pub struct AssetAccount {
    /// 资产唯一ID
    /// 
    /// 类型: String (动态大小)
    /// 
    /// 说明:
    /// - 资产的唯一标识符
    /// - 与tws系统中的资产ID对应
    /// - 用于查询和关联
    pub asset_id: String,
    
    /// 资产类型
    /// 
    /// 类型: u8 (1字节)
    /// 
    /// 说明:
    /// - 0: 房产
    /// - 1: 农田
    /// - 2: 科创
    /// - 3: 酒水
    /// - 4: 文创
    /// - 5: 矿产
    /// - 6: 仓库
    /// - 7: 航船
    /// - 8: 芯片
    /// - 其他: 预留
    pub asset_type: u8,
    
    /// 当前所有者
    /// 
    /// 类型: Pubkey (32字节)
    /// 
    /// 说明:
    /// - 资产的当前所有者地址
    /// - 资产审核通过后，初始所有者通常是平台或提交者
    /// - 可以通过交易转移所有权
    pub owner: Pubkey,
    
    /// 位置信息
    /// 
    /// 类型: AssetLocation (动态大小)
    /// 
    /// 说明:
    /// - 资产的地理位置
    /// - 包括经纬度、省市区、详细地址等
    pub location: AssetLocation,
    
    /// 资产价值
    /// 
    /// 类型: u64 (8字节，基础单位)
    /// 
    /// 说明:
    /// - 资产的价值（以TOT代币计价）
    /// - 已考虑decimals（乘以10^9）
    pub value: u64,
    
    /// 上链时间
    /// 
    /// 类型: i64 (8字节，Unix时间戳)
    /// 
    /// 说明:
    /// - 资产上链到Solana的时间
    /// - 用于审计和统计
    pub minted_at: i64,
    
    /// 元数据URI（可选）
    /// 
    /// 类型: Option<String> (动态大小)
    /// 
    /// 说明:
    /// - 指向资产详细元数据的URI
    /// - 可以存储IPFS链接或其他链下存储地址
    /// - 如果为None，表示元数据存储在链上账户中
    pub metadata_uri: Option<String>,
    
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

impl AssetAccount {
    /// 计算账户所需空间
    /// 
    /// 返回资产账户所需的总字节数，用于账户初始化时的空间分配。
    /// 
    /// 注意：由于包含动态大小的String字段，实际大小可能变化。
    /// 这里提供一个估算值，实际使用时需要根据asset_id和metadata_uri的长度调整。
    /// 
    /// 估算大小: 约 500-1000 字节（取决于字符串长度）
    pub fn calculate_size(asset_id_len: usize, metadata_uri_len: Option<usize>) -> usize {
        8 + // discriminator (Anchor自动添加)
        4 + asset_id_len + // asset_id (String)
        1 + // asset_type (u8)
        32 + // owner (Pubkey)
        AssetLocation::ESTIMATED_SIZE + // location (AssetLocation)
        8 + // value (u64)
        8 + // minted_at (i64)
        1 + // metadata_uri Option标志
        metadata_uri_len.map(|len| 4 + len).unwrap_or(0) + // metadata_uri (Option<String>)
        1 // bump (u8)
    }
    
    /// 获取资产类型名称
    /// 
    /// 根据asset_type返回对应的资产类型名称
    pub fn get_asset_type_name(&self) -> &'static str {
        match self.asset_type {
            0 => "房产",
            1 => "农田",
            2 => "科创",
            3 => "酒水",
            4 => "文创",
            5 => "矿产",
            6 => "仓库",
            7 => "航船",
            8 => "芯片",
            _ => "未知",
        }
    }
}
