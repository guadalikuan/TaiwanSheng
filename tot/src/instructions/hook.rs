// ============================================
// 文件: src/instructions/hook.rs
// Transfer Hook 指令实现
// ============================================

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use spl_transfer_hook_interface::instruction::{ExecuteInstruction, TransferHookInstruction};
use spl_tlv_account_resolution::state::ExtraAccountMetaList;
use crate::state::hook::TransferHookConfig;
use crate::errors::TotError;

/// 初始化Transfer Hook配置
/// 
/// 创建Transfer Hook配置账户，设置TOT Mint地址和配置地址。
/// 这是部署Transfer Hook程序后的第一步。
/// 
/// # 参数
/// * `ctx` - 初始化上下文
/// * `tot_mint` - TOT代币的Mint地址
/// * `tot_config` - TOT全局配置账户地址
/// 
/// # 返回值
/// * `Result<()>` - 成功返回Ok(())
/// 
/// # 功能
    /// - 创建Transfer Hook配置PDA账户
/// - 设置管理员权限
/// - 关联TOT Mint和配置账户
/// - 初始化统计信息
pub fn initialize_transfer_hook(
    ctx: Context<InitializeTransferHook>,
    tot_mint: Pubkey,
    tot_config: Pubkey,
) -> Result<()> {
    let hook_config = &mut ctx.accounts.hook_config;
    
    // 设置管理员
    hook_config.authority = ctx.accounts.authority.key();
    
    // 关联TOT Mint和配置
    hook_config.tot_mint = tot_mint;
    hook_config.tot_config = tot_config;
    
    // 初始化统计信息
    hook_config.total_transfers = 0;
    hook_config.total_tax_collected = 0;
    hook_config.total_burned = 0;
    hook_config.is_paused = false;
    hook_config.bump = ctx.bumps.hook_config;

    msg!("Transfer Hook initialized");
    msg!("TOT Mint: {}", tot_mint);
    msg!("TOT Config: {}", tot_config);
    Ok(())
}

/// Transfer Hook执行入口
/// 
/// 这是Token-2022在每次转账时调用的核心函数。
/// 必须符合spl-transfer-hook-interface规范。
/// 
/// # 参数
    /// * `ctx` - Transfer Hook执行上下文（由Token-2022程序自动传递）
/// * `amount` - 转账金额
/// 
/// # 返回值
/// * `Result<()>` - 成功返回Ok(())，失败会导致转账回滚
/// 
/// # 执行流程
/// 1. 验证extra accounts（如果存在）
/// 2. 检查Hook是否暂停
/// 3. 验证Mint地址（确保是TOT代币）
/// 4. 更新统计信息
/// 5. 执行其他自定义逻辑（可扩展）
/// 
/// # 注意事项
/// 
/// ## 调用机制
/// - 此函数由Token-2022程序在每次转账时自动调用
/// - 不是用户直接调用，用户通过标准的token transfer指令触发
/// - 执行失败会导致整个转账失败并回滚
/// 
/// ## 性能要求
/// - 应该尽量轻量，避免高gas消耗
/// - 避免复杂的计算和循环
/// - 优先使用简单的验证和状态更新
/// 
/// ## 账户验证
/// - 账户由Token-2022程序自动传递和验证
    /// - Transfer Hook配置账户通过PDA验证（seeds: ["hook-config"]）
    /// - Mint地址必须与Transfer Hook配置中存储的tot_mint匹配
/// 
/// ## Anchor版本兼容性
/// - Anchor 0.29.0: 不支持#[interface]属性，需要在lib.rs中添加execute函数
/// - Anchor 0.30.0+: 支持#[interface]属性，可以直接使用#[interface(spl_transfer_hook_interface::execute)]
/// - 当前实现：在lib.rs中同时提供execute_internal和execute函数
/// - execute函数符合spl-transfer-hook-interface规范，由Token-2022直接调用
/// - execute_internal是内部实现，由execute函数调用
/// 
/// ## Extra Accounts支持
/// - 当前实现不需要extra accounts
/// - 如果未来需要，可以启用以下验证代码：
///   ```rust
///   if let Some(extra_account_metas) = &ctx.accounts.extra_account_metas {
///       let data = extra_account_metas.try_borrow_data()?;
///       ExtraAccountMetaList::check_account_infos::<ExecuteInstruction>(
///           &ctx.accounts.to_account_infos(),
///           &TransferHookInstruction::Execute { amount }.pack(),
///           &ctx.program_id,
///           &data,
///       )?;
///   }
///   ```
/// 
/// ## Discriminator说明
/// - spl-transfer-hook-interface的execute指令使用固定的discriminator
/// - 值: SHA-256("spl-transfer-hook-interface:execute")的前8字节
/// - 在Anchor 0.29.0中，如果discriminator不匹配，fallback函数会尝试处理
/// - 在Anchor 0.30.0+中，使用#[interface]属性可以自动匹配discriminator
pub fn execute_internal(ctx: Context<ExecuteTransferHook>, amount: u64) -> Result<()> {
    // Extra Accounts验证（当前不需要，未来可启用）
    // 如果Hook需要额外的账户，取消以下注释并实现验证逻辑
    // if let Some(extra_account_metas) = &ctx.accounts.extra_account_metas {
    //     let data = extra_account_metas.try_borrow_data()?;
    //     ExtraAccountMetaList::check_account_infos::<ExecuteInstruction>(
    //         &ctx.accounts.to_account_infos(),
    //         &TransferHookInstruction::Execute { amount }.pack(),
    //         &ctx.program_id,
    //         &data,
    //     )?;
    // }
    let hook_config = &mut ctx.accounts.hook_config;
    
    // 检查Hook是否暂停
    // 如果暂停，拒绝所有转账
    require!(!hook_config.is_paused, TotError::HookPaused);

    // 获取转账信息
    let source = &ctx.accounts.source_account;
    let destination = &ctx.accounts.destination_account;

    // 记录转账信息（用于调试和审计）
    msg!(
        "Transfer Hook: {} tokens from {} to {}",
        amount,
        source.key(),
        destination.key()
    );

    // 验证Mint地址
    // 确保这是TOT代币的转账，防止Hook被用于其他代币
    require!(
        ctx.accounts.mint.key() == hook_config.tot_mint,
        TotError::InvalidMint
    );

    // 更新统计信息
    // 记录转账次数（用于分析和监控）
    hook_config.total_transfers = hook_config.total_transfers
        .checked_add(1)
        .ok_or(error!(TotError::MathOverflow))?;

    msg!("Transfer Hook executed successfully");
    Ok(())
}

/// 暂停/恢复Hook
/// 
/// 管理员可以暂停或恢复Hook的执行。
    /// 暂停后，所有转账都会失败（因为Transfer Hook执行失败）。
/// 
/// # 参数
/// * `ctx` - 管理员操作上下文
/// * `paused` - 暂停状态（true=暂停，false=恢复）
/// 
/// # 返回值
/// * `Result<()>` - 成功返回Ok(())
/// 
/// # 用途
/// - 紧急情况下暂停所有转账
/// - 系统维护时暂停
    /// - 升级Transfer Hook程序前暂停
pub fn set_transfer_hook_paused(ctx: Context<TransferHookAdminAction>, paused: bool) -> Result<()> {
    let hook_config = &mut ctx.accounts.hook_config;
    hook_config.is_paused = paused;
    
    msg!("Hook paused status: {}", paused);
    Ok(())
}

/// 初始化 Transfer Hook 配置的账户
#[derive(Accounts)]
pub struct InitializeTransferHook<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + TransferHookConfig::LEN,
        seeds = [b"hook-config"],
        bump
    )]
    pub hook_config: Account<'info, TransferHookConfig>,

    pub system_program: Program<'info, System>,
}

/// Transfer Hook 执行的账户
/// 
/// 这些账户由 Token-2022 程序自动传递
#[derive(Accounts)]
pub struct ExecuteTransferHook<'info> {
    /// 源代币账户
    #[account()]
    pub source_account: InterfaceAccount<'info, TokenAccount>,

    /// 目标代币账户
    #[account()]
    pub destination_account: InterfaceAccount<'info, TokenAccount>,

    /// 源账户所有者/授权者
    /// CHECK: 由Token-2022程序验证
    pub source_authority: AccountInfo<'info>,

    /// Mint 账户
    #[account()]
    pub mint: InterfaceAccount<'info, Mint>,

    /// Extra Account Metas账户（可选）
    /// 
    /// 如果Hook需要额外的账户，这些账户的元数据会存储在这里。
    /// Token-2022程序会自动传递这些账户。
    /// 
    /// # 使用说明
    /// - 当前实现不需要extra accounts，此字段为None
    /// - 如果未来需要额外账户，需要：
    ///   1. 在execute_internal函数中启用extra_account_metas验证
    ///   2. 使用ExtraAccountMetaList::check_account_infos验证账户
    ///   3. 确保账户顺序和类型符合要求
    /// 
    /// CHECK: 由Token-2022程序验证，如果不需要extra accounts则为None
    pub extra_account_metas: Option<AccountInfo<'info>>,

    /// Transfer Hook 配置
    #[account(
        mut,
        seeds = [b"hook-config"],
        bump = hook_config.bump
    )]
    pub hook_config: Account<'info, TransferHookConfig>,
}

/// Transfer Hook 管理员操作账户
#[derive(Accounts)]
pub struct TransferHookAdminAction<'info> {
    #[account(
        constraint = authority.key() == hook_config.authority @ TotError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"hook-config"],
        bump = hook_config.bump
    )]
    pub hook_config: Account<'info, TransferHookConfig>,
}
