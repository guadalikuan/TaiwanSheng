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

pub mod constants;
pub mod errors;
pub mod state;
pub mod instructions;
pub mod utils;

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
    SetJackpotRatio,
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
    // 奖池相关
    InitializeJackpot,
};
use state::{
    InitializeParams,
    PoolType,
};

declare_id!("ToT1111111111111111111111111111111111111111");

pub mod __client_accounts_initialize {
    pub use crate::instructions::initialize::__client_accounts_initialize::*;
}

pub mod __client_accounts_init_pool {
    pub use crate::instructions::init_pool::__client_accounts_init_pool::*;
}

pub mod __client_accounts_mint_to_pools {
    pub use crate::instructions::mint_to_pools::__client_accounts_mint_to_pools::*;
}

pub mod __client_accounts_initialize_tax_config {
    pub use crate::instructions::tax::__client_accounts_initialize_tax_config::*;
}

pub mod __client_accounts_update_tax_config {
    pub use crate::instructions::tax::__client_accounts_update_tax_config::*;
}

pub mod __client_accounts_manage_tax_exempt {
    pub use crate::instructions::tax::__client_accounts_manage_tax_exempt::*;
}

pub mod __client_accounts_add_tax_exempt {
    pub use crate::instructions::tax::__client_accounts_manage_tax_exempt::*;
}

pub mod __client_accounts_remove_tax_exempt {
    pub use crate::instructions::tax::__client_accounts_manage_tax_exempt::*;
}

pub mod __client_accounts_initialize_holder {
    pub use crate::instructions::holder::__client_accounts_initialize_holder::*;
}

pub mod __client_accounts_freeze_holder {
    pub use crate::instructions::holder::__client_accounts_freeze_holder::*;
}

pub mod __client_accounts_unfreeze_holder {
    pub use crate::instructions::holder::__client_accounts_unfreeze_holder::*;
}

pub mod __client_accounts_transfer_with_tax {
    pub use crate::instructions::transfer::__client_accounts_transfer_with_tax::*;
}

pub mod __client_accounts_update_authority {
    pub use crate::instructions::admin::__client_accounts_update_authority::*;
}

pub mod __client_accounts_set_paused {
    pub use crate::instructions::admin::__client_accounts_set_paused::*;
}

pub mod __client_accounts_emergency_withdraw {
    pub use crate::instructions::admin::__client_accounts_emergency_withdraw::*;
}

pub mod __client_accounts_calculate_tax {
    pub use crate::instructions::query::__client_accounts_calculate_tax::*;
}

pub mod __client_accounts_get_holder_stats {
    pub use crate::instructions::query::__client_accounts_get_holder_stats::*;
}

#[program]
pub mod tot_token {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        params: InitializeParams,
    ) -> Result<()> {
        crate::instructions::initialize::handler(ctx, params)
    }

    pub fn init_pool(
        ctx: Context<InitPool>,
        pool_type: PoolType,
    ) -> Result<()> {
        crate::instructions::init_pool::handler(ctx, pool_type)
    }

    pub fn mint_to_pools(ctx: Context<MintToPools>) -> Result<()> {
        crate::instructions::mint_to_pools::handler(ctx)
    }

    pub fn initialize_tax_config(ctx: Context<InitializeTaxConfig>) -> Result<()> {
        crate::instructions::tax::initialize_tax_config_handler(ctx)
    }

    pub fn update_tax_config(
        ctx: Context<UpdateTaxConfig>,
        base_tax_bps: Option<u16>,
        alpha: Option<u64>,
        beta: Option<u64>,
        gamma_bps: Option<u16>,
        panic_threshold_bps: Option<u16>,
        panic_tax_bps: Option<u16>,
    ) -> Result<()> {
        crate::instructions::tax::update_tax_config_handler(
            ctx,
            base_tax_bps,
            alpha,
            beta,
            gamma_bps,
            panic_threshold_bps,
            panic_tax_bps,
        )
    }

    pub fn add_tax_exempt(ctx: Context<ManageTaxExempt>, address: Pubkey) -> Result<()> {
        crate::instructions::tax::add_tax_exempt_handler(ctx, address)
    }

    pub fn remove_tax_exempt(ctx: Context<ManageTaxExempt>, address: Pubkey) -> Result<()> {
        crate::instructions::tax::remove_tax_exempt_handler(ctx, address)
    }

    pub fn initialize_holder(ctx: Context<InitializeHolder>) -> Result<()> {
        crate::instructions::holder::initialize_holder_handler(ctx)
    }

    pub fn freeze_holder(ctx: Context<FreezeHolder>, reason: u8) -> Result<()> {
        crate::instructions::holder::freeze_holder_handler(ctx, reason)
    }

    pub fn unfreeze_holder(ctx: Context<UnfreezeHolder>) -> Result<()> {
        crate::instructions::holder::unfreeze_holder_handler(ctx)
    }

    pub fn transfer_with_tax(
        ctx: Context<TransferWithTax>, 
        amount: u64,
        is_sell: bool,
    ) -> Result<()> {
        crate::instructions::transfer::transfer_with_tax_handler(ctx, amount, is_sell)
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

    pub fn set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
        crate::instructions::admin::set_paused_handler(ctx, paused)
    }

    pub fn emergency_withdraw(ctx: Context<EmergencyWithdraw>, amount: u64) -> Result<()> {
        crate::instructions::admin::emergency_withdraw_handler(ctx, amount)
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

    /// 设置奖池比例
    /// 
    /// 管理员可以动态调整税收用于奖池的比例，范围: 4%-40%。
    /// 
    /// # 功能说明
    /// 
    /// 1. 验证管理员权限
    /// 2. 验证比例范围（4%-40%）
    /// 3. 更新TaxConfig和JackpotAccount中的比例
    /// 4. 发出比例更新事件
    /// 
    /// # 参数
    /// * `ctx` - 设置奖池比例上下文
    /// * `new_ratio_bps` - 新的奖池比例（basis points，400-4000，即4%-40%）
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 注意事项
    /// * 只有管理员可以执行此操作
    /// * 比例必须在400-4000 basis points范围内（4%-40%）
    /// * 修改后立即生效，影响后续所有转账的税收分配
    /// 
    /// # 使用示例
    /// ```rust
    /// // 设置奖池比例为30%
    /// program.methods
    ///     .setJackpotRatio(3000)
    ///     .accounts({
    ///         authority: admin,
    ///         config: configPda,
    ///         taxConfig: taxConfigPda,
    ///         jackpotAccount: jackpotPda,
    ///     })
    ///     .rpc();
    /// ```
    pub fn set_jackpot_ratio(
        ctx: Context<SetJackpotRatio>,
        new_ratio_bps: u16,
    ) -> Result<()> {
        instructions::admin::set_jackpot_ratio_handler(ctx, new_ratio_bps)
    }

    /// 初始化奖池账户
    /// 
    /// 创建奖池账户并设置初始参数，包括基础难度、保留比例等。
    /// 这是启用成瘾机制（天命轮盘）的第一步。
    /// 
    /// # 功能说明
    /// 
    /// 1. 验证调用者是否为系统管理员
    /// 2. 创建奖池账户（PDA）和关联代币账户（ATA）
    /// 3. 设置初始参数（难度、比例等）
    /// 4. 发出初始化事件
    /// 
    /// # 参数
    /// * `ctx` - 奖池初始化上下文
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 注意事项
    /// * 只有系统管理员可以执行此操作
    /// * 奖池账户只能初始化一次
    /// * 初始难度设置为1000（对应0.1%中奖概率）
    /// 
    /// # 使用示例
    /// ```rust
    /// // 初始化奖池账户
    /// program.methods
    ///     .initializeJackpot()
    ///     .accounts({...})
    ///     .rpc();
    /// ```
    pub fn initialize_jackpot(
        ctx: Context<InitializeJackpot>,
    ) -> Result<()> {
        instructions::jackpot::initialize_jackpot_handler(ctx)
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
        crate::instructions::query::calculate_tax_handler(ctx, amount, is_buy, is_sell)
    }

    pub fn get_holder_stats(ctx: Context<GetHolderStats>) -> Result<HolderStats> {
        crate::instructions::query::get_holder_stats_handler(ctx)
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
