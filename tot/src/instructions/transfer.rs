// ============================================
// 文件: src/instructions/transfer.rs
// 带税转账指令
// ============================================

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    self, Mint, TokenAccount, TokenInterface, TransferChecked, Burn,
};

use crate::state::config::TotConfig;
use crate::state::tax::TaxConfig;
use crate::state::holder::HolderAccount;
use crate::constants::seeds;
use crate::errors::TotError;
use crate::utils::tax_calculator::*;
use crate::utils::validation::validate_transfer_amount;

/// 带税转账账户结构
#[derive(Accounts)]
pub struct TransferWithTax<'info> {
    /// 发送者（签名者）
    #[account(mut)]
    pub sender: Signer<'info>,

    /// 发送者代币账户
    #[account(
        mut,
        constraint = sender_token_account.owner == sender.key() @ TotError::InvalidOwner,
        constraint = sender_token_account.mint == mint.key() @ TotError::InvalidMint
    )]
    pub sender_token_account: InterfaceAccount<'info, TokenAccount>,

    /// 接收者代币账户
    #[account(
        mut,
        constraint = receiver_token_account.mint == mint.key() @ TotError::InvalidMint
    )]
    pub receiver_token_account: InterfaceAccount<'info, TokenAccount>,

    /// TOT Mint
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,

    /// 全局配置
    #[account(
        seeds = [seeds::CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, TotConfig>,

    /// 税率配置
    #[account(
        seeds = [seeds::TAX_CONFIG_SEED],
        bump
    )]
    pub tax_config: Account<'info, TaxConfig>,

    /// 发送者持有者信息
    #[account(
        mut,
        seeds = [seeds::HOLDER_SEED, sender.key().as_ref()],
        bump = sender_holder_info.bump
    )]
    pub sender_holder_info: Account<'info, HolderAccount>,

    /// 接收者持有者信息（可能需要初始化）
    /// CHECK: 如果不存在，需要先初始化
    pub receiver_holder_info: Option<Account<'info, HolderAccount>>,

    /// 税收收集账户（流动性池）
    #[account(mut)]
    pub tax_collector: InterfaceAccount<'info, TokenAccount>,

    /// Token 程序
    pub token_program: Interface<'info, TokenInterface>,
}

/// 带税转账处理器
/// 
/// 这是TOT代币系统的核心功能，实现了"宽进严出"的资金单向阀机制。
/// 每次转账都会自动计算动态税率，收取税收，并按照预设比例分配。
/// 
/// # 功能流程
/// 
/// 1. **验证阶段**: 检查系统状态、账户状态、金额有效性
/// 2. **免税检查**: 判断发送者或接收者是否为免税地址
/// 3. **税率计算**: 使用动态税率公式计算实际税率
/// 4. **执行转账**: 将扣除税收后的净金额转给接收者
/// 5. **税收分配**: 按照比例分配税收（销毁、流动性、社区、营销）
/// 6. **更新统计**: 更新持有者的交易统计信息
/// 7. **发出事件**: 记录转账信息到链上日志
/// 
/// # 参数
/// * `ctx` - 转账上下文，包含所有必需的账户
/// * `amount` - 转账金额（原始金额，未扣除税收）
/// * `is_sell` - 是否为卖出操作
///   - `true`: 卖出操作，会计算大额交易惩罚
///   - `false`: 普通转账，不计算大额交易惩罚
/// 
/// # 返回值
/// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
/// 
/// # 税收分配比例
/// 
/// 税收会按照以下比例分配：
/// - 40% 销毁（通缩机制）
/// - 30% 注入流动性池（提升底价）
/// - 20% 社区奖励
/// - 10% 营销费用
/// 
/// # 注意事项
/// 
/// - 发送者账户不能处于冻结状态
/// - 系统处于恐慌模式时，卖出操作会被拒绝
/// - 免税地址的转账不收取税收
/// - 持有时间越长，税率折扣越大
/// 
/// # 使用示例
/// ```rust
/// // 执行带税转账
/// program.methods
///     .transferWithTax(
///         new anchor.BN(1000000), // 转账100万代币
///         true // 是卖出操作
///     )
///     .accounts({...})
///     .rpc();
/// ```
pub fn transfer_with_tax_handler(
    ctx: Context<TransferWithTax>,
    amount: u64,
    is_sell: bool,
) -> Result<()> {
    // 获取账户和配置引用
    let config = &ctx.accounts.config;
    let tax_config = &ctx.accounts.tax_config;
    let sender_holder = &mut ctx.accounts.sender_holder_info;
    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;

    // 缓存常用值以减少重复访问
    let sender_key = ctx.accounts.sender.key();
    let receiver_owner = ctx.accounts.receiver_token_account.owner;
    let mint_decimals = ctx.accounts.mint.decimals;

    // ========================================
    // 免税检查（提前检查以节省gas）
    // ========================================
    // 
    // 检查发送者或接收者是否为免税地址。
    // 如果任一地址免税，则不收取任何税收。
    // 提前检查可以避免不必要的验证计算。
    
    let sender_exempt = tax_config.is_exempt(&sender_key);
    let receiver_exempt = tax_config.is_exempt(&receiver_owner);
    let is_exempt = sender_exempt || receiver_exempt;

    // ========================================
    // 验证阶段
    // ========================================
    
    // 验证1: 检查转账金额是否有效（必须大于0）
    // 这是所有转账都需要的基本验证
    validate_transfer_amount(amount)?;

    // 如果免税，只进行基本验证，然后直接转账
    if is_exempt {
        // 免税转账路径：只进行基本验证，跳过税收计算
        // 直接执行全额转账
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.sender_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.receiver_token_account.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
        );

        token_interface::transfer_checked(
            transfer_ctx,
            amount,  // 全额转账，无税收
            mint_decimals,
        )?;

        // 发出免税转账事件
        emit!(TransferWithTaxEvent {
            from: sender_key,
            to: receiver_owner,
            amount,
            tax_amount: 0,
            net_amount: amount,
            tax_rate_bps: 0,
            burned: 0,
            timestamp,
        });

        return Ok(());
    }

    // 非免税转账路径：进行完整验证和税收计算
    // 缓存常用字段值以减少重复访问
    let panic_mode = config.panic_mode;
    let sender_frozen = sender_holder.is_frozen;
    
    // 验证2: 检查系统是否暂停
    // 如果系统处于恐慌模式且是卖出操作，拒绝执行
    // 这是保护机制，防止在市场异常时的大规模抛售
    require!(!panic_mode || !is_sell, TotError::SystemPaused);

    // 验证3: 检查发送者账户是否被冻结
    // 被冻结的账户无法进行转账操作
    require!(!sender_frozen, TotError::HolderFrozen);

    // 验证4: 检查接收者账户是否被冻结（如果存在）
    // 如果接收者持有者账户存在，需要检查是否被冻结
    if let Some(ref receiver_holder) = ctx.accounts.receiver_holder_info {
        require!(!receiver_holder.is_frozen, TotError::HolderFrozen);
    }

    // ========================================
    // 税率计算
    // ========================================
    // 
    // 使用TOT动态重力场税收模型计算税率：
    // Tax = Base + (P_impact / L) × α + 1/(T_hold + 1)^β × γ
    // 
    // 参数说明:
    // - amount: 转账金额
    // - sender_holder: 发送者持有者信息（用于计算持有时间折扣）
    // - mint.supply: 总供应量（用于计算大额交易惩罚）
    // - timestamp: 当前时间（用于计算持有天数）
    // - false: 不是买入操作
    // - is_sell: 是否为卖出操作（影响大额交易惩罚的计算）
    // - tax_config: 税率配置（包含所有税率参数）
    let tax_calculation = TaxCalculator::calculate_tax(
        amount,
        Some(sender_holder),
        ctx.accounts.mint.supply,
        timestamp,
        false, // 普通转账不是买入
        is_sell,
        tax_config,
    )?;

    // 税率计算信息将在事件中记录，这里不输出msg!以节省gas

    // ========================================
    // 余额验证（在转账前验证，避免无效转账浪费gas）
    // ========================================
    // 
    // 验证发送者账户余额是否足够支付总金额（转账金额 + 税收）。
    // 如果余额不足，在转账前就返回错误，避免浪费gas。
    // 
    // 验证逻辑说明：
    // - amount = net_amount + tax_amount（总金额 = 净转账金额 + 税额）
    // - 发送者需要支付的总金额 = amount（包含税收）
    // - 如果余额 >= amount，转账后剩余余额一定 >= tax_amount（用于税收分配）
    // - 因此只需验证余额 >= amount 即可
    // 
    // 注意：这个验证在税收计算之后进行，确保tax_amount已经计算完成
    require!(
        ctx.accounts.sender_token_account.amount >= amount,
        TotError::InsufficientBalance
    );

    // ========================================
    // 执行转账 - 净金额给接收者
    // ========================================
    // 
    // 将扣除税收后的净金额转给接收者。
    // 如果净金额为0（税率100%），则跳过转账。
    
    if tax_calculation.net_amount > 0 {
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.sender_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.receiver_token_account.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
        );

        // 执行转账（使用transfer_checked确保金额和精度正确）
        token_interface::transfer_checked(
            transfer_ctx,
            tax_calculation.net_amount,  // 转账净金额（扣除税收后）
            mint_decimals,  // 代币精度
        )?;
    }

    // ========================================
    // 处理税收分配
    // ========================================
    // 
    // 如果收取了税收，按照预设比例分配：
    // - 40% 销毁（通缩机制）
    // - 30% 注入流动性池（提升底价）
    // - 20% 社区奖励
    // - 10% 营销费用
    
    // 计算税收分配（用于事件记录）
    // 即使tax_amount为0，也计算分配以便在事件中记录
    let tax_distribution = if tax_calculation.tax_amount > 0 {
        Some(TaxDistribution::calculate(tax_calculation.tax_amount)?)
    } else {
        None
    };
    
    if tax_calculation.tax_amount > 0 {
        // 余额已在转账前验证，无需再次验证
        // 因为 amount = net_amount + tax_amount，如果余额 >= amount，
        // 转账后剩余余额一定 >= tax_amount
        
        // 使用已计算的税收分配
        // 由于已经验证tax_amount > 0，tax_distribution应该存在
        // 但如果TaxDistribution::calculate返回错误，可能为None，需要安全处理
        let tax_dist = tax_distribution.as_ref()
            .ok_or(error!(TotError::TaxCalculationOverflow))?;

        // 分配1: 销毁部分（40%）
        // 销毁代币会减少总供应量，实现通缩机制
        if tax_dist.to_burn > 0 {
            let burn_ctx = CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.sender_token_account.to_account_info(),
                    authority: ctx.accounts.sender.to_account_info(),
                },
            );

            // 执行销毁操作
            token_interface::burn(burn_ctx, tax_dist.to_burn)?;
        }

        // 分配2: 转入税收收集账户（60%：流动性 + 社区 + 营销）
        // 剩余税收 = 总税收 - 销毁部分
        // 使用checked_sub确保数据一致性，如果销毁部分超过总税收，返回错误
        let remaining_tax = tax_calculation.tax_amount
            .checked_sub(tax_dist.to_burn)
            .ok_or(error!(TotError::MathUnderflow))?;

        if remaining_tax > 0 {
            let tax_transfer_ctx = CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.sender_token_account.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.tax_collector.to_account_info(),
                    authority: ctx.accounts.sender.to_account_info(),
                },
            );

            // 将剩余税收转入收集账户
            // 后续会按照比例分配到流动性池、社区、营销等
            token_interface::transfer_checked(
                tax_transfer_ctx,
                remaining_tax,
                mint_decimals,
            )?;
        }
        
        // 合并所有税收分配信息到一个msg!调用，减少gas消耗
        msg!(
            "Tax distribution: burned={}, collected={}, total={}",
            tax_dist.to_burn,
            remaining_tax,
            tax_calculation.tax_amount
        );
    }

    // ========================================
    // 更新持有者统计信息
    // ========================================
    // 
    // 1. 如果是卖出操作，更新发送者的卖出统计
    // 2. 更新接收者的买入统计（接收代币相当于买入）
    // 这些统计用于计算持有时间折扣。
    
    // 更新发送者统计（如果是卖出操作）
    if is_sell {
        sender_holder.record_sell(amount, tax_calculation.tax_amount, timestamp)?;
    }
    
    // 更新接收者统计（接收代币相当于买入操作）
    // 注意：接收者持有者账户可能不存在（新用户），需要先初始化
    // 如果存在，更新其买入统计和首次持有时间
    if let Some(ref mut receiver_holder) = ctx.accounts.receiver_holder_info {
        // 接收代币相当于买入操作，使用净金额（实际收到的代币数量）
        // 接收者不支付税收（税收由发送者支付），所以tax_paid为0
        receiver_holder.record_buy(
            tax_calculation.net_amount,  // 接收者实际收到的代币数量
            0,                           // 接收者不支付税收
            timestamp
        )?;
        
        // 如果接收者的代币账户地址未设置，更新为当前接收者代币账户
        if receiver_holder.token_account == Pubkey::default() {
            receiver_holder.token_account = ctx.accounts.receiver_token_account.key();
        }
    }

    // ========================================
    // 发出转账事件
    // ========================================
    // 
    // 记录转账信息到链上日志，便于前端监听和显示。
    // 事件包含完整的转账信息，包括税收详情。
    
    emit!(TransferWithTaxEvent {
        from: sender_key,
        to: receiver_owner,
        amount,
        tax_amount: tax_calculation.tax_amount,
        net_amount: tax_calculation.net_amount,
        tax_rate_bps: tax_calculation.final_tax_bps,
        burned: tax_distribution.as_ref().map(|d| d.to_burn).unwrap_or(0),
        timestamp,
    });

    Ok(())
}

/// 带税转账事件
/// 
/// 每次带税转账都会发出此事件，记录完整的转账和税收信息。
/// 前端可以通过监听此事件来实时显示转账和税收信息。
#[event]
pub struct TransferWithTaxEvent {
    /// 发送者地址
    pub from: Pubkey,
    
    /// 接收者地址
    pub to: Pubkey,
    
    /// 原始转账金额（未扣除税收）
    pub amount: u64,
    
    /// 收取的税额
    pub tax_amount: u64,
    
    /// 净转账金额（扣除税收后）
    pub net_amount: u64,
    
    /// 最终税率（basis points）
    pub tax_rate_bps: u16,
    
    /// 销毁的代币数量
    pub burned: u64,
    
    /// 交易时间戳
    pub timestamp: i64,
}
