//! # 持有者账户模块
//! 
//! 本模块定义了持有者账户结构，用于追踪每个TOT代币持有者的信息和统计。
//! 这些信息用于计算动态税率折扣，奖励长期持有者。
//! 
//! ## 持有者账户功能
//! 
//! 1. **持有时间追踪**: 记录首次持有时间和最后交易时间
//! 2. **交易统计**: 累计买入、卖出、缴税等数据
//! 3. **税率折扣计算**: 基于持有时间计算税率折扣
//! 4. **账户管理**: 支持冻结/解冻功能
//! 
//! ============================================
// 文件: src/state/holder.rs
// 持有者账户定义
// ============================================

use anchor_lang::prelude::*;

/// 持有者账户结构体
/// 
/// 为每个TOT代币持有者创建独立的账户，用于追踪其持有历史、交易统计等信息。
/// 这些信息用于计算动态税率折扣，实现"时间熔炉"机制。
/// 
/// ## 账户特性
/// 
/// - 使用PDA创建，种子: `["tot_holder", owner_wallet_address]`
/// - 每个钱包地址有唯一的持有者账户
/// - 在用户首次接收代币时自动创建
#[account]
pub struct HolderAccount {
    /// 持有者钱包地址
    /// 
    /// 类型: Pubkey (32字节)
    /// 
    /// 说明:
    /// - 持有者的主钱包地址
    /// - 用于标识账户的所有者
    /// - 用于PDA派生
    /// 
    /// 用途:
    /// - 账户标识
    /// - 权限验证
    /// - 查询持有者信息
    pub owner: Pubkey,
    
    /// 关联的代币账户地址
    /// 
    /// 类型: Pubkey (32字节)
    /// 
    /// 说明:
    /// - 持有者的TOT代币账户（ATA）地址
    /// - 代币实际存储在这个账户中
    /// - 可以用于查询余额
    /// 
    /// 用途:
    /// - 关联代币账户
    /// - 余额查询
    /// - 转账验证
    pub token_account: Pubkey,
    
    /// 首次持有时间
    /// 
    /// 类型: i64 (8字节，Unix时间戳)
    /// 
    /// 说明:
    /// - 用户首次获得TOT代币的时间
    /// - 用于计算持有天数
    /// - 在首次买入时设置
    /// 
    /// 用途:
    /// - 计算持有天数 = (当前时间 - first_hold_time) / 86400
    /// - 计算持有时间折扣
    /// - 确定税率折扣等级
    pub first_hold_time: i64,
    
    /// 最后交易时间
    /// 
    /// 类型: i64 (8字节，Unix时间戳)
    /// 
    /// 说明:
    /// - 最后一次买入或卖出的时间
    /// - 每次交易都会更新
    /// - 用于追踪用户活跃度
    /// 
    /// 用途:
    /// - 交易活跃度分析
    /// - 时间相关验证
    pub last_transaction_time: i64,
    
    /// 加权持有天数
    /// 
    /// 类型: u64 (8字节)
    /// 
    /// 说明:
    /// - 用于计算持有时间折扣的加权天数
    /// - 考虑不同时间段的权重
    /// - 当前实现中可能未完全使用，预留用于未来优化
    /// 
    /// 用途:
    /// - 更精确的持有时间计算
    /// - 未来可能的加权折扣机制
    pub weighted_hold_days: u64,
    
    /// 累计买入量
    /// 
    /// 类型: u64 (8字节，基础单位)
    /// 
    /// 说明:
    /// - 用户累计买入的TOT代币总数
    /// - 每次买入都会累加
    /// - 用于统计和分析
    /// 
    /// 用途:
    /// - 用户行为分析
    /// - 统计和报告
    /// - 识别大额买家
    pub total_bought: u64,
    
    /// 累计卖出量
    /// 
    /// 类型: u64 (8字节，基础单位)
    /// 
    /// 说明:
    /// - 用户累计卖出的TOT代币总数
    /// - 每次卖出都会累加
    /// - 用于统计和分析
    /// 
    /// 用途:
    /// - 用户行为分析
    /// - 统计和报告
    /// - 识别大额卖家
    pub total_sold: u64,
    
    /// 累计缴税总额
    /// 
    /// 类型: u64 (8字节，基础单位)
    /// 
    /// 说明:
    /// - 用户累计支付的所有税收总和
    /// - 每次交易的税收都会累加
    /// - 用于统计用户贡献
    /// 
    /// 用途:
    /// - 用户贡献统计
    /// - 税收收入分析
    /// - 社区奖励计算（未来可能）
    pub total_tax_paid: u64,
    
    /// 累计消费总额
    /// 
    /// 类型: u64 (8字节，基础单位)
    /// 
    /// 说明:
    /// - 用户累计向TWS官方消费的TOT总数
    /// - 包括地图操作、祖籍标记等消费
    /// - 消费不收取税收，但会记录统计
    /// 
    /// 用途:
    /// - 用户消费统计
    /// - 平台收入分析
    /// - 用户活跃度分析
    pub total_consumed: u64,
    
    /// 账户冻结状态
    /// 
    /// 类型: bool (1字节)
    /// 
    /// 说明:
    /// - `true`: 账户被管理员冻结，无法转账
    /// - `false`: 账户正常，可以自由转账
    /// 
    /// 冻结原因:
    /// - 洗钱嫌疑
    /// - 恶意做空
    /// - 违规交易
    /// - 其他合规要求
    /// 
    /// 效果:
    /// - 冻结后无法执行转账操作
    /// - 但仍可以接收代币
    pub is_frozen: bool,
    
    /// 冻结原因代码
    /// 
    /// 类型: u8 (1字节)
    /// 
    /// 说明:
    /// - 0: 未冻结
    /// - 1: 洗钱嫌疑
    /// - 2: 恶意做空
    /// - 3: 违规交易
    /// - 其他: 自定义原因代码
    /// 
    /// 用途:
    /// - 记录冻结原因
    /// - 便于审计和查询
    /// - 帮助用户了解冻结原因
    pub freeze_reason: u8,
    
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

impl HolderAccount {
    /// 计算账户所需空间
    /// 
    /// 返回持有者账户所需的总字节数，用于账户初始化时的空间分配。
    /// 
    /// 总大小: 129 字节
    pub const LEN: usize = 8 + // discriminator (Anchor自动添加)
        32 + // owner (Pubkey)
        32 + // token_account (Pubkey)
        8 + // first_hold_time (i64)
        8 + // last_transaction_time (i64)
        8 + // weighted_hold_days (u64)
        8 + // total_bought (u64)
        8 + // total_sold (u64)
        8 + // total_tax_paid (u64)
        8 + // total_consumed (u64)
        1 + // is_frozen (bool)
        1 + // freeze_reason (u8)
        1; // bump (u8)
    
    /// 计算持有天数
    /// 
    /// 根据首次持有时间和当前时间，计算用户持有代币的天数。
    /// 这个值用于计算持有时间折扣，决定用户享受的税率优惠。
    /// 
    /// # 参数
    /// * `current_time` - 当前Unix时间戳
    /// 
    /// # 返回值
    /// * `u64` - 持有天数（从首次持有到当前时间的天数）
    /// 
    /// # 计算逻辑
    /// 1. 如果当前时间 <= 首次持有时间，返回0（尚未持有）
    /// 2. 计算持有秒数 = current_time - first_hold_time
    /// 3. 转换为天数 = 持有秒数 / 86400
    /// 
    /// # 使用示例
    /// ```rust
    /// let clock = Clock::get()?;
    /// let holding_days = holder_account.get_holding_days(clock.unix_timestamp);
    /// 
    /// // 根据持有天数确定折扣等级
    /// let discount = if holding_days >= 365 {
    ///     75 // 75%折扣
    /// } else if holding_days >= 180 {
    ///     50 // 50%折扣
    /// } else {
    ///     0  // 无折扣
    /// };
    /// ```
    pub fn get_holding_days(&self, current_time: i64) -> u64 {
        // 如果当前时间早于或等于首次持有时间，返回0
        if current_time <= self.first_hold_time {
            return 0;
        }
        
        // 计算持有秒数（使用saturating_sub防止下溢）
        let holding_seconds = current_time
            .saturating_sub(self.first_hold_time) as u64;
        
        // 转换为天数（86400秒 = 1天）
        holding_seconds / 86400
    }
    
    /// 更新持有者统计（买入操作）
    /// 
    /// 记录用户的买入操作，更新相关统计信息。
    /// 这个方法在用户买入代币时调用。
    /// 
    /// # 参数
    /// * `amount` - 买入的代币数量（基础单位）
    /// * `tax_paid` - 本次交易支付的税额（基础单位）
    /// * `timestamp` - 交易时间戳（Unix时间戳）
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 更新内容
    /// 1. 累加`total_bought`（累计买入量）
    /// 2. 累加`total_tax_paid`（累计缴税额）
    /// 3. 更新`last_transaction_time`（最后交易时间）
    /// 4. 如果是首次持有（`first_hold_time == 0`），设置首次持有时间
    /// 
    /// # 错误
    /// * 如果累加过程中发生溢出，返回`TotError::MathOverflow`
    /// 
    /// # 使用示例
    /// ```rust
    /// let clock = Clock::get()?;
    /// holder_account.record_buy(
    ///     1_000_000_000, // 买入1000个代币（考虑decimals）
    ///     50_000_000,    // 支付5个代币的税
    ///     clock.unix_timestamp
    /// )?;
    /// ```
    pub fn record_buy(&mut self, amount: u64, tax_paid: u64, timestamp: i64) -> Result<()> {
        // 累加累计买入量
        self.total_bought = self.total_bought
            .checked_add(amount)
            .ok_or(anchor_lang::error!(crate::errors::TotError::MathOverflow))?;
        
        // 累加累计缴税额
        self.total_tax_paid = self.total_tax_paid
            .checked_add(tax_paid)
            .ok_or(anchor_lang::error!(crate::errors::TotError::MathOverflow))?;
        
        // 更新最后交易时间
        self.last_transaction_time = timestamp;
        
        // 如果是首次持有（first_hold_time == 0），设置首次持有时间
        // 这确保了首次持有时间的准确性
        if self.first_hold_time == 0 {
            self.first_hold_time = timestamp;
        }
        
        Ok(())
    }
    
    /// 更新持有者统计（卖出操作）
    /// 
    /// 记录用户的卖出操作，更新相关统计信息。
    /// 这个方法在用户卖出代币时调用。
    /// 
    /// # 参数
    /// * `amount` - 卖出的代币数量（基础单位，原始金额）
    /// * `tax_paid` - 本次交易支付的税额（基础单位）
    /// * `timestamp` - 交易时间戳（Unix时间戳）
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 更新内容
    /// 1. 累加`total_sold`（累计卖出量）
    /// 2. 累加`total_tax_paid`（累计缴税额）
    /// 3. 更新`last_transaction_time`（最后交易时间）
    /// 
    /// # 注意
    /// - 卖出不会更新首次持有时间（保持首次持有时间不变）
    /// - 卖出金额是原始金额（未扣除税收前）
    /// 
    /// # 错误
    /// * 如果累加过程中发生溢出，返回`TotError::MathOverflow`
    /// 
    /// # 使用示例
    /// ```rust
    /// let clock = Clock::get()?;
    /// holder_account.record_sell(
    ///     1_000_000_000, // 卖出1000个代币（原始金额）
    ///     200_000_000,   // 支付20个代币的税（高税率）
    ///     clock.unix_timestamp
    /// )?;
    /// ```
    pub fn record_sell(&mut self, amount: u64, tax_paid: u64, timestamp: i64) -> Result<()> {
        // 累加累计卖出量
        self.total_sold = self.total_sold
            .checked_add(amount)
            .ok_or(anchor_lang::error!(crate::errors::TotError::MathOverflow))?;
        
        // 累加累计缴税额
        self.total_tax_paid = self.total_tax_paid
            .checked_add(tax_paid)
            .ok_or(anchor_lang::error!(crate::errors::TotError::MathOverflow))?;
        
        // 更新最后交易时间
        self.last_transaction_time = timestamp;
        
        Ok(())
    }
    
    /// 更新持有者统计（消费操作）
    /// 
    /// 记录用户向TWS官方的消费操作，更新相关统计信息。
    /// 这个方法在用户向TWS财库消费时调用。
    /// 
    /// # 参数
    /// * `amount` - 消费的代币数量（基础单位）
    /// * `timestamp` - 交易时间戳（Unix时间戳）
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    /// 
    /// # 更新内容
    /// 1. 累加`total_consumed`（累计消费量）
    /// 2. 更新`last_transaction_time`（最后交易时间）
    /// 
    /// # 注意
    /// - 消费不收取税收，但会记录统计
    /// - 消费不会更新首次持有时间（保持首次持有时间不变）
    /// 
    /// # 错误
    /// * 如果累加过程中发生溢出，返回`TotError::MathOverflow`
    /// 
    /// # 使用示例
    /// ```rust
    /// let clock = Clock::get()?;
    /// holder_account.record_consume(
    ///     100_000_000_000, // 消费100个代币
    ///     clock.unix_timestamp
    /// )?;
    /// ```
    pub fn record_consume(&mut self, amount: u64, timestamp: i64) -> Result<()> {
        // 累加累计消费量
        self.total_consumed = self.total_consumed
            .checked_add(amount)
            .ok_or(anchor_lang::error!(crate::errors::TotError::MathOverflow))?;
        
        // 更新最后交易时间
        self.last_transaction_time = timestamp;
        
        Ok(())
    }
}
