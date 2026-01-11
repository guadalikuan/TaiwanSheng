//! # 奖池账户模块
//! 
//! 本模块定义了成瘾机制（天命轮盘）的奖池账户。
//! 实现了"参与即挖矿"的机制，每次转账都有机会中奖。

use anchor_lang::prelude::*;
use crate::utils::math::calculate_bps;

/// 奖池账户结构体
/// 
/// 存储奖池的状态信息，包括余额、难度、统计等。
/// 每次转账都会检查是否中奖，实现"参与即挖矿"的成瘾机制。
/// 
/// ## 账户特性
/// 
/// - 使用PDA创建，种子: `["tot_jackpot"]`
/// - 每个系统只有一个奖池账户
/// - 存储了奖池的所有状态信息
#[account]
pub struct JackpotAccount {
    /// 奖池余额（基础单位）
    /// 
    /// 类型: u64 (8字节)
    /// 
    /// 说明:
    /// - 当前奖池中的代币余额
    /// - 每次税收分配都会注入奖池
    /// - 每次开奖都会从奖池中扣除奖金
    pub balance: u64,
    
    /// 当前难度（类似比特币算力，数值越大越难中奖）
    /// 
    /// 类型: u64 (8字节)
    /// 
    /// 说明:
    /// - 初始值: 1000 (对应0.1%中奖概率)
    /// - 计算公式: difficulty = base_difficulty * (1 + pool_factor) * (1 + tx_factor)
    /// - 难度越高，中奖概率越低
    /// 
    /// 中奖概率: 1 / difficulty
    /// 例如: difficulty = 1000，中奖概率 = 0.1%
    pub difficulty: u64,
    
    /// 基础难度（初始值1000，对应0.1%中奖概率）
    /// 
    /// 类型: u64 (8字节)
    /// 
    /// 说明:
    /// - 难度的基准值
    /// - 可以通过管理员指令调整
    /// - 用于计算动态难度
    pub base_difficulty: u64,
    
    /// 累计交易次数（参与即挖矿的"算力"）
    /// 
    /// 类型: u64 (8字节)
    /// 
    /// 说明:
    /// - 累计发生的转账次数
    /// - 每次转账都会增加
    /// - 用于计算动态难度（交易越多，难度越高）
    pub total_transactions: u64,
    
    /// 累计中奖次数
    /// 
    /// 类型: u64 (8字节)
    /// 
    /// 说明:
    /// - 累计中奖的总次数
    /// - 用于统计和分析
    pub total_wins: u64,
    
    /// 累计发放奖金
    /// 
    /// 类型: u64 (8字节)
    /// 
    /// 说明:
    /// - 累计发放给中奖者的奖金总额
    /// - 用于统计和分析
    pub total_payouts: u64,
    
    /// 税收用于奖池的比例（basis points，4000=40%，400=4%）
    /// 
    /// 类型: u16 (2字节)
    /// 
    /// 说明:
    /// - 可动态调整，范围: 400-4000 (4%-40%)
    /// - 默认值: 4000 (40%)
    /// - 管理员可以通过指令调整
    pub jackpot_ratio_bps: u16,
    
    /// 奖金保留比例（basis points，2000=20%）
    /// 
    /// 类型: u16 (2字节)
    /// 
    /// 说明:
    /// - 每次开奖后，保留20%在奖池中，防止掏空
    /// - 默认值: 2000 (20%)
    pub reserve_ratio_bps: u16,
    
    /// 最后更新时间戳
    /// 
    /// 类型: i64 (8字节，Unix时间戳)
    /// 
    /// 说明:
    /// - 记录奖池最后更新的时间
    /// - 用于审计和统计
    pub last_updated: i64,
    
    /// PDA Bump种子
    /// 
    /// 类型: u8 (1字节)
    /// 
    /// 说明:
    /// - 用于PDA派生的bump值
    /// - 确保账户地址的确定性
    /// - 在账户创建时自动计算
    pub bump: u8,
    
    /// 上次开奖时间戳
    /// 
    /// 类型: i64 (8字节，Unix时间戳)
    /// 
    /// 说明:
    /// - 记录上次开奖的时间
    /// - 用于计算实际开奖间隔
    /// - 0表示从未开过奖
    pub last_win_time: i64,
    
    /// 上次开奖后的交易数量
    /// 
    /// 类型: u64 (8字节)
    /// 
    /// 说明:
    /// - 自上次开奖以来累计的交易数量
    /// - 用于难度调整计算
    /// - 每次开奖后重置为0
    pub transactions_since_last_win: u64,
    
    /// 目标开奖间隔（秒，例如86400=24小时）
    /// 
    /// 类型: i64 (8字节)
    /// 
    /// 说明:
    /// - 期望的开奖时间间隔
    /// - 用于动态难度调整
    /// - 默认值: 86400 (24小时)
    pub target_win_interval: i64,
    
    /// 当前哈希难度位数（前N位必须为0）
    /// 
    /// 类型: u8 (1字节)
    /// 
    /// 说明:
    /// - 用于第一阶段哈希特征预筛选
    /// - 范围: 8-32位
    /// - 初始值: 16位
    /// - 难度越高，通过预筛选的交易越少
    pub hash_difficulty_bits: u8,
}

impl JackpotAccount {
    /// 计算账户所需空间
    /// 
    /// 返回奖池账户所需的总字节数，用于账户初始化时的空间分配。
    /// 
    /// 总大小: 82 字节
    pub const LEN: usize = 8 + // discriminator (Anchor自动添加)
        8 + // balance (u64)
        8 + // difficulty (u64)
        8 + // base_difficulty (u64)
        8 + // total_transactions (u64)
        8 + // total_wins (u64)
        8 + // total_payouts (u64)
        2 + // jackpot_ratio_bps (u16)
        2 + // reserve_ratio_bps (u16)
        8 + // last_updated (i64)
        1 + // bump (u8)
        8 + // last_win_time (i64)
        8 + // transactions_since_last_win (u64)
        8 + // target_win_interval (i64)
        1; // hash_difficulty_bits (u8)
    
    /// 计算动态难度
    /// 
    /// 根据奖池余额和交易次数动态调整难度，实现类似比特币算力的机制。
    /// 
    /// # 参数
    /// * `pool_balance` - 当前奖池余额（基础单位）
    /// * `total_transactions` - 累计交易次数
    /// 
    /// # 返回值
    /// * `Result<u64>` - 计算出的难度值
    /// 
    /// # 公式
    /// ```
    /// difficulty = base_difficulty * (1 + pool_factor) * (1 + tx_factor)
    /// 
    /// 其中:
    /// - pool_factor = (balance / 1T) * 0.1  // 奖池越大，难度越高
    /// - tx_factor = (total_tx / 10K) * 0.05  // 交易越多，难度越高
    /// ```
    /// 
    /// # 动态平衡
    /// - 当奖池余额低于阈值时，降低难度（增加中奖概率）
    /// - 当奖池余额高于阈值时，提高难度（降低中奖概率）
    /// - 确保奖池不会无限增长或完全掏空
    pub fn calculate_difficulty(
        &self,
        pool_balance: u64,
        total_transactions: u64,
    ) -> Result<u64> {
        let base = self.base_difficulty as f64;
        
        // 奖池大小因子（奖池越大，难度越高）
        // 公式: pool_factor = 1 + (balance / 1_000_000_000_000) * 0.1
        // 例如：奖池1M TOT，factor = 1.1；奖池10M TOT，factor = 2.0
        let pool_balance_f64 = pool_balance as f64;
        let pool_factor = 1.0 + (pool_balance_f64 / 1_000_000_000_000.0) * 0.1;
        
        // 交易次数因子（交易越多，难度越高，类似比特币算力增长）
        // 公式: tx_factor = 1 + (total_transactions / 10000) * 0.05
        // 例如：1万次交易，factor = 1.05；10万次交易，factor = 1.5
        let tx_count_f64 = total_transactions as f64;
        let tx_factor = 1.0 + (tx_count_f64 / 10000.0) * 0.05;
        
        // 最终难度 = 基础难度 * 奖池因子 * 交易因子
        let difficulty_f64 = base * pool_factor * tx_factor;
        
        // 转换为u64，确保至少为1
        let difficulty = difficulty_f64 as u64;
        Ok(std::cmp::max(difficulty, 1))
    }
    
    /// 计算奖金分配
    /// 
    /// 根据奖池余额计算中奖者奖金和保留金额。
    /// 
    /// # 参数
    /// * `pool_balance` - 当前奖池余额（基础单位）
    /// 
    /// # 返回值
    /// * `Result<(u64, u64)>` - (中奖者奖金, 保留金额)
    /// 
    /// # 分配规则
    /// - **中奖者**: 获得可分配金额的80%
    /// - **奖池保留**: 保留20% + 最小保留阈值
    /// - **最小保留**: 如果奖池余额低于最小阈值（1000 TOT），不开奖
    /// 
    /// # 防掏空机制
    /// 1. 最小保留阈值: 奖池余额低于1000 TOT时不开奖
    /// 2. 保留比例: 每次开奖保留20%在奖池中
    /// 3. 动态调整: 当奖池余额过低时，自动降低难度（增加中奖概率）
    pub fn calculate_payout(&self, pool_balance: u64) -> Result<(u64, u64)> {
        // 最小保留阈值（1000 TOT）
        let min_reserve = 1_000_000_000_000u64; // 1000 TOT (基础单位)
        
        // 检查最小保留阈值
        if pool_balance < min_reserve {
            return Ok((0, pool_balance)); // 不开奖，全部保留
        }
        
        // 计算可分配金额（总余额 - 最小保留）
        let distributable = pool_balance
            .checked_sub(min_reserve)
            .ok_or(anchor_lang::error!(crate::errors::TotError::MathUnderflow))?;
        
        // 计算中奖者奖金（80%的可分配金额）
        let winner_payout = calculate_bps(distributable, 8000)?;
        
        // 计算保留金额（20%的可分配金额 + 最小保留）
        let reserve_from_distributable = distributable
            .checked_sub(winner_payout)
            .ok_or(anchor_lang::error!(crate::errors::TotError::MathUnderflow))?;
        
        let reserve = reserve_from_distributable
            .checked_add(min_reserve)
            .ok_or(anchor_lang::error!(crate::errors::TotError::MathOverflow))?;
        
        Ok((winner_payout, reserve))
    }
    
    /// 检查是否中奖
    /// 
    /// 根据随机数和当前难度判断是否中奖。
    /// 
    /// # 参数
    /// * `random_value` - 生成的随机数
    /// 
    /// # 返回值
    /// * `bool` - `true`表示中奖，`false`表示未中奖
    /// 
    /// # 中奖条件
    /// random_value % difficulty == 0
    /// 
    /// # 中奖概率
    /// 1 / difficulty
    /// 例如: difficulty = 1000，中奖概率 = 0.1%
    pub fn check_win(&self, random_value: u64) -> bool {
        // 如果难度为0，防止除零错误
        if self.difficulty == 0 {
            return false;
        }
        
        // 中奖条件: random_value % difficulty == 0
        random_value % self.difficulty == 0
    }
    
    /// 更新难度
    /// 
    /// 根据当前奖池余额和交易次数重新计算难度。
    /// 
    /// # 参数
    /// * `pool_balance` - 当前奖池余额
    /// 
    /// # 返回值
    /// * `Result<()>` - 成功返回Ok(())，失败返回相应错误
    pub fn update_difficulty(&mut self, pool_balance: u64) -> Result<()> {
        let new_difficulty = self.calculate_difficulty(pool_balance, self.total_transactions)?;
        self.difficulty = new_difficulty;
        Ok(())
    }
    
    /// 检查交易哈希是否满足难度要求（第一阶段预筛选）
    /// 
    /// 使用交易哈希的前N位作为初步筛选，类似比特币挖矿。
    /// 只有当哈希前N位全为0时，才返回true，进入完整中奖检查。
    /// 
    /// # 参数
    /// * `transaction_hash` - 交易哈希（32字节）
    /// 
    /// # 返回值
    /// * `bool` - `true`表示通过预筛选，可以进入完整检查
    /// 
    /// # 说明
    /// - 如果`hash_difficulty_bits == 0`，所有交易都通过预筛选（兼容旧逻辑）
    /// - 难度越高（位数越多），通过预筛选的交易越少
    /// - 这一步计算量极小，几乎不消耗gas
    pub fn check_hash_difficulty(&self, transaction_hash: &[u8; 32]) -> bool {
        if self.hash_difficulty_bits == 0 {
            return true; // 难度为0，所有交易都通过
        }
        
        // 计算需要检查的完整字节数
        let full_bytes = self.hash_difficulty_bits / 8;
        
        // 检查完整的字节（必须全为0）
        for i in 0..full_bytes.min(32) {
            if transaction_hash[i] != 0 {
                return false; // 不满足难度要求
            }
        }
        
        // 检查最后一个不完整的字节（如果有）
        let remaining_bits = self.hash_difficulty_bits % 8;
        if remaining_bits > 0 && full_bytes < 32 {
            // 检查该字节的前N位是否为0
            // 例如：如果remaining_bits = 4，检查前4位（高4位）是否为0
            // 我们需要检查高4位是否为0，即 (hash[i] >> 4) == 0
            let shift = 8 - remaining_bits;
            if (transaction_hash[full_bytes] >> shift) != 0 {
                return false; // 不满足难度要求
            }
        }
        
        true // 通过预筛选
    }
    
    /// 计算并更新哈希难度位数
    /// 
    /// 根据上次开奖后的时间间隔和交易数量动态调整难度。
    /// 类似比特币的难度调整，但基于时间间隔而非区块时间。
    /// 
    /// # 参数
    /// * `current_time` - 当前时间戳
    /// * `target_interval` - 目标开奖间隔（秒）
    /// 
    /// # 返回值
    /// * `Result<u8>` - 新的哈希难度位数（8-32）
    /// 
    /// # 说明
    /// - 如果实际间隔 > 目标间隔，降低难度（减少位数）
    /// - 如果实际间隔 < 目标间隔，提高难度（增加位数）
    /// - 同时考虑交易数量的影响
    pub fn calculate_hash_difficulty(
        &mut self,
        current_time: i64,
        target_interval: i64,
    ) -> Result<u8> {
        use crate::errors::TotError;
        
        // 如果从未开过奖，使用初始难度
        if self.last_win_time == 0 {
            return Ok(16); // 初始难度：前16位必须为0
        }
        
        // 计算实际开奖间隔
        let actual_interval = current_time
            .checked_sub(self.last_win_time)
            .ok_or(anchor_lang::error!(TotError::MathUnderflow))?;
        
        // 计算难度调整因子
        // 如果实际间隔 > 目标间隔，降低难度（减少位数）
        // 如果实际间隔 < 目标间隔，提高难度（增加位数）
        let ratio = actual_interval as f64 / target_interval as f64;
        
        // 考虑交易数量的影响
        // 如果交易多但没开奖，进一步降低难度
        let tx_factor = if self.transactions_since_last_win > 0 {
            let expected_tx = (target_interval as f64 / 10.0) as u64; // 假设平均每10秒一笔交易
            let tx_ratio = self.transactions_since_last_win as f64 / expected_tx.max(1) as f64;
            if tx_ratio > 1.0 {
                ratio / tx_ratio.min(2.0) // 最多降低50%难度
            } else {
                ratio
            }
        } else {
            ratio
        };
        
        // 计算新的难度位数
        // 难度调整公式：new_bits = old_bits * (1 / tx_factor)
        // 但限制在合理范围内（8-32位）
        let current_bits = self.hash_difficulty_bits as f64;
        let new_bits_f64 = current_bits / tx_factor.max(0.5).min(2.0);
        let new_bits = new_bits_f64 as u8;
        
        // 限制难度范围（8-32位）
        let clamped_bits = new_bits.max(8).min(32);
        
        self.hash_difficulty_bits = clamped_bits;
        Ok(clamped_bits)
    }
}
