//! # TOT Token 主程序模块
//! 
//! 本模块是TaiOneToken (TOT) 的Solana智能合约主程序入口。
//! 实现了基于SPL Token-2022标准的完整代币系统，包括代币铸造、动态税收、
//! 五大池子分配、持有者管理等核心功能。
//! 
//! ## 核心功能模块
//! 
//! 1. **代币初始化**: 创建Token-2022 Mint并配置所有扩展功能
//! 2. **池子管理**: 五大池子的创建、配置和代币分配
//! 3. **动态税收**: 基于持有时间和交易规模的动态税率计算
//! 4. **持有者管理**: 追踪用户持有时间、交易统计、冻结/解冻功能
//! 5. **管理员功能**: 系统暂停、权限管理、紧急操作
//! 
//! ## 使用流程
//! 
//! 1. 调用 `initialize` 初始化代币系统
//! 2. 调用 `init_pool` 为每个池子类型创建账户
//! 3. 调用 `mint_to_pools` 一次性铸造所有代币到池子
//! 4. 用户可以通过 `transfer_with_tax` 进行带税转账
//! 
//! ============================================
// 文件: src/lib.rs
// TOT Token 主程序入口
// ============================================

use anchor_lang::prelude::*;
use solana_program::program_error::ProgramError;
use spl_transfer_hook_interface::instruction::TransferHookInstruction;

// 模块声明
pub mod constants;  // 常量定义模块
pub mod errors;     // 错误定义模块
pub mod state;      // 状态账户模块
pub mod instructions; // 指令实现模块
pub mod utils;      // 工具函数模块

// 精确导入，只导入实际使用的类型，避免通配符导入导致的紧密耦合
use instructions::{
    // 初始化相关
    Initialize,
    // 池子相关
    InitPool,
    MintToPools,
    // 持有者相关
    InitializeHolder,
    FreezeHolder,
    UnfreezeHolder,
    // 税收相关
    InitializeTaxConfig,
    UpdateTaxConfig,
    ManageTaxExempt,
    // 转账相关
    TransferWithTax,
    // 消费相关
    ConsumeToTreasury,
    ConsumeType,
    // 平台转账相关
    PlatformTransfer,
    // 管理员相关
    UpdateAuthority,
    SetPaused,
    EmergencyWithdraw,
    SetTwsTreasury,
    // 查询相关
    CalculateTax,
    GetHolderStats,
    DiscountTier,
    // Transfer Hook相关
    InitializeTransferHook,
    ExecuteTransferHook,
    TransferHookAdminAction,
    // 资产上链相关
    MintAsset,
    // 拍卖相关
    CreateAuction,
    SeizeAuction,
};
use state::{
    // 初始化参数在state模块中定义
    InitializeParams,
    // 池子类型在state模块中定义，lib.rs中直接使用
    PoolType,
};

/// 程序ID声明
/// 这是TOT代币程序的唯一标识符，部署后不可更改
/// 注意：实际部署时需要替换为真实的程序ID
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
    /// 
    /// 这是部署TOT代币的第一步，会创建Token-2022 Mint账户并初始化所有扩展功能。
    /// 
    /// # 功能说明
    /// 
    /// 1. 创建Token-2022 Mint账户（包含所有扩展所需空间）
    /// 2. 初始化Transfer Fee扩展（交易税功能）
    /// 3. 初始化Permanent Delegate扩展（永久代理权，用于强制转移/销毁）
    /// 4. 初始化Metadata Pointer扩展（可更新的元数据）
    /// 5. 初始化Transfer Hook扩展（自定义转账逻辑，可选）
    /// 6. 初始化全局配置账户（存储系统状态）
    /// 
    /// # 参数
    /// * `ctx` - 初始化上下文，包含所有必需的账户
    /// * `params` - 初始化参数
    ///   - `tax_config`: 可选，税率配置账户地址（可后续设置）
    ///   - `liquidity_pool`: 可选，流动性池地址（可后续设置）
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 注意事项
    /// * 此指令只能执行一次，重复调用会失败
    /// * Mint账户必须作为Signer传入（因为需要创建它）
    /// * 需要足够的SOL支付账户创建费用
    /// 
    /// # 使用示例
    /// ```rust
    /// // 在客户端调用
    /// program.methods
    ///     .initialize({
    ///         taxConfig: null,
    ///         liquidityPool: null,
    ///     })
    ///     .accounts({...})
    ///     .rpc();
    /// ```
    pub fn initialize(
        ctx: Context<Initialize>,
        params: InitializeParams,
    ) -> Result<()> {
        instructions::initialize::handler(ctx, params)
    }

    /// 初始化代币池
    /// 
    /// 为指定的池子类型创建PDA账户并配置锁仓和释放参数。
    /// 需要为五大池子分别调用此指令。
    /// 
    /// # 功能说明
    /// 
    /// 1. 创建池子状态账户（PDA）
    /// 2. 创建池子的关联代币账户（ATA）
    /// 3. 根据池子类型设置锁仓时间和释放机制
    /// 
    /// # 参数
    /// * `ctx` - 池子初始化上下文
    /// * `pool_type` - 池子类型枚举
    ///   - `VictoryFund`: 胜利日基金，锁定至2027年1月1日
    ///   - `HistoryLP`: 历史重铸池，立即可用
    ///   - `CyberArmy`: 认知作战池，365天线性释放
    ///   - `GlobalAlliance`: 外资统战池，需要多签控制
    ///   - `AssetAnchor`: 资产锚定池，RWA触发释放
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 注意事项
    /// * 每个池子类型只能初始化一次
    /// * 需要在调用`mint_to_pools`之前完成所有池子的初始化
    /// 
    /// # 使用示例
    /// ```rust
    /// // 初始化胜利日基金池子
    /// program.methods
    ///     .initPool({ victoryFund: {} })
    ///     .accounts({...})
    ///     .rpc();
    /// ```
    pub fn init_pool(
        ctx: Context<InitPool>,
        pool_type: PoolType,
    ) -> Result<()> {
        instructions::init_pool::handler(ctx, pool_type)
    }

    /// 铸造代币到各池子
    /// 
    /// 一次性铸造202.7B代币并按五大池子分配方案分配到各池子。
    /// 这是代币发行的关键步骤，只能执行一次。
    /// 
    /// # 功能说明
    /// 
    /// 1. 验证系统已初始化且尚未铸造
    /// 2. 按以下分配方案铸造代币：
    ///   - 胜利日基金: 20.27B (10%)
    ///   - 历史重铸池: 19.49B (9.6%)
    ///   - 认知作战池: 14.50B (7.15%)
    ///   - 外资统战池: 7.04B (3.47%)
    ///   - 资产锚定池: 141.40B (69.76%)
    /// 3. 更新全局配置中的总铸造量
    /// 
    /// # 参数
    /// * `ctx` - 铸造上下文，必须包含所有五大池子的账户
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 注意事项
    /// * 此指令只能执行一次，重复调用会失败
    /// * 必须在所有池子初始化完成后才能调用
    /// * 需要Mint Authority权限
    /// 
    /// # 使用示例
    /// ```rust
    /// // 铸造所有代币到池子
    /// program.methods
    ///     .mintToPools()
    ///     .accounts({
    ///         authority: deployer,
    ///         config: configPda,
    ///         mint: mintKeypair.publicKey,
    ///         // ... 所有池子账户
    ///     })
    ///     .rpc();
    /// ```
    pub fn mint_to_pools(ctx: Context<MintToPools>) -> Result<()> {
        instructions::mint_to_pools::handler(ctx)
    }

    // ============================================
    // 持有者管理指令
    // ============================================

    /// 初始化持有者信息
    /// 
    /// 当用户首次接收TOT代币时，需要创建持有者信息账户来追踪用户的持有时间、
    /// 交易统计等信息。这些信息用于计算动态税率折扣。
    /// 
    /// # 功能说明
    /// 
    /// 1. 创建持有者信息PDA账户
    /// 2. 初始化持有时间统计（首次持有时间、最后交易时间等）
    /// 3. 初始化交易统计（累计买入、卖出、缴税等）
    /// 
    /// # 参数
    /// * `ctx` - 初始化持有者上下文
    ///   - `payer`: 支付账户创建费用的签名者
    ///   - `holder_wallet`: 持有者的钱包地址
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 注意事项
    /// * 每个钱包地址只能初始化一次持有者信息
    /// * 如果用户已有持有者信息，再次调用会失败
    /// * 持有者信息用于计算持有时间折扣，对税率有重要影响
    /// 
    /// # 使用示例
    /// ```rust
    /// // 用户首次接收代币时自动调用
    /// program.methods
    ///     .initializeHolder()
    ///     .accounts({
    ///         payer: user,
    ///         holderWallet: user.publicKey,
    ///     })
    ///     .rpc();
    /// ```
    pub fn initialize_holder(ctx: Context<InitializeHolder>) -> Result<()> {
        instructions::holder::initialize_holder_handler(ctx)
    }

    /// 冻结持有者账户
    /// 
    /// 管理员可以使用此功能冻结违规账户（如洗钱、恶意做空等）。
    /// 被冻结的账户无法进行转账操作。
    /// 
    /// # 功能说明
    /// 
    /// 1. 验证调用者是否为管理员
    /// 2. 设置持有者账户的冻结状态
    /// 3. 记录冻结原因代码
    /// 4. 发出冻结事件
    /// 
    /// # 参数
    /// * `ctx` - 冻结操作上下文
    /// * `reason_code` - 冻结原因代码（u8类型）
    ///   - 0: 未定义
    ///   - 1: 洗钱嫌疑
    ///   - 2: 恶意做空
    ///   - 3: 违规交易
    ///   - 其他: 自定义原因
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 注意事项
    /// * 只有管理员可以执行此操作
    /// * 冻结后的账户无法转账，但可以接收代币
    /// * 冻结操作会发出链上事件，便于审计
    /// 
    /// # 使用示例
    /// ```rust
    /// // 管理员冻结违规账户
    /// program.methods
    ///     .freezeHolder(1) // 原因代码：洗钱嫌疑
    ///     .accounts({
    ///         authority: admin,
    ///         holderInfo: holderPda,
    ///         config: configPda,
    ///     })
    ///     .rpc();
    /// ```
    pub fn freeze_holder(
        ctx: Context<FreezeHolder>,
        reason_code: u8,
    ) -> Result<()> {
        instructions::holder::freeze_holder_handler(ctx, reason_code)
    }

    /// 解冻持有者账户
    /// 
    /// 管理员可以解冻之前被冻结的账户，恢复其转账功能。
    /// 
    /// # 功能说明
    /// 
    /// 1. 验证调用者是否为管理员
    /// 2. 验证账户确实处于冻结状态
    /// 3. 清除冻结状态和原因
    /// 4. 发出解冻事件
    /// 
    /// # 参数
    /// * `ctx` - 解冻操作上下文
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 注意事项
    /// * 只有管理员可以执行此操作
    /// * 只能解冻已冻结的账户
    /// * 解冻后账户立即恢复所有功能
    /// 
    /// # 使用示例
    /// ```rust
    /// // 管理员解冻账户
    /// program.methods
    ///     .unfreezeHolder()
    ///     .accounts({
    ///         authority: admin,
    ///         holderInfo: holderPda,
    ///         config: configPda,
    ///     })
    ///     .rpc();
    /// ```
    pub fn unfreeze_holder(ctx: Context<UnfreezeHolder>) -> Result<()> {
        instructions::holder::unfreeze_holder_handler(ctx)
    }

    // ============================================
    // 税率管理指令
    // ============================================

    /// 初始化税率配置
    /// 
    /// 创建税率配置账户并设置默认的动态税率参数。
    /// 这是配置动态税收系统的第一步。
    /// 
    /// # 功能说明
    /// 
    /// 1. 创建税率配置PDA账户
    /// 2. 设置默认税率参数：
    ///   - 基础税率: 2% (200 basis points)
    ///   - 惩罚系数α: 5 (用于大额交易惩罚)
    ///   - 时间衰减指数β: 0.5 (用于持有时间折扣)
    ///   - 忠诚度权重γ: 20% (用于持有时间奖励)
    ///   - 恐慌阈值: 0.5% (触发恐慌模式的池子深度比例)
    ///   - 恐慌税率: 30% (恐慌模式下的税率)
    /// 
    /// # 参数
    /// * `ctx` - 初始化税率配置上下文
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 注意事项
    /// * 只能初始化一次
    /// * 初始化后可以通过`update_tax_config`调整参数
    /// * 税率配置影响所有转账的税收计算
    /// 
    /// # 使用示例
    /// ```rust
    /// // 初始化税率配置
    /// program.methods
    ///     .initializeTaxConfig()
    ///     .accounts({
    ///         authority: admin,
    ///         config: configPda,
    ///         taxConfig: taxConfigPda,
    ///     })
    ///     .rpc();
    /// ```
    pub fn initialize_tax_config(ctx: Context<InitializeTaxConfig>) -> Result<()> {
        instructions::tax::initialize_tax_config_handler(ctx)
    }

    /// 更新税率配置
    /// 
    /// 管理员可以动态调整税率参数，以适应市场变化或特殊需求。
    /// 所有参数都是可选的，只更新提供的参数。
    /// 
    /// # 功能说明
    /// 
    /// 根据提供的参数更新税率配置：
    /// - `base_tax_bps`: 基础税率（basis points，10000 = 100%）
    /// - `alpha`: 惩罚系数（放大100倍存储，500 = 5.0）
    /// - `beta`: 时间衰减指数（放大100倍存储，50 = 0.5）
    /// - `gamma_bps`: 忠诚度权重（basis points）
    /// - `panic_threshold_bps`: 恐慌模式触发阈值（basis points）
    /// - `panic_tax_bps`: 恐慌模式税率（basis points）
    /// 
    /// # 参数
    /// * `ctx` - 更新税率配置上下文
    /// * `base_tax_bps` - 可选，新的基础税率（basis points，最大9900 = 99%）
    /// * `alpha` - 可选，新的惩罚系数（放大100倍，如500表示5.0）
    /// * `beta` - 可选，新的时间衰减指数（放大100倍，如50表示0.5）
    /// * `gamma_bps` - 可选，新的忠诚度权重（basis points）
    /// * `panic_threshold_bps` - 可选，新的恐慌阈值（basis points）
    /// * `panic_tax_bps` - 可选，新的恐慌税率（basis points）
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 注意事项
    /// * 只有管理员可以执行此操作
    /// * 税率调整会立即生效，影响所有后续转账
    /// * 建议在调整前充分测试，避免影响用户体验
    /// * 所有参数都会进行范围验证
    /// 
    /// # 使用示例
    /// ```rust
    /// // 只更新基础税率
    /// program.methods
    ///     .updateTaxConfig(
    ///         Some(300), // 基础税率改为3%
    ///         None, None, None, None, None
    ///     )
    ///     .accounts({...})
    ///     .rpc();
    /// ```
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
    /// 
    /// 将指定地址添加到免税列表，该地址的所有转账将不收取税收。
    /// 通常用于流动性池、DEX合约等系统地址。
    /// 
    /// # 功能说明
    /// 
    /// 1. 验证地址是否已在免税列表中
    /// 2. 检查免税列表是否已满（最多50个地址）
    /// 3. 将地址添加到免税列表
    /// 4. 发出免税地址添加事件
    /// 
    /// # 参数
    /// * `ctx` - 管理免税地址上下文
    /// * `address` - 要添加的免税地址（Pubkey）
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 注意事项
    /// * 只有管理员可以执行此操作
    /// * 免税列表最多支持50个地址
    /// * 如果地址已在列表中，会返回错误
    /// * 免税地址的转账不会触发税收计算
    /// 
    /// # 使用示例
    /// ```rust
    /// // 添加流动性池地址到免税列表
    /// program.methods
    ///     .addTaxExempt(liquidityPoolAddress)
    ///     .accounts({...})
    ///     .rpc();
    /// ```
    pub fn add_tax_exempt(
        ctx: Context<ManageTaxExempt>,
        address: Pubkey,
    ) -> Result<()> {
        instructions::tax::add_tax_exempt_handler(ctx, address)
    }

    /// 移除免税地址
    /// 
    /// 从免税列表中移除指定地址，该地址的后续转账将正常收取税收。
    /// 
    /// # 功能说明
    /// 
    /// 1. 验证地址是否在免税列表中
    /// 2. 从列表中移除该地址
    /// 3. 发出免税地址移除事件
    /// 
    /// # 参数
    /// * `ctx` - 管理免税地址上下文
    /// * `address` - 要移除的免税地址（Pubkey）
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 注意事项
    /// * 只有管理员可以执行此操作
    /// * 如果地址不在列表中，会返回错误
    /// * 移除后该地址的转账将立即开始收取税收
    /// 
    /// # 使用示例
    /// ```rust
    /// // 移除某个地址的免税资格
    /// program.methods
    ///     .removeTaxExempt(targetAddress)
    ///     .accounts({...})
    ///     .rpc();
    /// ```
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
    /// 
    /// 执行TOT代币转账并自动计算和收取动态税收。这是TOT代币系统的核心功能，
    /// 实现了"宽进严出"的资金单向阀机制。
    /// 
    /// # 功能说明
    /// 
    /// 1. 验证转账合法性（系统状态、账户冻结状态、金额等）
    /// 2. 检查是否为免税地址
    /// 3. 计算动态税率（基于持有时间、交易规模等）
    /// 4. 执行转账（扣除税收后的净金额）
    /// 5. 分配税收：
    ///   - 40% 销毁（通缩机制）
    ///   - 30% 注入流动性池（提升底价）
    ///   - 20% 社区奖励
    ///   - 10% 营销费用
    /// 6. 更新持有者统计信息
    /// 
    /// # 动态税率计算
    /// 
    /// 税率公式: `Tax = Base + (P_impact / L) × α + 1/(T_hold + 1)^β × γ`
    /// 
    /// - `Base`: 基础税率（默认2%）
    /// - `P_impact / L × α`: 大额交易惩罚（交易规模越大，税率越高）
    /// - `1/(T_hold + 1)^β × γ`: 持有时间折扣（持有时间越长，税率越低）
    /// 
    /// # 参数
    /// * `ctx` - 转账上下文，包含发送者、接收者、配置等账户
    /// * `amount` - 转账金额（原始金额，未扣除税收）
    /// * `is_sell` - 是否为卖出操作
    ///   - `true`: 卖出操作，会计算大额交易惩罚
    ///   - `false`: 普通转账，不计算大额交易惩罚
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 注意事项
    /// * 发送者账户不能处于冻结状态
    /// * 系统处于恐慌模式时，卖出操作会被拒绝
    /// * 税收会立即分配，不会累积
    /// * 免税地址（如流动性池）的转账不收取税收
    /// * 持有时间越长，税率折扣越大（最高75%折扣）
    /// 
    /// # 使用示例
    /// ```rust
    /// // 执行带税转账
    /// program.methods
    ///     .transferWithTax(
    ///         new anchor.BN(1000000), // 转账100万代币
    ///         true // 是卖出操作
    ///     )
    ///     .accounts({
    ///         sender: user,
    ///         senderTokenAccount: userTokenAccount,
    ///         receiverTokenAccount: receiverTokenAccount,
    ///         // ... 其他账户
    ///     })
    ///     .rpc();
    /// ```
    pub fn transfer_with_tax(
        ctx: Context<TransferWithTax>,
        amount: u64,
        is_sell: bool,
    ) -> Result<()> {
        instructions::transfer::transfer_with_tax_handler(ctx, amount, is_sell)
    }

    /// 用户向TWS财库消费（免税）
    /// 
    /// 用户向TWS官方财库转账，不收取任何税收。用于地图功能操作、
    /// 祖籍标记等消费场景。
    /// 
    /// # 功能说明
    /// 
    /// 1. 验证转账合法性（系统状态、账户冻结状态、金额等）
    /// 2. 验证接收者是否为配置的TWS财库地址
    /// 3. 执行全额转账（无税收）
    /// 4. 更新用户消费统计
    /// 5. 发出消费事件
    /// 
    /// # 参数
    /// * `ctx` - 消费转账上下文，包含用户、财库、配置等账户
    /// * `amount` - 消费金额（全额转账，无税收）
    /// * `consume_type` - 消费类型
    ///   - `MapAction`: 地图功能操作（修缮妈祖庙、放飞孔明灯、祭拜祖先等）
    ///   - `AncestorMarking`: 祖籍标记
    ///   - `Other`: 其他消费
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 注意事项
    /// * 用户账户不能处于冻结状态
    /// * TWS财库地址必须已配置（不能是占位符）
    /// * 消费不收取税收，全额转账给TWS财库
    /// * 消费会更新用户的消费统计
    /// 
    /// # 使用示例
    /// ```rust
    /// // 执行消费转账
    /// program.methods
    ///     .consumeToTreasury(
    ///         new anchor.BN(100000000), // 消费100个代币
    ///         { mapAction: {} } // 地图操作
    ///     )
    ///     .accounts({...})
    ///     .rpc();
    /// ```
    pub fn consume_to_treasury(
        ctx: Context<ConsumeToTreasury>,
        amount: u64,
        consume_type: ConsumeType,
    ) -> Result<()> {
        instructions::consume::consume_to_treasury_handler(ctx, amount, consume_type)
    }

    /// 平台向用户转账（免税）
    /// 
    /// 平台钱包向用户转账，不收取任何税收。用于TOT购买订单完成后的转账等场景。
    /// 
    /// # 功能说明
    /// 
    /// 1. 验证权限（只有系统管理员可以执行）
    /// 2. 验证转账合法性（账户冻结状态、金额等）
    /// 3. 执行全额转账（无税收）
    /// 4. 更新用户买入统计（如果是首次接收，初始化持有时间）
    /// 5. 发出转账事件
    /// 
    /// # 参数
    /// * `ctx` - 平台转账上下文，包含平台、用户、配置等账户
    /// * `amount` - 转账金额（全额转账，无税收）
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 注意事项
    /// * 只有系统管理员（config.authority）可以执行此操作
    /// * 用户账户不能处于冻结状态
    /// * 转账不收取税收，全额转账给用户
    /// * 会更新用户的买入统计和首次持有时间
    /// 
    /// # 使用示例
    /// ```rust
    /// // 执行平台转账
    /// program.methods
    ///     .platformTransfer(
    ///         new anchor.BN(1000000000) // 转账1000个代币
    ///     )
    ///     .accounts({...})
    ///     .rpc();
    /// ```
    pub fn platform_transfer(
        ctx: Context<PlatformTransfer>,
        amount: u64,
    ) -> Result<()> {
        instructions::platform_transfer::platform_transfer_handler(ctx, amount)
    }

    // ============================================
    // 管理员功能
    // ============================================

    /// 更新管理员
    /// 
    /// 将系统管理员权限转移给新的地址。这是重要的安全操作，用于多签钱包
    /// 升级或权限移交。
    /// 
    /// # 功能说明
    /// 
    /// 1. 验证当前调用者是否为管理员
    /// 2. 验证新管理员地址的有效性（不能为空地址）
    /// 3. 更新全局配置中的管理员地址
    /// 4. 发出权限更新事件
    /// 
    /// # 参数
    /// * `ctx` - 更新权限上下文
    /// * `new_authority` - 新的管理员地址（Pubkey）
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 注意事项
    /// * 只有当前管理员可以执行此操作
    /// * 新管理员地址不能为空地址（Pubkey::default()）
    /// * 权限转移后，旧管理员将失去所有管理权限
    /// * 建议转移到多签钱包以提高安全性
    /// * 此操作会发出链上事件，便于审计
    /// 
    /// # 使用示例
    /// ```rust
    /// // 将管理员权限转移到多签钱包
    /// program.methods
    ///     .updateAuthority(multisigWallet)
    ///     .accounts({
    ///         authority: currentAdmin,
    ///         config: configPda,
    ///     })
    ///     .rpc();
    /// ```
    pub fn update_authority(
        ctx: Context<UpdateAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        instructions::admin::update_authority_handler(ctx, new_authority)
    }

    /// 暂停/恢复系统
    /// 
    /// 管理员可以暂停或恢复整个系统。暂停后，所有卖出操作将被拒绝，
    /// 但买入和普通转账仍可进行（取决于具体实现）。
    /// 
    /// # 功能说明
    /// 
    /// 1. 验证调用者是否为管理员
    /// 2. 更新系统的暂停状态（panic_mode字段）
    /// 3. 发出系统状态变更事件
    /// 
    /// # 参数
    /// * `ctx` - 设置暂停状态上下文
    /// * `paused` - 暂停状态
    ///   - `true`: 暂停系统（启用恐慌模式）
    ///   - `false`: 恢复系统（关闭恐慌模式）
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 注意事项
    /// * 只有管理员可以执行此操作
    /// * 暂停状态下，卖出操作会被拒绝
    /// * 暂停状态用于应对市场异常或安全威胁
    /// * 建议在暂停前通知社区
    /// 
    /// # 使用示例
    /// ```rust
    /// // 暂停系统（启用恐慌模式）
    /// program.methods
    ///     .setPaused(true)
    ///     .accounts({
    ///         authority: admin,
    ///         config: configPda,
    ///     })
    ///     .rpc();
    /// ```
    pub fn set_paused(
        ctx: Context<SetPaused>,
        paused: bool,
    ) -> Result<()> {
        instructions::admin::set_paused_handler(ctx, paused)
    }

    /// 紧急提取（仅限紧急情况）
    /// 
    /// 在系统处于暂停状态时，管理员可以从指定池子提取代币。
    /// 这是最后的安全措施，仅在极端情况下使用。
    /// 
    /// # 功能说明
    /// 
    /// 1. 验证系统处于暂停状态
    /// 2. 验证调用者是否为管理员
    /// 3. 从源账户转移指定数量的代币到目标账户
    /// 4. 发出紧急提取事件
    /// 
    /// # 参数
    /// * `ctx` - 紧急提取上下文
    /// * `amount` - 提取的代币数量
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 注意事项
    /// * 只有管理员可以执行此操作
    /// * 系统必须处于暂停状态才能执行
    /// * 此操作会发出链上事件，便于审计
    /// * 建议仅在真正的紧急情况下使用
    /// * 提取的代币应妥善保管，后续可能需要归还
    /// 
    /// # 使用示例
    /// ```rust
    /// // 紧急情况下从池子提取代币
    /// program.methods
    ///     .emergencyWithdraw(new anchor.BN(1000000))
    ///     .accounts({
    ///         authority: admin,
    ///         config: configPda,
    ///         sourceAccount: poolTokenAccount,
    ///         destinationAccount: safeWallet,
    ///         // ... 其他账户
    ///     })
    ///     .rpc();
    /// ```
    pub fn emergency_withdraw(
        ctx: Context<EmergencyWithdraw>,
        amount: u64,
    ) -> Result<()> {
        instructions::admin::emergency_withdraw_handler(ctx, amount)
    }

    /// 设置TWS财库地址
    /// 
    /// 管理员可以设置TWS官方财库地址，用于接收用户消费。
    /// 用户向此地址转账时，不收取税收（免税消费）。
    /// 
    /// # 功能说明
    /// 
    /// 1. 验证调用者是否为系统管理员
    /// 2. 验证新财库地址的有效性（不能为空地址）
    /// 3. 更新全局配置中的TWS财库地址
    /// 4. 发出财库地址更新事件
    /// 
    /// # 参数
    /// * `ctx` - 设置财库地址上下文
    /// * `tws_treasury` - TWS财库地址（Pubkey）
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 注意事项
    /// * 只有系统管理员可以执行此操作
    /// * 财库地址不能为空地址（Pubkey::default()）
    /// * 设置后，用户向此地址的转账将不收取税收
    /// * 此操作会发出链上事件，便于审计
    /// 
    /// # 使用示例
    /// ```rust
    /// // 设置TWS财库地址
    /// program.methods
    ///     .setTwsTreasury(twsTreasuryAddress)
    ///     .accounts({...})
    ///     .rpc();
    /// ```
    pub fn set_tws_treasury(
        ctx: Context<SetTwsTreasury>,
        tws_treasury: Pubkey,
    ) -> Result<()> {
        instructions::admin::set_tws_treasury_handler(ctx, tws_treasury)
    }

    /// 资产上链
    /// 
    /// 资产审核通过后，将资产信息上链到Solana。
    /// 创建资产账户并存储资产元数据、位置、价值等信息。
    /// 
    /// # 功能说明
    /// 
    /// 1. 验证调用者是否为系统管理员
    /// 2. 验证资产ID、类型、位置、价值等参数的有效性
    /// 3. 创建资产账户（PDA）
    /// 4. 存储资产信息到链上
    /// 5. 发出资产上链事件
    /// 
    /// # 参数
    /// * `ctx` - 资产上链上下文
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
    /// * 只有系统管理员可以执行此操作
    /// * 资产ID必须唯一，重复上链会失败
    /// * 位置信息需要验证坐标范围
    /// * 元数据URI需要验证格式
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
    pub fn mint_asset(
        ctx: Context<MintAsset>,
        asset_id: String,
        asset_type: u8,
        owner: Pubkey,
        location: crate::state::AssetLocation,
        value: u64,
        metadata_uri: Option<String>,
    ) -> Result<()> {
        instructions::asset_mint::mint_asset_handler(
            ctx,
            asset_id,
            asset_type,
            owner,
            location,
            value,
            metadata_uri,
        )
    }

    /// 创建拍卖
    /// 
    /// 创建新的拍卖，将拍卖信息上链到Solana。
    /// 创建拍卖账户并存储拍卖元数据、价格、留言等信息。
    /// 
    /// # 功能说明
    /// 
    /// 1. 验证调用者权限（任何人都可以创建）
    /// 2. 验证资产ID、价格、留言等参数的有效性
    /// 3. 创建拍卖账户（PDA）
    /// 4. 存储拍卖信息到链上
    /// 5. 发出拍卖创建事件
    /// 
    /// # 参数
    /// * `ctx` - 拍卖创建上下文
    /// * `asset_id` - 资产唯一ID（字符串）
    /// * `start_price` - 起拍价（TOT代币，基础单位）
    /// * `taunt_message` - 嘲讽留言（字符串，最大100字符）
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 注意事项
    /// * 任何人都可以创建拍卖
    /// * 资产ID必须唯一，重复创建会失败
    /// * 起拍价必须大于0
    /// * 留言长度不能超过100字符
    pub fn create_auction(
        ctx: Context<CreateAuction>,
        asset_id: String,
        start_price: u64,
        taunt_message: String,
    ) -> Result<()> {
        instructions::auction_create::create_auction_handler(
            ctx,
            asset_id,
            start_price,
            taunt_message,
        )
    }

    /// 夺取拍卖资产
    /// 
    /// 用户支付当前价格+10%来夺取拍卖资产。
    /// 其中5%给财库，95%给上一任房主，都是免税的。
    /// 
    /// # 功能说明
    /// 
    /// 1. 验证当前价格和最低出价（当前价格+10%）
    /// 2. 计算分账：5%给财库，95%给上一任房主
    /// 3. 执行转账：从新所有者转出，分别转给财库和上一任房主
    /// 4. 更新拍卖状态（新所有者、新价格）
    /// 5. 发出拍卖夺取事件
    /// 
    /// # 参数
    /// * `ctx` - 拍卖夺取上下文
    /// * `bid_message` - 出价留言（字符串，最大100字符）
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 注意事项
    /// * 新所有者必须支付当前价格+10%
    /// * 5%给财库（免税，因为是向TWS官方消费）
    /// * 95%给上一任房主（免税，因为是平台资产转移）
    /// * 会更新新所有者的消费统计
    pub fn seize_auction(
        ctx: Context<SeizeAuction>,
        bid_message: String,
    ) -> Result<()> {
        instructions::auction_seize::seize_auction_handler(ctx, bid_message)
    }

    // ============================================
    // 查询功能
    // ============================================

    /// 计算税率（只读查询）
    /// 
    /// 这是一个只读查询函数，用于计算指定转账的预估税率，不执行实际转账。
    /// 主要用于前端显示，让用户在转账前了解需要支付的税收。
    /// 
    /// # 功能说明
    /// 
    /// 1. 根据转账金额和类型计算基础税率
    /// 2. 根据持有者信息计算持有时间折扣
    /// 3. 如果是卖出操作，计算大额交易附加税
    /// 4. 返回完整的税率计算结果
    /// 
    /// # 参数
    /// * `ctx` - 查询上下文，包含配置、税率配置、Mint等账户
    /// * `amount` - 查询的转账金额
    /// * `is_buy` - 是否为买入操作（当前版本买入不收取税收）
    /// * `is_sell` - 是否为卖出操作（会计算大额交易惩罚）
    /// 
    /// # 返回值
    /// * `Result<TaxCalculationResult>` - 税率计算结果，包含：
    ///   - `base_tax_bps`: 基础税率（basis points）
    ///   - `holding_discount_bps`: 持有时间折扣（basis points）
    ///   - `whale_tax_bps`: 大额交易附加税（basis points）
    ///   - `final_tax_bps`: 最终税率（basis points）
    ///   - `tax_amount`: 税额（代币数量）
    ///   - `net_amount`: 净转账金额（扣除税收后）
    /// 
    /// # 注意事项
    /// * 这是一个只读查询，不会修改链上状态
    /// * 任何人都可以调用此函数
    /// * 如果持有者信息不存在，将按新用户计算（无折扣）
    /// * 计算结果仅供参考，实际转账时的税率可能因市场状态而略有不同
    /// 
    /// # 使用示例
    /// ```rust
    /// // 查询卖出100万代币的税率
    /// const result = await program.methods
    ///     .calculateTax(
    ///         new anchor.BN(1000000),
    ///         false, // 不是买入
    ///         true   // 是卖出
    ///     )
    ///     .accounts({...})
    ///     .view();
    /// 
    /// console.log(`税率: ${result.finalTaxBps / 100}%`);
    /// console.log(`税额: ${result.taxAmount}`);
    /// console.log(`净额: ${result.netAmount}`);
    /// ```
    pub fn calculate_tax(
        ctx: Context<CalculateTax>,
        amount: u64,
        is_buy: bool,
        is_sell: bool,
    ) -> Result<TaxCalculationResult> {
        instructions::query::calculate_tax_handler(ctx, amount, is_buy, is_sell)
    }

    /// 获取持有者统计
    /// 
    /// 查询指定持有者的详细统计信息，包括持有时间、交易历史、税率折扣等级等。
    /// 用于前端展示用户的持有情况和享受的优惠。
    /// 
    /// # 功能说明
    /// 
    /// 1. 从链上读取持有者信息账户
    /// 2. 计算持有天数（从首次持有时间到当前时间）
    /// 3. 确定税率折扣等级（Bronze/Silver/Gold/Diamond）
    /// 4. 返回完整的统计信息
    /// 
    /// # 参数
    /// * `ctx` - 查询上下文，包含持有者信息账户
    /// 
    /// # 返回值
    /// * `Result<HolderStats>` - 持有者统计信息，包含：
    ///   - `owner`: 持有者钱包地址
    ///   - `holding_days`: 持有天数
    ///   - `total_bought`: 累计买入量
    ///   - `total_sold`: 累计卖出量
    ///   - `total_tax_paid`: 累计缴税总额
    ///   - `is_frozen`: 是否被冻结
    ///   - `tax_discount_tier`: 税率折扣等级（字符串描述）
    /// 
    /// # 注意事项
    /// * 这是一个只读查询，不会修改链上状态
    /// * 任何人都可以查询任何持有者的统计信息
    /// * 如果持有者账户不存在，会返回错误
    /// * 持有天数基于首次持有时间计算
    /// 
    /// # 使用示例
    /// ```rust
    /// // 查询用户的持有统计
    /// const stats = await program.methods
    ///     .getHolderStats()
    ///     .accounts({
    ///         holderInfo: holderPda,
    ///     })
    ///     .view();
    /// 
    /// console.log(`持有天数: ${stats.holdingDays}`);
    /// console.log(`折扣等级: ${stats.taxDiscountTier}`);
    /// ```
    pub fn get_holder_stats(ctx: Context<GetHolderStats>) -> Result<HolderStats> {
        instructions::query::get_holder_stats_handler(ctx)
    }

    // ============================================
    // Transfer Hook 指令
    // ============================================
    
    /// 初始化Transfer Hook配置
    /// 
    /// 创建Transfer Hook配置账户，设置TOT Mint地址和配置地址。
    /// 这是部署Transfer Hook程序后的第一步。
    /// 
    /// # 功能说明
    /// 
    /// 1. 创建Transfer Hook配置PDA账户
    /// 2. 设置管理员权限
    /// 3. 关联TOT Mint和配置账户
    /// 4. 初始化统计信息
    /// 
    /// # 参数
    /// * `ctx` - 初始化上下文
    /// * `tot_mint` - TOT代币的Mint地址
    /// * `tot_config` - TOT全局配置账户地址
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())
    pub fn initialize_transfer_hook(
        ctx: Context<InitializeTransferHook>,
        tot_mint: Pubkey,
        tot_config: Pubkey,
    ) -> Result<()> {
        instructions::hook::initialize_transfer_hook(ctx, tot_mint, tot_config)
    }

    /// Transfer Hook执行入口
    /// 
    /// 这是Token-2022在每次转账时调用的核心函数。
    /// 必须符合spl-transfer-hook-interface规范。
    /// 
    /// # 功能说明
    /// 
    /// 1. 检查Hook是否暂停
    /// 2. 验证Mint地址（确保是TOT代币）
    /// 3. 更新统计信息
    /// 4. 执行其他自定义逻辑（可扩展）
    /// 
    /// # 参数
    /// * `ctx` - Transfer Hook执行上下文（由Token-2022程序自动传递）
    /// * `amount` - 转账金额
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败会导致转账回滚
    /// 
    /// # 注意事项
    /// - 此函数由Token-2022程序调用，不是用户直接调用
    /// - 执行失败会导致整个转账失败
    /// - 应该尽量轻量，避免高gas消耗
    /// - 账户由Token-2022程序自动传递和验证
    /// Transfer Hook执行入口（内部实现）
    /// 
    /// 这是execute函数的内部实现，由execute函数调用。
    /// execute_internal包含实际的执行逻辑，execute函数是符合spl-transfer-hook-interface规范的入口。
    pub fn execute_internal(ctx: Context<ExecuteTransferHook>, amount: u64) -> Result<()> {
        instructions::hook::execute_internal(ctx, amount)
    }
    
    /// Transfer Hook执行入口（符合spl-transfer-hook-interface规范）
    /// 
    /// 这是Token-2022在每次转账时调用的核心函数。
    /// 函数名必须为`execute`以符合spl-transfer-hook-interface规范。
    /// 
    /// # 功能说明
    /// 
    /// 1. 检查Hook是否暂停
    /// 2. 验证Mint地址（确保是TOT代币）
    /// 3. 更新统计信息
    /// 4. 执行其他自定义逻辑（可扩展）
    /// 
    /// # 参数
    /// * `ctx` - Transfer Hook执行上下文（由Token-2022程序自动传递）
    /// * `amount` - 转账金额
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败会导致转账回滚
    /// 
    /// # 注意事项
    /// - 此函数由Token-2022程序调用，不是用户直接调用
    /// - 执行失败会导致整个转账失败
    /// - 应该尽量轻量，避免高gas消耗
    /// - 账户由Token-2022程序自动传递和验证
    /// - 函数名`execute`符合spl-transfer-hook-interface规范
    /// - 在Anchor 0.29.0中，discriminator可能不匹配，需要使用fallback函数
    pub fn execute(ctx: Context<ExecuteTransferHook>, amount: u64) -> Result<()> {
        // 直接调用execute_internal的实现
        instructions::hook::execute_internal(ctx, amount)
    }

    /// 暂停/恢复Transfer Hook
    /// 
    /// 管理员可以暂停或恢复Transfer Hook的执行。
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
        instructions::hook::set_transfer_hook_paused(ctx, paused)
    }
}

/// 税率计算结果（用于返回给客户端）
/// 
/// 包含完整的税率计算信息，用于前端显示和用户决策。
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TaxCalculationResult {
    /// 基础税率（basis points，10000 = 100%）
    /// 这是不考虑任何折扣和惩罚的基础税率
    pub base_tax_bps: u16,
    
    /// 持有时间折扣（basis points）
    /// 根据持有时间计算的折扣金额，会从基础税率中扣除
    pub holding_discount_bps: u16,
    
    /// 大额交易附加税（basis points）
    /// 仅对卖出操作，当交易规模超过阈值时收取的附加税
    pub whale_tax_bps: u16,
    
    /// 最终税率（basis points）
    /// 综合考虑基础税率、折扣和附加税后的最终税率
    pub final_tax_bps: u16,
    
    /// 税额（代币数量）
    /// 根据最终税率计算出的实际税额
    pub tax_amount: u64,
    
    /// 净转账金额（代币数量）
    /// 扣除税收后，接收者实际收到的代币数量
    pub net_amount: u64,
}

/// 持有者统计结果
/// 
/// 包含持有者的完整统计信息，用于展示用户的持有历史和享受的优惠。
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct HolderStats {
    /// 持有者钱包地址
    pub owner: Pubkey,
    
    /// 持有天数
    /// 从首次持有时间到当前时间的天数
    pub holding_days: u64,
    
    /// 累计买入量
    /// 用户累计买入的TOT代币总数
    pub total_bought: u64,
    
    /// 累计卖出量
    /// 用户累计卖出的TOT代币总数
    pub total_sold: u64,
    
    /// 累计缴税总额
    /// 用户累计支付的所有税收总和
    pub total_tax_paid: u64,
    
    /// 是否被冻结
    /// `true`表示账户被管理员冻结，无法转账
    pub is_frozen: bool,
    
    /// 税率折扣等级
    /// 枚举类型，客户端可以根据枚举值转换为字符串显示
    /// - None: 无折扣
    /// - Bronze: 10%折扣 (30-90天)
    /// - Silver: 25%折扣 (90-180天)
    /// - Gold: 50%折扣 (180-365天)
    /// - Diamond: 75%折扣 (365+天)
    pub tax_discount_tier: crate::instructions::query::DiscountTier,
}

/// Fallback函数
/// 
/// 处理spl-transfer-hook-interface的execute指令。
/// 由于Anchor 0.29.0不支持#[interface]属性，需要使用fallback函数
/// 来匹配spl-transfer-hook-interface定义的discriminator。
/// 
/// # 工作原理
/// 
/// 1. Token-2022程序调用transfer hook时，使用spl-transfer-hook-interface的discriminator
/// 2. Anchor默认的指令路由无法识别这个discriminator
/// 3. Fallback函数捕获所有未匹配的指令
/// 4. 检查discriminator是否匹配execute指令
/// 5. 如果匹配，解析参数并调用execute函数（内部调用execute_internal）
/// 
/// # Discriminator
/// 
/// execute指令的discriminator是SHA-256("spl-transfer-hook-interface:execute")的前8字节
/// 值: [105, 37, 101, 197, 75, 251, 102, 26] (小端序)
/// 
/// # 注意事项
/// 
/// - Fallback函数需要手动解析账户，不能使用Anchor的自动账户验证
/// - execute函数已添加，符合spl-transfer-hook-interface规范
/// - Token-2022应该能够直接调用execute函数（推荐方式）
/// - 如果discriminator不匹配，fallback函数会尝试处理（但受技术限制）
/// - 如果升级到Anchor 0.30.0+，可以使用#[interface]属性替代fallback函数
#[fallback]
pub fn fallback(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> Result<()> {
    // 尝试解析为TransferHookInstruction
    match TransferHookInstruction::unpack(instruction_data) {
        Ok(TransferHookInstruction::Execute { amount }) => {
            // 注意：fallback函数无法直接使用Anchor的Context和账户验证机制
            // 因此无法在这里直接调用execute函数
            // 
            // 实际工作流程：
            // 1. Token-2022调用transfer hook时，会尝试匹配execute函数的discriminator
            // 2. 如果discriminator匹配，直接调用execute函数（推荐方式，已实现）
            // 3. 如果discriminator不匹配，fallback函数会捕获（当前情况）
            // 4. 由于fallback的限制，无法在fallback中直接使用Anchor的账户验证
            // 
            // 解决方案：
            // - execute函数已添加，Token-2022应该能够通过Anchor的标准路由调用
            // - 如果discriminator不匹配，可能需要：
            //   a) 手动调整discriminator（不推荐）
            //   b) 升级到Anchor 0.30.0+使用#[interface]属性（推荐）
            // 
            // 当前实现：fallback函数作为备用路由，但受技术限制无法完全工作
            // 主要依赖execute函数被Token-2022正确调用
            return Err(anchor_lang::error!(crate::errors::TotError::TransferHookFailed));
        }
        Ok(_) => {
            // 其他TransferHookInstruction变体（如果有）
            return Err(ProgramError::InvalidInstructionData.into());
        }
        Err(_) => {
            // 无法解析为TransferHookInstruction，可能是其他指令
            // 返回未识别的指令错误，让调用者知道这不是一个有效的指令
            return Err(ProgramError::InvalidInstructionData.into());
        }
    }
}

/// 注意：关于Transfer Hook实现的说明
/// 
/// 在Anchor 0.29.0中实现spl-transfer-hook-interface的execute指令有两种方式：
/// 
/// 方式1（当前实现）：
/// - 添加execute函数，使用Anchor的标准discriminator
/// - Token-2022可能无法直接匹配discriminator，但可以通过其他方式调用
/// - 添加fallback函数作为备用路由（但受限于无法使用Anchor的账户验证）
/// 
/// 方式2（推荐，需要升级）：
/// - 升级到Anchor 0.30.0+
/// - 使用#[interface(spl_transfer_hook_interface::execute)]属性
/// - 自动匹配spl-transfer-hook-interface的discriminator
/// - 无需fallback函数
/// 
/// 当前实现说明：
/// - execute函数已添加，符合spl-transfer-hook-interface规范
/// - fallback函数已添加，但受技术限制无法完全工作
/// - 建议测试execute函数是否能被Token-2022正确调用
/// - 如果discriminator不匹配，考虑升级到Anchor 0.30.0+
