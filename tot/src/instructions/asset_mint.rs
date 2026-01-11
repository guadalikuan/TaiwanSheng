// ============================================
// 文件: src/instructions/asset_mint.rs
// 资产上链指令
// ============================================

use anchor_lang::prelude::*;

use crate::state::config::TotConfig;
use crate::state::asset::{AssetAccount, AssetLocation};
use crate::constants::seeds;
use crate::errors::TotError;

/// 资产上链账户结构
#[derive(Accounts)]
#[instruction(asset_id: String)]
pub struct MintAsset<'info> {
    /// 管理员（签名者，需要验证权限）
    #[account(
        constraint = authority.key() == config.authority @ TotError::Unauthorized
    )]
    pub authority: Signer<'info>,

    /// 资产账户（PDA）
    #[account(
        init,
        payer = authority,
        space = AssetAccount::calculate_size(asset_id.len(), metadata_uri.as_ref().map(|s| s.len())),
        seeds = [seeds::ASSET_SEED, asset_id.as_bytes()],
        bump
    )]
    pub asset_account: Account<'info, AssetAccount>,

    /// 全局配置
    #[account(
        seeds = [seeds::CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, TotConfig>,

    /// 系统程序
    pub system_program: Program<'info, System>,
}

/// 资产上链处理器
/// 
/// 这是资产审核通过后上链到Solana的核心功能。
/// 将RWA资产信息存储到链上，确保资产信息的不可篡改性和可追溯性。
/// 
/// # 功能流程
/// 
/// 1. **验证阶段**: 检查权限、资产ID有效性
/// 2. **创建账户**: 创建资产账户（PDA）
/// 3. **存储信息**: 存储资产元数据、位置、价值等信息
/// 4. **发出事件**: 记录资产上链信息到链上日志
/// 
/// # 参数
/// * `ctx` - 资产上链上下文，包含所有必需的账户
/// * `asset_id` - 资产唯一ID（字符串）
/// * `asset_type` - 资产类型（0=房产, 1=农田, 2=科创等）
/// * `owner` - 资产初始所有者地址
/// * `location` - 资产位置信息
/// * `value` - 资产价值（TOT代币，基础单位）
/// * `metadata_uri` - 元数据URI（可选）
/// 
/// # 返回值
/// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
/// 
/// # 注意事项
/// 
/// - 只有系统管理员可以执行此操作
/// - 资产ID必须唯一，重复上链会失败
/// - 位置信息需要验证坐标范围
/// - 元数据URI需要验证格式
/// 
/// # 使用示例
/// ```rust
/// // 执行资产上链
/// program.methods
///     .mintAsset(
///         "asset_12345".to_string(),
///         0, // 房产
///         owner_pubkey,
///         AssetLocation { ... },
///         new anchor.BN(1000000000), // 价值1000 TOT
///         Some("https://ipfs.io/...".to_string())
///     )
///     .accounts({...})
///     .rpc();
/// ```
pub fn mint_asset_handler(
    ctx: Context<MintAsset>,
    asset_id: String,
    asset_type: u8,
    owner: Pubkey,
    location: AssetLocation,
    value: u64,
    metadata_uri: Option<String>,
) -> Result<()> {
    // 获取账户和配置引用
    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;
    let asset_account = &mut ctx.accounts.asset_account;

    // ========================================
    // 验证阶段
    // ========================================
    
    // 验证1: 资产ID不能为空
    require!(!asset_id.is_empty(), TotError::InvalidParameter);
    
    // 验证2: 资产类型必须在有效范围内（0-8）
    require!(asset_type <= 8, TotError::InvalidParameter);
    
    // 验证3: 位置信息验证
    // 纬度范围：-90 到 90
    require!(
        location.latitude >= -90.0 && location.latitude <= 90.0,
        TotError::InvalidParameter
    );
    // 经度范围：-180 到 180
    require!(
        location.longitude >= -180.0 && location.longitude <= 180.0,
        TotError::InvalidParameter
    );
    
    // 验证4: 资产价值必须大于0
    require!(value > 0, TotError::InvalidAmount);
    
    // 验证5: 元数据URI格式验证（如果提供）
    if let Some(ref uri) = metadata_uri {
        require!(!uri.is_empty(), TotError::InvalidParameter);
        // 可以添加更严格的URI格式验证
        require!(uri.len() <= 200, TotError::StringTooLong);
    }

    // ========================================
    // 初始化资产账户
    // ========================================
    
    asset_account.asset_id = asset_id;
    asset_account.asset_type = asset_type;
    asset_account.owner = owner;
    asset_account.location = location;
    asset_account.value = value;
    asset_account.minted_at = timestamp;
    asset_account.metadata_uri = metadata_uri;
    asset_account.bump = ctx.bumps.asset_account;

    // ========================================
    // 发出资产上链事件
    // ========================================
    // 
    // 记录资产上链信息到链上日志，便于前端监听和显示。
    // 事件包含完整的资产信息。
    
    emit!(AssetMintedEvent {
        asset_id: asset_account.asset_id.clone(),
        asset_type: asset_account.asset_type,
        owner: asset_account.owner,
        value: asset_account.value,
        timestamp,
    });

    msg!("Asset minted: {}", asset_account.asset_id);
    msg!("Asset type: {}", asset_account.get_asset_type_name());
    msg!("Owner: {}", asset_account.owner);
    msg!("Value: {} TOT", asset_account.value);

    Ok(())
}

/// 资产上链事件
/// 
/// 每次资产上链都会发出此事件，记录完整的资产信息。
/// 前端可以通过监听此事件来实时显示资产上链信息。
#[event]
pub struct AssetMintedEvent {
    /// 资产ID
    pub asset_id: String,
    
    /// 资产类型
    pub asset_type: u8,
    
    /// 资产所有者
    pub owner: Pubkey,
    
    /// 资产价值
    pub value: u64,
    
    /// 上链时间戳
    pub timestamp: i64,
}
