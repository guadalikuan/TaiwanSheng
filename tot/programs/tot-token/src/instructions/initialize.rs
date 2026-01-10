//! # 初始化指令模块
//! 
//! 本模块实现了TOT代币系统的初始化功能，包括创建Token-2022 Mint账户
//! 并初始化所有扩展功能。这是部署TOT代币的第一步，也是最关键的一步。
//! 
//! ## 初始化流程
//! 
//! 1. 计算Mint账户所需空间（包含所有扩展）
//! 2. 创建Mint账户
//! 3. 初始化Transfer Fee扩展（交易税功能）
//! 4. 初始化Permanent Delegate扩展（永久代理权）
//! 5. 初始化Metadata Pointer扩展（可更新元数据）
//! 6. 初始化Transfer Hook扩展（自定义转账逻辑，可选）
//! 7. 初始化Mint（设置精度、权限等）
//! 8. 初始化全局配置账户
//! 
//! ## 重要说明
//! 
//! - 初始化顺序很重要：必须先初始化扩展，再初始化Mint
//! - Mint账户必须作为Signer传入（因为需要创建它）
//! - 所有扩展初始化后，Mint账户的结构就固定了，无法更改
//! 
//! ============================================
// 文件: programs/tot-token/src/instructions/initialize.rs
// 初始化指令 - 创建Token-2022 Mint并初始化所有扩展
// ============================================

use anchor_lang::prelude::*;
use anchor_spl::token_interface::TokenInterface;
use solana_program::program::invoke;
use spl_token_2022::{
    extension::ExtensionType,
    state::Mint,
    instruction as token_2022_instruction,
};

use crate::constants::*;
use crate::state::config::*;
use crate::errors::TotError;

/// 初始化账户结构
/// 
/// 定义了初始化TOT代币系统所需的所有账户。
/// 这些账户包括Mint账户、配置账户、系统程序等。
#[derive(Accounts)]
pub struct Initialize<'info> {
    /// 部署者/管理员
    /// 
    /// 说明:
    /// - 执行初始化的签名者
    /// - 需要支付所有账户的创建费用
    /// - 将成为系统的初始管理员
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// TOT代币Mint账户 (Token-2022)
    /// 
    /// 说明:
    /// - 必须作为Signer传入，因为我们需要创建它
    /// - 这是TOT代币的Mint账户，用于标识代币类型
    /// - 在初始化过程中会被创建和配置
    /// 
    /// 注意:
    /// - 需要预先生成Mint密钥对
    /// - Mint地址将成为代币的唯一标识符
    #[account(mut)]
    pub mint: Signer<'info>,
    
    /// 全局配置账户
    /// 
    /// 说明:
    /// - 使用PDA创建，种子: `["tot_config"]`
    /// - 存储系统的全局状态和配置
    /// - 在初始化时自动创建
    #[account(
        init,
        payer = authority,
        space = 8 + TotConfig::LEN,
        seeds = [seeds::CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, TotConfig>,
    
    /// Transfer Hook程序账户（可选）
    /// 
    /// 说明:
    /// - 如果提供，会在初始化时配置Transfer Hook扩展
    /// - 如果为None，可以后续通过其他方式设置
    /// - Transfer Hook用于自定义转账逻辑
    /// 
    /// 注意:
    /// - Hook程序需要单独部署
    /// - 可以在主程序部署后再设置Hook
    /// CHECK: 验证在指令逻辑中
    pub transfer_hook_program: Option<AccountInfo<'info>>,
    
    /// Token-2022程序
    /// 
    /// 说明:
    /// - Solana的Token-2022程序ID
    /// - 用于创建和操作Token-2022代币
    /// - 与标准Token程序不同，支持扩展功能
    pub token_program: Interface<'info, TokenInterface>,
    
    /// 系统程序
    /// 
    /// 说明:
    /// - Solana系统程序，用于创建账户
    pub system_program: Program<'info, System>,
    
    /// 租金Sysvar
    /// 
    /// 说明:
    /// - 用于计算账户创建所需的租金
    /// - 确保账户有足够的SOL支付租金
    pub rent: Sysvar<'info, Rent>,
}

/// 初始化处理器
/// 
/// 这是TOT代币系统初始化的核心函数，负责创建Mint账户并配置所有扩展功能。
/// 
/// # 功能说明
/// 
/// 本函数按照特定顺序执行以下操作：
/// 
/// 1. **计算Mint账户空间**: 根据需要的扩展计算账户大小
/// 2. **创建Mint账户**: 使用系统程序创建账户
/// 3. **初始化扩展**: 按顺序初始化所有Token-2022扩展
/// 4. **初始化Mint**: 设置代币的基本参数
/// 5. **初始化配置**: 创建全局配置账户
/// 
/// # 参数
/// * `ctx` - 初始化上下文，包含所有必需的账户
/// * `params` - 初始化参数
///   - `tax_config`: 可选，税率配置账户地址
///   - `liquidity_pool`: 可选，流动性池地址
/// 
/// # 返回值
/// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
/// 
/// # 初始化顺序的重要性
/// 
/// Token-2022的扩展必须在Mint初始化之前配置，因为：
/// - 扩展会修改Mint账户的数据结构
/// - 一旦Mint初始化完成，扩展结构就固定了
/// - 错误的顺序会导致初始化失败
/// 
/// # 扩展说明
/// 
/// 1. **Transfer Fee**: 启用交易税功能，初始税率0.5%
/// 2. **Permanent Delegate**: 设置永久代理，管理员可强制转移/销毁
/// 3. **Metadata Pointer**: 设置元数据指针，允许更新元数据
/// 4. **Transfer Hook**: 设置转账钩子，实现自定义转账逻辑（可选）
/// 
/// # 错误处理
/// 
/// - 如果Mint账户已存在，会返回错误
/// - 如果空间计算失败，返回`TotError::InvalidMint`
/// - 如果扩展初始化失败，会回滚所有操作
/// 
/// # 使用示例
/// ```rust
/// // 在客户端调用
/// program.methods
///     .initialize({
///         taxConfig: null,
///         liquidityPool: null,
///     })
///     .accounts({
///         authority: deployer,
///         mint: mintKeypair.publicKey,
///         config: configPda,
///         transferHookProgram: null,
///         tokenProgram: TOKEN_2022_PROGRAM_ID,
///         systemProgram: SystemProgram.programId,
///         rent: SYSVAR_RENT_PUBKEY,
///     })
///     .signers([mintKeypair])
///     .rpc();
/// ```
pub fn handler(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
    // 获取账户引用
    let authority = &ctx.accounts.authority;
    let mint = &ctx.accounts.mint;
    let config = &mut ctx.accounts.config;
    let token_program = &ctx.accounts.token_program;
    let system_program = &ctx.accounts.system_program;
    let rent = &ctx.accounts.rent;
    
    // ========================================
    // 步骤1: 计算 Mint 账户所需空间 (含扩展)
    // ========================================
    // 
    // Token-2022的扩展功能需要额外的账户空间。
    // 必须在创建账户前准确计算所需空间，否则账户创建会失败。
    
    // 定义需要启用的扩展类型
    let extensions = vec![
        ExtensionType::TransferFeeConfig,    // 交易税扩展
        ExtensionType::PermanentDelegate,    // 永久代理扩展
        ExtensionType::MetadataPointer,      // 元数据指针扩展
        ExtensionType::TransferHook,         // 转账钩子扩展（可选）
    ];
    
    // 计算包含所有扩展的Mint账户所需空间
    // 这会计算基础Mint空间 + 所有扩展的空间
    let mint_space = ExtensionType::try_calculate_account_len::<Mint>(&extensions)
        .map_err(|_| TotError::InvalidMint)?;
    
    // 计算创建账户所需的租金（以lamports为单位）
    let mint_rent = rent.minimum_balance(mint_space);
    
    // ========================================
    // 步骤2: 创建 Mint 账户
    // ========================================
    // 
    // 使用系统程序创建Mint账户。
    // 注意：此时账户是空的，还没有初始化任何扩展或Mint本身。
    
    anchor_lang::system_program::create_account(
        CpiContext::new(
            system_program.to_account_info(),
            anchor_lang::system_program::CreateAccount {
                from: authority.to_account_info(),  // 从管理员账户支付租金
                to: mint.to_account_info(),        // 创建Mint账户
            },
        ),
        mint_rent,              // 支付租金
        mint_space as u64,      // 账户大小
        &token_program.key(),   // 账户所有者（Token-2022程序）
    )?;
    
    // ========================================
    // 步骤3: 初始化 Transfer Fee 扩展
    // ========================================
    // 
    // Transfer Fee扩展允许在每次转账时自动收取手续费。
    // 这是Token-2022的核心功能之一，用于实现交易税。
    // 
    // 配置说明:
    // - initial_fee_basis_points: 初始税率（50 = 0.5%）
    // - max_fee: 最大单笔税额（u64::MAX = 无上限）
    // - transfer_fee_config_authority: 可以更新税率的权限（保留给管理员）
    // - withdraw_withheld_authority: 可以提取累积税额的权限（保留给管理员）
    
    // 初始税率: 0.5% (50 basis points)
    // 注意: 这是Token-2022内置的Transfer Fee，与我们的动态税收系统是分开的
    // 可以设置为较低的值，主要依赖我们的Transfer Hook实现动态税收
    let initial_fee_basis_points: u16 = 50;
    let max_fee: u64 = u64::MAX; // 无上限，允许大额转账
    
    invoke(
        &token_2022_instruction::initialize_transfer_fee_config(
            &token_program.key(),
            &mint.key(),
            Some(&authority.key()), // transfer_fee_config_authority: 可以更新税率的权限
            Some(&authority.key()), // withdraw_withheld_authority: 可以提取累积税额的权限
            initial_fee_basis_points,
            max_fee,
        )?,
        &[
            mint.to_account_info(),
            authority.to_account_info(),
        ],
    )?;
    
    // ========================================
    // 步骤4: 初始化 Permanent Delegate 扩展
    // ========================================
    // 
    // Permanent Delegate（永久代理）是Token-2022的强大功能。
    // 它允许指定的地址（permanent_delegate）在不需用户私钥的情况下，
    // 对任何账户的代币进行强制转移或销毁。
    // 
    // 用途:
    // - 合规和反洗钱：可以冻结和转移违规账户的资金
    // - 紧急情况：可以保护用户资金或执行制裁
    // - 这是TOT的"核按钮"，必须谨慎使用
    // 
    // 重要:
    // - Permanent Delegate一旦设置，无法更改
    // - 建议使用多签钱包作为permanent_delegate
    // - 只有permanent_delegate可以执行强制操作
    
    invoke(
        &token_2022_instruction::initialize_permanent_delegate(
            &token_program.key(),
            &mint.key(),
            &authority.key(), // permanent_delegate: 永久代理地址（设置为管理员）
        )?,
        &[
            mint.to_account_info(),
        ],
    )?;
    
    // ========================================
    // 步骤5: 初始化 Metadata Pointer 扩展
    // ========================================
    // 
    // Metadata Pointer扩展允许将元数据存储在链上，并支持更新。
    // 这对于需要动态更新代币信息的场景很重要。
    // 
    // 配置说明:
    // - metadata_authority: 可以更新元数据的权限（保留给管理员）
    // - metadata地址: 元数据存储的位置（可以指向Mint账户本身或其他账户）
    // 
    // 用途:
    // - 存储代币名称、符号、描述等信息
    // - 在关键时刻（如2027前夕）可以更新元数据，发布檄文
    // - 保持元数据的灵活性和可更新性
    
    invoke(
        &token_2022_instruction::initialize_metadata_pointer(
            &token_program.key(),
            &mint.key(),
            Some(&authority.key()), // metadata_authority: 可以更新元数据的权限
            Some(&mint.key()),      // metadata地址: 元数据存储在mint账户本身
        )?,
        &[
            mint.to_account_info(),
        ],
    )?;
    
    // ========================================
    // 步骤6: 初始化 Transfer Hook 扩展 (可选)
    // ========================================
    // 
    // Transfer Hook扩展允许在每次转账时调用自定义程序。
    // 这是实现TOT动态税收系统的关键。
    // 
    // 配置说明:
    // - hook_authority: 可以更新Hook配置的权限（保留给管理员）
    // - hook_program_id: Transfer Hook程序的地址
    // 
    // 注意:
    // - 如果transfer_hook_program为None，则跳过此步骤
    // - Hook程序需要单独部署
    // - 可以在主程序部署后再设置Hook
    
    if let Some(hook_program) = &ctx.accounts.transfer_hook_program {
        invoke(
            &spl_token_2022::instruction::initialize_transfer_hook(
                &token_program.key(),
                &mint.key(),
                Some(&authority.key()),      // hook_authority: 可以更新Hook配置的权限
                Some(&hook_program.key()),  // hook_program_id: Transfer Hook程序地址
            )?,
            &[
                mint.to_account_info(),
            ],
        )?;
    }
    
    // ========================================
    // 步骤7: 初始化 Mint
    // ========================================
    // 
    // 在所有扩展初始化完成后，最后初始化Mint本身。
    // 这设置了代币的基本参数：精度、Mint Authority、Freeze Authority等。
    // 
    // 配置说明:
    // - mint_authority: 可以铸造新代币的权限（保留给管理员，后续可以销毁）
    // - freeze_authority: 可以冻结账户的权限（保留给管理员）
    // - decimals: 代币精度（9位小数）
    // 
    // 重要:
    // - 一旦Mint初始化完成，扩展结构就固定了，无法更改
    // - Mint Authority可以在后续销毁，确保总量不再增加
    // - Freeze Authority保留，用于合规和紧急情况
    
    invoke(
        &token_2022_instruction::initialize_mint2(
            &token_program.key(),
            &mint.key(),
            &authority.key(),       // mint_authority: 铸造权限
            Some(&authority.key()), // freeze_authority: 冻结权限
            TOKEN_DECIMALS,         // 精度: 9位小数
        )?,
        &[
            mint.to_account_info(),
        ],
    )?;
    
    // ========================================
    // 步骤8: 初始化 Token Metadata (使用Metadata Interface)
    // ========================================
    // 
    // 注意: 这里需要使用spl-token-metadata-interface
    // 如果项目中没有这个依赖，可以暂时注释掉，后续添加
    // 
    // Metadata可以包含：
    // - 代币名称、符号
    // - 描述信息
    // - 图片URI
    // - 属性信息
    // 
    // 这些信息会显示在钱包和交易所中
    
    // ========================================
    // 步骤9: 初始化全局配置账户
    // ========================================
    // 
    // 创建并初始化TotConfig账户，存储系统的全局状态。
    // 这个账户是系统的"控制中心"，记录了所有关键信息。
    
    let clock = Clock::get()?;
    
    // 设置管理员地址
    config.authority = authority.key();
    
    // 设置Mint地址
    config.mint = mint.key();
    
    // 设置国库地址（初始为管理员地址，后续可以更改）
    config.treasury = authority.key();
    
    // 设置流动性池地址（如果提供，否则为默认值）
    config.liquidity_pool = params.liquidity_pool.unwrap_or(Pubkey::default());
    
    // 设置税率配置地址（如果提供，否则为默认值）
    config.tax_config = params.tax_config.unwrap_or(Pubkey::default());
    
    // 初始化系统状态
    config.panic_mode = false;                    // 未启用恐慌模式
    config.initialized_at = clock.unix_timestamp; // 记录初始化时间
    config.total_minted = 0;                      // 尚未铸造任何代币
    config.total_burned = 0;                      // 尚未销毁任何代币
    config.total_tax_collected = 0;              // 尚未收取任何税收
    config.version = 1;                          // 初始版本为1
    
    // 输出初始化信息（用于调试和审计）
    msg!("TOT Token 初始化完成!");
    msg!("Mint: {}", mint.key());
    msg!("Authority: {}", authority.key());
    msg!("Config: {}", config.key());
    
    Ok(())
}
