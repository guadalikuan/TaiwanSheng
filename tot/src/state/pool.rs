//! # 池子账户模块
//! 
//! 本模块定义了池子相关的状态账户，包括池子类型枚举和池子账户结构。
//! 池子系统实现了TOT代币的五大分配方案，每个池子都有特定的用途和释放机制。
//! 
//! ## 池子系统概述
//! 
//! TOT代币采用五大池子分配方案，每个池子都有：
//! - 特定的代币分配数量
//! - 独特的锁仓和释放机制
//! - 不同的控制方式（时间锁、多签、RWA触发等）
//! 
//! ============================================
// 文件: src/state/pool.rs
// 池子账户定义
// ============================================

use anchor_lang::prelude::*;

/// 池子类型枚举
/// 
/// 定义了TOT代币的五大池子类型，每个类型对应不同的分配方案和释放机制。
/// 枚举值对应池子类型的数字标识（0-4）。
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum PoolType {
    /// 胜利日基金池
    /// 
    /// 枚举值: 0
    /// 分配量: 20.27B (10%)
    /// 数学含义: 20.27对应2027年，象征统一目标
    /// 
    /// 锁仓规则:
    /// - 完全锁定至2027年1月1日 00:00:00 UTC
    /// - 在此之前无法提取任何代币
    /// 
    /// 用途:
    /// - 核心团队和开发者奖励
    /// - 战略储备资金
    /// - 项目运营资金
    /// 
    /// 释放机制: 时间锁，到期后一次性解锁
    VictoryFund = 0,
    
    /// 历史重铸池（初始流动性池）
    /// 
    /// 枚举值: 1
    /// 分配量: 19.49B (9.6%)
    /// 数学含义: 19.49对应1949年，象征两岸分治的历史起点
    /// 
    /// 锁仓规则:
    /// - 立即可用，无时间锁
    /// - LP Token将永久锁定（打入黑洞地址）
    /// 
    /// 用途:
    /// - 初始流动性提供
    /// - 在Raydium等DEX创建交易池
    /// 
    /// 释放机制: 立即释放，用于创建流动性池
    HistoryLP = 1,
    
    /// 认知作战池（社区激励池）
    /// 
    /// 枚举值: 2
    /// 分配量: 14.50B (7.15%)
    /// 数学含义: 14.50对应"1450"，台湾网军的代称
    /// 
    /// 锁仓规则:
    /// - 无时间锁，但采用线性释放
    /// 
    /// 用途:
    /// - 社区激励和空投
    /// - 悬赏任务奖励
    /// - 推广和营销费用
    /// 
    /// 释放机制:
    /// - 365天线性释放
    /// - 每天释放约0.1%作为"作战经费"
    CyberArmy = 2,
    
    /// 外资统战池（机构投资者池）
    /// 
    /// 枚举值: 3
    /// 分配量: 7.04B (3.47%)
    /// 数学含义: 7.04对应7月4日（美国独立日）
    /// 
    /// 锁仓规则:
    /// - 无时间锁，但需要多签控制
    /// 
    /// 用途:
    /// - QFII（合格境外机构投资者）分配
    /// - 机构投资者份额
    /// - 交易所上币费用
    /// 
    /// 释放机制:
    /// - 需要3-of-5多签才能释放
    /// - 确保机构资金的安全和合规
    GlobalAlliance = 3,
    
    /// 资产锚定池（RWA储备池）
    /// 
    /// 枚举值: 4
    /// 分配量: 141.40B (69.76%)
    /// 数学含义: 141.40象征14亿人民与1.4万亿的房地产库存
    /// 
    /// 锁仓规则:
    /// - 非流通状态（Non-Circulating）
    /// - 采用"单向阀"机制
    /// 
    /// 用途:
    /// - RWA（现实世界资产）锚定储备
    /// - 代表对2027年后大中华区指定资产的优先兑换权
    /// 
    /// 释放机制:
    /// - "单向阀"机制：通过身份验证、资产确权、法币兑换等方式触发释放
    /// - 通过RWA智能合约验证后才会解锁
    AssetAnchor = 4,
}

impl PoolType {
    /// 获取池子类型的种子字节
    /// 
    /// 返回用于PDA派生的种子字节数组。
    /// 每个池子类型都有唯一的种子字符串，用于生成确定性的账户地址。
    /// 
    /// # 返回值
    /// * `&[u8]` - 池子类型的种子字节数组
    /// 
    /// # 使用示例
    /// ```rust
    /// let pool_type = PoolType::VictoryFund;
    /// let seed = pool_type.as_seed(); // b"victory"
    /// ```
    pub fn as_seed(&self) -> &[u8] {
        match self {
            PoolType::VictoryFund => b"victory",
            PoolType::HistoryLP => b"history",
            PoolType::CyberArmy => b"cyber",
            PoolType::GlobalAlliance => b"global",
            PoolType::AssetAnchor => b"asset",
        }
    }
    
    /// 从u8值转换为PoolType枚举
    /// 
    /// 用于从数字标识符恢复池子类型，例如从链上数据读取时。
    /// 
    /// # 参数
    /// * `value` - 池子类型的数字标识符（0-4）
    /// 
    /// # 返回值
    /// * `Result<Self>` - 成功返回对应的PoolType，失败返回InvalidPoolType错误
    /// 
    /// # 错误
    /// * 如果value不在0-4范围内，返回`TotError::InvalidPoolType`
    /// 
    /// # 使用示例
    /// ```rust
    /// let pool_type = PoolType::from_u8(0)?; // Ok(PoolType::VictoryFund)
    /// let invalid = PoolType::from_u8(10)?; // Err(InvalidPoolType)
    /// ```
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

/// 池子账户结构体
/// 
/// 存储每个池子的完整状态和配置信息，包括锁仓规则、释放机制、多签配置等。
/// 每个池子类型都有对应的PoolAccount实例。
/// 
/// ## 账户特性
/// 
/// - 使用PDA创建，种子: `["tot_pool", pool_type as u8]`
/// - 每个池子类型有唯一的账户地址
/// - 存储了池子的所有状态信息
#[account]
pub struct PoolAccount {
    /// 池子类型
    /// 
    /// 类型: PoolType (1字节枚举)
    /// 
    /// 说明:
    /// - 标识这是哪个池子（VictoryFund, HistoryLP等）
    /// - 用于确定池子的分配量和释放规则
    /// - 在初始化时设置，之后不可更改
    pub pool_type: PoolType,
    
    /// 池子代币账户地址
    /// 
    /// 类型: Pubkey (32字节)
    /// 
    /// 说明:
    /// - 存储该池子代币的关联代币账户（ATA）地址
    /// - 代币实际存储在这个账户中
    /// - 用于代币的转入和转出操作
    /// 
    /// 用途:
    /// - 铸造代币到此账户
    /// - 从账户提取代币
    /// - 查询池子余额
    pub token_account: Pubkey,
    
    /// 初始分配量
    /// 
    /// 类型: u64 (8字节)
    /// 
    /// 说明:
    /// - 该池子初始分配的代币数量（基础单位，已乘以10^9）
    /// - 在`mint_to_pools`时设置
    /// - 用于计算可释放量
    /// 
    /// 示例:
    /// - 胜利日基金: 20,270,000,000,000,000,000 (20.27B)
    /// - 历史重铸池: 19,490,000,000,000,000,000 (19.49B)
    pub initial_allocation: u64,
    
    /// 已释放量
    /// 
    /// 类型: u64 (8字节)
    /// 
    /// 说明:
    /// - 已从该池子释放的代币数量
    /// - 每次释放都会累加到此字段
    /// - 用于计算剩余可释放量
    /// 
    /// 计算:
    /// - 剩余量 = initial_allocation - released_amount
    /// - 可释放量 = calculate_releasable() - released_amount
    pub released_amount: u64,
    
    /// 解锁时间
    /// 
    /// 类型: i64 (8字节，Unix时间戳)
    /// 
    /// 说明:
    /// - 池子解锁的Unix时间戳
    /// - 0表示无时间锁，立即可用
    /// - 大于0表示需要等待到此时间才能解锁
    /// 
    /// 示例:
    /// - 胜利日基金: 1798761600 (2027-01-01 00:00:00 UTC)
    /// - 历史重铸池: 0 (无时间锁)
    /// 
    /// 用途:
    /// - 时间锁验证
    /// - 计算是否已解锁
    pub unlock_time: i64,
    
    /// 释放开始时间
    /// 
    /// 类型: i64 (8字节，Unix时间戳)
    /// 
    /// 说明:
    /// - 线性释放开始的时间戳
    /// - 用于计算已过时间和应释放量
    /// - 0表示无线性释放
    /// 
    /// 用途:
    /// - 线性释放计算
    /// - 确定释放进度
    pub vesting_start: i64,
    
    /// 释放周期
    /// 
    /// 类型: i64 (8字节，以秒为单位)
    /// 
    /// 说明:
    /// - 线性释放的总时长（秒）
    /// - 0表示无线性释放，一次性释放
    /// - 认知作战池为365天 = 31,536,000秒
    /// 
    /// 计算:
    /// - 每天释放量 = initial_allocation / (vesting_period / 86400)
    /// - 已过时间比例 = (current_time - vesting_start) / vesting_period
    pub vesting_period: i64,
    
    /// 是否需要多签控制
    /// 
    /// 类型: bool (1字节)
    /// 
    /// 说明:
    /// - `true`: 需要多签才能执行操作（如外资统战池）
    /// - `false`: 单签即可执行操作
    /// 
    /// 用途:
    /// - 提高安全性
    /// - 确保机构资金的安全
    pub requires_multisig: bool,
    
    /// 多签阈值
    /// 
    /// 类型: u8 (1字节)
    /// 
    /// 说明:
    /// - 需要多少个签名才能执行操作
    /// - 例如：3表示需要3个签名（3-of-5多签）
    /// - 范围：1-5（不能超过签名者数量）
    /// 
    /// 用途:
    /// - 多签验证
    /// - 确保操作的安全性
    pub multisig_threshold: u8,
    
    /// 多签签名者列表
    /// 
    /// 类型: [Pubkey; 5] (160字节，5个地址)
    /// 
    /// 说明:
    /// - 最多5个多签签名者的地址
    /// - 未使用的槽位为Pubkey::default()
    /// - 在初始化时设置
    /// 
    /// 用途:
    /// - 多签验证
    /// - 确定哪些地址可以签名
    pub multisig_signers: [Pubkey; 5],
    
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

impl PoolAccount {
    /// 计算账户所需空间
    /// 
    /// 返回池子账户所需的总字节数，用于账户初始化时的空间分配。
    /// 
    /// 总大小: 252 字节
    pub const LEN: usize = 8 + // discriminator (Anchor自动添加)
        1 + // pool_type (PoolType枚举)
        32 + // token_account (Pubkey)
        8 + // initial_allocation (u64)
        8 + // released_amount (u64)
        8 + // unlock_time (i64)
        8 + // vesting_start (i64)
        8 + // vesting_period (i64)
        1 + // requires_multisig (bool)
        1 + // multisig_threshold (u8)
        (32 * 5) + // multisig_signers ([Pubkey; 5])
        1; // bump (u8)
    
    /// 检查池子是否已解锁
    /// 
    /// 根据当前时间和解锁时间判断池子是否可以提取代币。
    /// 
    /// # 参数
    /// * `current_time` - 当前Unix时间戳
    /// 
    /// # 返回值
    /// * `bool` - `true`表示已解锁，`false`表示仍锁定
    /// 
    /// # 逻辑
    /// - 如果`unlock_time == 0`，表示无时间锁，返回`true`
    /// - 如果`current_time >= unlock_time`，表示已到解锁时间，返回`true`
    /// - 否则返回`false`
    /// 
    /// # 使用示例
    /// ```rust
    /// let clock = Clock::get()?;
    /// if pool_account.is_unlocked(clock.unix_timestamp) {
    ///     // 可以提取代币
    /// }
    /// ```
    pub fn is_unlocked(&self, current_time: i64) -> bool {
        // 无时间锁（unlock_time == 0）或已到解锁时间
        self.unlock_time == 0 || current_time >= self.unlock_time
    }
    
    /// 计算可释放的代币数量（线性释放）
    /// 
    /// 根据当前时间、释放开始时间、释放周期等参数，计算当前可以释放的代币数量。
    /// 这个方法实现了线性释放机制，确保代币按时间均匀释放。
    /// 
    /// # 参数
    /// * `current_time` - 当前Unix时间戳
    /// 
    /// # 返回值
    /// * `Result<u64>` - 可释放的代币数量（基础单位）
    /// 
    /// # 计算逻辑
    /// 
    /// 1. **时间锁检查**: 如果未到解锁时间，返回0
    /// 2. **无线性释放**: 如果`vesting_period == 0`，返回全部剩余量
    /// 3. **释放未开始**: 如果当前时间 < `vesting_start`，返回0
    /// 4. **释放已完成**: 如果已过释放周期，返回全部剩余量
    /// 5. **线性释放计算**:
    ///    - 已过时间 = current_time - vesting_start
    ///    - 应释放比例 = 已过时间 / 释放周期
    ///    - 应释放总量 = initial_allocation × 应释放比例
    ///    - 可释放量 = 应释放总量 - 已释放量
    /// 
    /// # 公式
    /// ```
    /// 应释放总量 = initial_allocation × (elapsed / vesting_period)
    /// 可释放量 = 应释放总量 - released_amount
    /// ```
    /// 
    /// # 错误
    /// * 如果计算过程中发生溢出，返回`TotError::MathOverflow`
    /// * 如果计算过程中发生下溢，返回`TotError::MathUnderflow`
    /// 
    /// # 使用示例
    /// ```rust
    /// let clock = Clock::get()?;
    /// let releasable = pool_account.calculate_releasable(clock.unix_timestamp)?;
    /// if releasable > 0 {
    ///     // 可以释放releasable数量的代币
    /// }
    /// ```
    /// 
    /// # 注意事项
    /// 
    /// 如果未来添加池子释放指令，需要在释放指令中添加以下验证：
    /// ```rust
    /// // 在池子释放指令中
    /// let releasable = pool_account.calculate_releasable(clock.unix_timestamp)?;
    /// require!(
    ///     amount <= releasable,
    ///     TotError::InsufficientPoolBalance
    /// );
    /// require!(
    ///     amount <= pool_token_account.amount,
    ///     TotError::InsufficientPoolBalance
    /// );
    /// 
    /// // 更新已释放量
    /// pool_account.released_amount = pool_account.released_amount
    ///     .checked_add(amount)
    ///     .ok_or(error!(TotError::MathOverflow))?;
    /// ```
    pub fn calculate_releasable(&self, current_time: i64) -> Result<u64> {
        // 步骤1: 检查是否已解锁（时间锁验证）
        if !self.is_unlocked(current_time) {
            return Ok(0);
        }
        
        // 计算剩余可释放量（在多个地方使用，提前计算以节省gas）
        let remaining = self.initial_allocation
            .checked_sub(self.released_amount)
            .ok_or(anchor_lang::error!(crate::errors::TotError::MathOverflow))?;
        
        // 步骤2: 如果没有线性释放（vesting_period == 0），返回全部剩余
        if self.vesting_period == 0 {
            return Ok(remaining);
        }
        
        // 步骤3: 如果还未开始释放，返回0
        if current_time < self.vesting_start {
            return Ok(0);
        }
        
        // 步骤4: 计算已过时间（从释放开始到当前时间）
        let elapsed = current_time
            .checked_sub(self.vesting_start)
            .ok_or(anchor_lang::error!(crate::errors::TotError::MathUnderflow))?;
        
        // 步骤5: 如果已过释放周期，返回全部剩余
        if elapsed >= self.vesting_period {
            return Ok(remaining);
        }
        
        // 步骤6: 计算应该释放的总量（线性释放公式）
        // 公式: 应释放总量 = 初始分配量 × (已过时间 / 释放周期)
        // 使用u128避免溢出
        // 注意：vesting_period已经在步骤2中验证不为0，这里可以安全除法
        let total_should_release = (self.initial_allocation as u128)
            .checked_mul(elapsed as u128)
            .and_then(|v| {
                // 再次验证vesting_period不为0（防御性编程）
                if self.vesting_period == 0 {
                    None
                } else {
                    v.checked_div(self.vesting_period as u128)
                }
            })
            .ok_or(anchor_lang::error!(crate::errors::TotError::DivisionByZero))? as u64;
        
        // 步骤7: 计算可释放量 = 应该释放的总量 - 已释放量
        // 如果已释放量超过应释放总量，说明数据不一致
        // 这种情况可能发生在：
        // 1. 之前的释放指令没有正确更新released_amount
        // 2. 时间计算出现异常
        // 3. 手动修改了账户数据
        // 为了系统的健壮性，记录警告并返回0，允许系统继续运行
        let releasable = if total_should_release >= self.released_amount {
            total_should_release
                .checked_sub(self.released_amount)
                .ok_or(anchor_lang::error!(crate::errors::TotError::MathUnderflow))?
        } else {
            // 数据不一致：已释放量超过应释放总量
            // 记录警告信息，便于审计和调试
            msg!(
                "WARNING: Pool data inconsistency detected. Pool type: {:?}, \
                Total should release: {}, Released amount: {}, \
                This may indicate a bug or data corruption.",
                self.pool_type,
                total_should_release,
                self.released_amount
            );
            // 返回0以保持系统健壮性，允许后续操作继续
            // 管理员应该检查并修复数据不一致问题
            0
        };
        
        Ok(releasable)
    }
}
