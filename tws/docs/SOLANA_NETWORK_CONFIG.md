# Solana 网络配置指南

## 📋 概述

本项目提供了统一的网络配置系统，可以轻松在 **devnet（测试网）** 和 **mainnet-beta（主网）** 之间切换。

## 🎯 快速切换

### 方法 1: 修改配置文件（推荐）

1. **编辑配置文件** `tws/solana.config.js`：
   ```javascript
   CLUSTER: 'mainnet-beta',  // 改为 'devnet' 或 'mainnet-beta'
   ```

2. **运行配置脚本**：
   ```bash
   npm run solana:config
   ```

3. **部署**：
   ```bash
   npm run solana:deploy
   ```

### 方法 2: 使用快速切换命令

```bash
# 切换到主网
npm run solana:switch:mainnet

# 切换到测试网
npm run solana:switch:devnet
```

### 方法 3: 使用环境变量

```bash
# 主网
export SOLANA_CLUSTER=mainnet-beta
npm run solana:config
npm run solana:deploy

# 测试网
export SOLANA_CLUSTER=devnet
npm run solana:config
npm run solana:deploy
```

## 📁 配置文件说明

### `solana.config.js`

这是主要的配置文件，位于项目根目录：

```javascript
module.exports = {
  // 网络模式: 'devnet' 或 'mainnet-beta'
  CLUSTER: 'mainnet-beta',  // 修改这里切换网络
  
  // 自定义 RPC（可选）
  RPC_URL: null,  // 设置为 null 使用默认端点
  
  // 钱包路径
  WALLET_PATH: '~/.config/solana/id.json',
  
  // ... 其他配置
};
```

### `Anchor.toml`

Anchor 框架的配置文件，会被 `setup-solana-network.js` 自动更新：

```toml
[provider]
cluster = "mainnet-beta"  # 自动同步 solana.config.js 的设置
```

## 🔧 可用命令

| 命令 | 说明 |
|------|------|
| `npm run solana:config` | 显示当前配置并更新 Anchor.toml |
| `npm run solana:switch:mainnet` | 快速切换到主网 |
| `npm run solana:switch:devnet` | 快速切换到测试网 |
| `npm run solana:build` | 构建 Solana 程序 |
| `npm run solana:deploy` | 使用当前配置部署 |
| `npm run solana:deploy:devnet` | 强制部署到测试网 |
| `npm run solana:deploy:mainnet` | 强制部署到主网 |

## ⚠️ 重要提示

### 主网部署注意事项

1. **需要真实 SOL**: 主网部署需要约 2-3 SOL
2. **不可撤销**: 部署后程序不可升级
3. **充分测试**: 务必在 devnet 充分测试后再部署主网
4. **检查余额**: 部署前检查 `solana balance`

### 测试网部署

1. **免费测试**: devnet 提供免费测试 SOL
2. **获取测试币**: `solana airdrop 2`
3. **安全测试**: 可以随意测试，不会影响真实资产

## 📝 部署流程

### 主网部署流程

```bash
# 1. 切换到主网配置
npm run solana:switch:mainnet

# 2. 配置 Solana CLI
solana config set --url mainnet-beta

# 3. 检查余额（需要真实 SOL）
solana balance

# 4. 构建程序
npm run solana:build

# 5. 部署程序
npm run solana:deploy:mainnet
```

### 测试网部署流程

```bash
# 1. 切换到测试网配置
npm run solana:switch:devnet

# 2. 配置 Solana CLI
solana config set --url devnet

# 3. 获取测试 SOL
solana airdrop 2

# 4. 构建程序
npm run solana:build

# 5. 部署程序
npm run solana:deploy:devnet
```

## 🔍 验证配置

运行配置脚本查看当前设置：

```bash
npm run solana:config
```

输出示例：
```
📋 当前 Solana 配置:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   网络模式: mainnet-beta
   网络名称: 主网 (Mainnet)
   RPC URL:  https://api.mainnet-beta.solana.com
   生产模式: 是 ⚠️
   钱包路径: ~/.config/solana/id.json
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🌐 自定义 RPC

如果需要使用自定义 RPC 端点（如 Helius、QuickNode 等）：

1. **编辑 `solana.config.js`**：
   ```javascript
   RPC_URL: 'https://your-custom-rpc-url.com',
   ```

2. **运行配置**：
   ```bash
   npm run solana:config
   ```

## 📚 相关文档

- [详细部署文档](./SOLANA_DEPLOYMENT.md)
- [快速开始指南](./SOLANA_QUICKSTART.md)
- [实现总结](./SOLANA_IMPLEMENTATION_SUMMARY.md)

## 🐛 常见问题

### Q: 如何确认当前使用的是哪个网络？

A: 运行 `npm run solana:config` 查看当前配置。

### Q: 部署到主网后如何切换回测试网？

A: 运行 `npm run solana:switch:devnet`，然后重新部署。

### Q: 可以使用不同的钱包吗？

A: 可以，在 `solana.config.js` 中修改 `WALLET_PATH`，或设置环境变量 `SOLANA_WALLET_PATH`。

### Q: 配置更新后需要重新构建吗？

A: 不需要，配置只影响部署目标。但如果修改了程序代码，需要重新构建。

