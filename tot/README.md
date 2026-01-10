# TOT (TaiOneToken) - Solana智能合约系统

基于《兵易·TOT (TaiOneToken) 2026 绝密发射计划总纲》实现的完整Solana SPL Token-2022代币系统。

## 📋 项目概述

TOT是一个具备"准国家级金融管制能力"的加密资产，基于Solana SPL Token-2022标准构建，具备以下核心特性：

- **代币规格**: TOT (TaiOneToken), 202.7B总量, 9 decimals
- **Token-2022扩展**: Transfer Fee, Permanent Delegate, Freeze Authority, Transfer Hook, Metadata Pointer
- **动态税收模型**: 基于持有时间和交易影响的动态税率计算
- **五大池子分配**: 胜利日基金、历史重铸池、认知作战池、外资统战池、资产锚定池
- **持有者管理**: 追踪持有时间、交易统计、冻结/解冻功能

## 🏗️ 项目结构

```
tot/
├── Anchor.toml                          # Anchor项目配置
├── Cargo.toml                           # 工作空间配置
├── programs/
│   ├── tot-token/                       # 主代币程序
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs                   # 程序入口
│   │       ├── constants.rs             # 常量定义
│   │       ├── errors.rs                 # 错误定义
│   │       ├── state/                    # 状态账户
│   │       ├── instructions/             # 指令实现
│   │       └── utils/                    # 工具模块
│   └── transfer-hook/                   # Transfer Hook程序
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs
│           ├── state.rs
│           └── errors.rs
├── scripts/
│   ├── deploy.ts                        # 部署脚本
│   ├── initialize.ts                   # 初始化脚本
│   └── mint_to_pools.ts                # 铸造脚本
├── tests/
│   └── tot-token.ts                     # 测试文件
├── metadata/
│   └── metadata.json                    # 代币元数据
└── README.md                            # 项目说明
```

## 🚀 快速开始

### 前置要求

1. **安装Solana CLI**
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

2. **安装Anchor框架**
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install latest
   avm use latest
   ```

3. **安装Rust**（如果还没有）
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

### 安装依赖

```bash
cd tot
npm install
```

### 配置环境

```bash
# 设置网络（开发环境）
solana config set --url devnet

# 获取测试SOL（仅devnet）
solana airdrop 2
```

### 构建项目

```bash
# 构建所有程序
anchor build
```

### 部署程序

```bash
# 部署到devnet
anchor deploy --provider.cluster devnet

# 或使用脚本
npm run deploy
```

### 初始化代币系统

```bash
# 初始化TOT代币
npm run initialize

# 铸造代币到池子
npm run mint
```

## 📚 核心功能

### 1. 代币初始化

创建Token-2022 Mint并初始化所有扩展：
- Transfer Fee（交易税）
- Permanent Delegate（永久代理权）
- Freeze Authority（冻结权）
- Transfer Hook（转账钩子）
- Metadata Pointer（元数据指针）

### 2. 五大池子分配

| 池子名称 | 数量 (B) | 百分比 | 锁仓规则 |
|---------|---------|--------|---------|
| 胜利日基金 | 20.27 | 10% | 锁定至2027年1月1日 |
| 历史重铸池 | 19.49 | 9.6% | 初始流动性，LP永久锁定 |
| 认知作战池 | 14.50 | 7.15% | 365天线性释放 |
| 外资统战池 | 7.04 | 3.47% | 多签控制 |
| 资产锚定池 | 141.40 | 69.76% | RWA触发释放 |

### 3. 动态税收模型

实现TOT动态重力场税收模型 (TOT-DGTM)：

**税率公式:**
```
Tax_sell = Base + (P_impact / L) × α + 1/(T_hold + 1)^β × γ
```

**参数:**
- Base: 2% (基础税率)
- α: 5 (惩罚系数)
- β: 0.5 (时间衰减指数)
- γ: 20% (忠诚度权重)

**持有时间折扣:**
- 0-30天: 无折扣
- 30-90天: 10%折扣
- 90-180天: 25%折扣
- 180-365天: 50%折扣
- 365+天: 75%折扣

**税收分配:**
- 40% 销毁
- 30% 流动性池
- 20% 社区奖励
- 10% 营销

### 4. 持有者管理

- 追踪首次持有时间
- 记录累计买入/卖出量
- 计算持有天数
- 支持冻结/解冻功能

### 5. 管理员功能

- 更新管理员权限
- 暂停/恢复系统
- 紧急提取
- 管理税率配置
- 管理免税地址

## 🔧 开发指南

### 添加新指令

1. 在`programs/tot-token/src/instructions/`创建新文件
2. 实现指令处理器
3. 在`instructions/mod.rs`中导出
4. 在`lib.rs`中添加程序入口

### 运行测试

```bash
# 运行所有测试
anchor test

# 运行特定测试
anchor test --skip-local-validator
```

### 代码规范

- 所有函数、结构体、常量都需要详细的中文注释
- 使用Rust的类型系统确保安全性
- 所有数学运算使用checked操作防止溢出
- 完善的错误处理和验证

## 📖 API文档

### 核心指令

#### `initialize`
初始化TOT代币系统，创建Token-2022 Mint并配置所有扩展。

#### `init_pool`
初始化指定类型的池子账户。

#### `mint_to_pools`
一次性铸造202.7B代币到五大池子。

#### `transfer_with_tax`
执行带税转账，自动计算和收取动态税收。

#### `calculate_tax`
计算税率（只读查询），用于前端显示预估税率。

#### `get_holder_stats`
获取持有者统计信息。

## 🔒 安全注意事项

1. **私钥安全**: 部署钱包必须妥善保管，建议使用多签钱包
2. **程序升级**: 程序ID一旦部署不可更改，请谨慎操作
3. **权限管理**: 管理员权限具有最高控制权，请妥善保管
4. **测试环境**: 在生产环境部署前，务必在devnet充分测试

## 📝 许可证

本项目仅供学习和研究使用。

## 🤝 贡献

欢迎提交Issue和Pull Request。

## 📧 联系方式

如有问题，请通过Issue反馈。

---

**2027，使命必达。** 🚀
