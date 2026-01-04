# Solana 部署快速开始指南

## 🚀 快速部署步骤

### 1. 安装依赖工具

```bash
# 安装 Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# 安装 Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

### 2. 配置环境

```bash
# 设置 devnet
solana config set --url devnet

# 获取测试 SOL
solana airdrop 2

# 安装项目依赖
cd tws
npm install
```

### 3. 生成程序密钥对

```bash
# 生成程序密钥对
solana-keygen new -o target/deploy/tws_asset-keypair.json

# 获取程序 ID
solana-keygen pubkey target/deploy/tws_asset-keypair.json
```

### 4. 更新程序 ID

将上一步获取的程序 ID 更新到：
- `Anchor.toml` - 两处 `[programs.devnet]` 和 `[programs.mainnet-beta]`
- `programs/tws-asset/src/lib.rs` - `declare_id!()` 宏

### 5. 构建和部署

```bash
# 构建程序
anchor build

# 部署到 devnet
anchor deploy --provider.cluster devnet

# 或使用脚本
node scripts/deploy-solana.js
```

### 6. 初始化地堡

```bash
# 设置参数
export BUNKER_ID=1
export SECTOR_CODE="CN-NW-CAPITAL"
export TOTAL_SHARES=80000

# 初始化
node scripts/initialize-bunker.js
```

## ✅ 验证部署

```bash
# 检查程序
solana program show <PROGRAM_ID>

# 查看部署信息
cat deployments/solana-devnet.json
```

## 📝 重要提示

- **TWSCoin 地址**: `ZRGboZN3K6JZYhGe8PHDcazwKuqhgp2tTG7h8G5fKGk`
- **程序已配置**: 自动使用上述 TWSCoin 地址
- **测试环境**: 使用 devnet 进行测试
- **生产环境**: 确认无误后部署到 mainnet-beta

## 🔗 相关文档

详细文档请参考: [SOLANA_DEPLOYMENT.md](./SOLANA_DEPLOYMENT.md)



