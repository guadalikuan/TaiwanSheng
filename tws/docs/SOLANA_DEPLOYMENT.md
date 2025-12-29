# Solana 智能合约部署指南

本文档说明如何将 TWS 智能合约部署到 Solana 区块链，并与已存在的 TWSCoin 集成。

## 📋 前提条件

### 1. 安装必要工具

```bash
# 安装 Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# 安装 Anchor 框架
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# 安装 Rust（如果还没有）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. 配置 Solana 钱包

```bash
# 创建新钱包（如果还没有）
solana-keygen new

# 或使用现有钱包
# 钱包文件位置: ~/.config/solana/id.json

# 设置网络（开发环境）
solana config set --url devnet

# 获取测试 SOL（仅 devnet）
solana airdrop 2
```

### 3. 安装项目依赖

```bash
cd tws
npm install
```

## 🏗️ 项目结构

部署后的项目结构：

```
tws/
├── Anchor.toml                 # Anchor 配置文件
├── programs/
│   └── tws-asset/
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs          # Solana 程序代码
├── scripts/
│   ├── deploy-solana.js        # 部署脚本
│   └── initialize-bunker.js    # 初始化地堡脚本
├── target/                     # 编译输出
│   ├── deploy/
│   └── idl/
└── deployments/                # 部署信息
```

## 🚀 部署步骤

### 步骤 1: 生成程序密钥对

```bash
# 进入项目目录
cd tws

# 生成程序密钥对（如果还没有）
solana-keygen new -o target/deploy/tws_asset-keypair.json
```

### 步骤 2: 更新程序 ID

1. 获取生成的程序 ID：
```bash
solana-keygen pubkey target/deploy/tws_asset-keypair.json
```

2. 更新以下文件中的程序 ID：
   - `Anchor.toml` - 更新 `[programs.devnet]` 和 `[programs.mainnet-beta]` 部分
   - `programs/tws-asset/src/lib.rs` - 更新 `declare_id!()` 宏

### 步骤 3: 构建程序

```bash
# 构建 Solana 程序
anchor build

# 或使用 npm 脚本
npm run solana:build
```

### 步骤 4: 部署到 Devnet（测试）

```bash
# 部署到 devnet
anchor deploy --provider.cluster devnet

# 或使用 npm 脚本
npm run solana:deploy:devnet

# 或使用部署脚本
node scripts/deploy-solana.js
```

### 步骤 5: 验证部署

```bash
# 检查程序是否已部署
solana program show <PROGRAM_ID>

# 查看部署信息
cat deployments/solana-devnet.json
```

### 步骤 6: 初始化地堡资产

```bash
# 设置环境变量
export BUNKER_ID=1
export SECTOR_CODE="CN-NW-CAPITAL"
export TOTAL_SHARES=80000

# 运行初始化脚本
node scripts/initialize-bunker.js
```

## 🌐 部署到主网（Mainnet）

⚠️ **警告**: 主网部署需要真实 SOL，且不可撤销。请确保：

1. 代码已充分测试
2. 有足够的 SOL 支付部署费用（约 2-3 SOL）
3. 已备份所有密钥

```bash
# 切换到主网
solana config set --url mainnet-beta

# 确认配置
solana config get

# 部署到主网
anchor deploy --provider.cluster mainnet-beta

# 或使用 npm 脚本
npm run solana:deploy:mainnet
```

## 🔧 环境变量配置

在 `.env` 文件中添加以下配置：

```env
# Solana 配置
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WALLET_PATH=~/.config/solana/id.json

# 主网配置（生产环境）
# SOLANA_CLUSTER=mainnet-beta
# SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# 程序配置
PROGRAM_ID=<你的程序ID>

# 地堡初始化参数（可选）
BUNKER_ID=1
SECTOR_CODE=CN-NW-CAPITAL
TOTAL_SHARES=80000
```

## 📝 重要信息

### TWSCoin 信息

- **铸造地址**: `ZRGboZN3K6JZYhGe8PHDcazwKuqhgp2tTG7h8G5fKGk`
- **已通过**: Solana Token Creator 创建
- **状态**: 已在主网部署

### 程序功能

1. **initialize_bunker**: 初始化地堡资产账户
2. **mint_bunker_shares**: 使用 TWSCoin 铸造资产份额
3. **trigger_unification**: 触发统一事件（仅授权地址）
4. **set_oracle_address**: 设置预言机地址
5. **redeem_property**: 赎回资产（统一后可用）

## 🔍 测试

```bash
# 运行 Anchor 测试
anchor test

# 或使用 npm 脚本
npm run solana:test
```

## 🐛 常见问题

### 1. 部署失败：余额不足

```bash
# 检查余额
solana balance

# 获取测试 SOL（仅 devnet）
solana airdrop 2
```

### 2. 程序 ID 不匹配

确保 `Anchor.toml` 和 `lib.rs` 中的程序 ID 一致。

### 3. 找不到 IDL 文件

运行 `anchor build` 生成 IDL 文件。

### 4. 钱包文件不存在

```bash
# 创建新钱包
solana-keygen new

# 或指定钱包路径
export SOLANA_WALLET_PATH=/path/to/your/wallet.json
```

## 📚 相关文档

- [Solana 官方文档](https://docs.solana.com/)
- [Anchor 框架文档](https://www.anchor-lang.com/)
- [SPL Token 文档](https://spl.solana.com/token)

## 🔐 安全注意事项

1. **永远不要**将私钥提交到版本控制系统
2. 使用环境变量存储敏感信息
3. 在生产环境使用硬件钱包
4. 定期备份密钥文件
5. 在部署前充分测试

## 📞 支持

如有问题，请查看：
- 项目文档: `docs/`
- 部署日志: `deployments/`
- 程序日志: 使用 `solana logs` 命令


