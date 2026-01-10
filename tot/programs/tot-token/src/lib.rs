// ============================================
// 文件: programs/tot-token/src/lib.rs
// TOT Token 主程序入口
// ============================================

use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod state;
pub mod instructions;
pub mod utils;

use instructions::*;
use state::*;

declare_id!("ToT1111111111111111111111111111111111111111");

/// TOT Token 主程序
/// 
/// 实现完整的Solana SPL Token-2022代币系统，包括：
/// - 代币铸造和初始化
/// - 五大池子分配
/// - 动态税收系统
/// - 持有者管理
/// - 管理员功能
#[program]
pub mod tot_token {
    use super::*;

    // ============================================
    // 初始化指令
    // ============================================
    
    /// 初始化 TOT 代币系统
    /// 创建Token-2022 Mint并初始化所有扩展
    pub fn initialize(
        ctx: Context<Initialize>,
        params: InitializeParams,
    ) -> Result<()> {
        instructions::initialize::handler(ctx, params)
    }

    /// 初始化代币池
    /// 为指定的池子类型创建PDA账户
    pub fn init_pool(
        ctx: Context<InitPool>,
        pool_type: PoolType,
    ) -> Result<()> {
        instructions::init_pool::handler(ctx, pool_type)
    }

    /// 铸造代币到各池子
    /// 一次性铸造202.7B代币并按五大池子分配
    pub fn mint_to_pools(ctx: Context<MintToPools>) -> Result<()> {
        instructions::mint_to_pools::handler(ctx)
    }

    // ============================================
    // 持有者管理指令
    // ============================================

    /// 初始化持有者信息
    /// 当用户首次接收TOT代币时调用
    pub fn initialize_holder(ctx: Context<InitializeHolder>) -> Result<()> {
        instructions::holder::initialize_holder_handler(ctx)
    }

    /// 冻结持有者账户
    /// 管理员可以冻结违规账户
    pub fn freeze_holder(
        ctx: Context<FreezeHolder>,
        reason_code: u8,
    ) -> Result<()> {
        instructions::holder::freeze_holder_handler(ctx, reason_code)
    }

    /// 解冻持有者账户
    /// 管理员可以解冻账户
    pub fn unfreeze_holder(ctx: Context<UnfreezeHolder>) -> Result<()> {
        instructions::holder::unfreeze_holder_handler(ctx)
    }

    // ============================================
    // 税率管理指令
    // ============================================

    /// 初始化税率配置
    pub fn initialize_tax_config(ctx: Context<InitializeTaxConfig>) -> Result<()> {
        instructions::tax::initialize_tax_config_handler(ctx)
    }

    /// 更新税率配置
    pub fn update_tax_config(
        ctx: Context<UpdateTaxConfig>,
        base_tax_bps: Option<u16>,
        alpha: Option<u64>,
        beta: Option<u64>,
        gamma_bps: Option<u16>,
        panic_threshold_bps: Option<u16>,
        panic_tax_bps: Option<u16>,
    ) -> Result<()> {
        instructions::tax::update_tax_config_handler(
            ctx,
            base_tax_bps,
            alpha,
            beta,
            gamma_bps,
            panic_threshold_bps,
            panic_tax_bps,
        )
    }

    /// 添加免税地址
    pub fn add_tax_exempt(
        ctx: Context<ManageTaxExempt>,
        address: Pubkey,
    ) -> Result<()> {
        instructions::tax::add_tax_exempt_handler(ctx, address)
    }

    /// 移除免税地址
    pub fn remove_tax_exempt(
        ctx: Context<ManageTaxExempt>,
        address: Pubkey,
    ) -> Result<()> {
        instructions::tax::remove_tax_exempt_handler(ctx, address)
    }

    // ============================================
    // 转账相关（带税收）
    // ============================================

    /// 带税转账
    /// 执行转账并自动计算和收取动态税收
    pub fn transfer_with_tax(
        ctx: Context<TransferWithTax>,
        amount: u64,
        is_sell: bool,
    ) -> Result<()> {
        instructions::transfer::transfer_with_tax_handler(ctx, amount, is_sell)
    }

    // ============================================
    // 管理员功能
    // ============================================

    /// 更新管理员
    pub fn update_authority(
        ctx: Context<UpdateAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        instructions::admin::update_authority_handler(ctx, new_authority)
    }

    /// 暂停/恢复系统
    pub fn set_paused(
        ctx: Context<SetPaused>,
        paused: bool,
    ) -> Result<()> {
        instructions::admin::set_paused_handler(ctx, paused)
    }

    /// 紧急提取（仅限紧急情况）
    pub fn emergency_withdraw(
        ctx: Context<EmergencyWithdraw>,
        amount: u64,
    ) -> Result<()> {
        instructions::admin::emergency_withdraw_handler(ctx, amount)
    }

    // ============================================
    // 查询功能
    // ============================================

    /// 计算税率（只读）
    /// 用于前端显示预估税率
    pub fn calculate_tax(
        ctx: Context<CalculateTax>,
        amount: u64,
        is_buy: bool,
        is_sell: bool,
    ) -> Result<TaxCalculationResult> {
        instructions::query::calculate_tax_handler(ctx, amount, is_buy, is_sell)
    }

    /// 获取持有者统计
    pub fn get_holder_stats(ctx: Context<GetHolderStats>) -> Result<HolderStats> {
        instructions::query::get_holder_stats_handler(ctx)
    }
}

/// 税率计算结果（用于返回给客户端）
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TaxCalculationResult {
    pub base_tax_bps: u16,
    pub holding_discount_bps: u16,
    pub whale_tax_bps: u16,
    pub final_tax_bps: u16,
    pub tax_amount: u64,
    pub net_amount: u64,
}

/// 持有者统计结果
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct HolderStats {
    pub owner: Pubkey,
    pub holding_days: u64,
    pub total_bought: u64,
    pub total_sold: u64,
    pub total_tax_paid: u64,
    pub is_frozen: bool,
    pub tax_discount_tier: String,
}
