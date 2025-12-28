# TWS 拍卖系统整合说明

## 整合完成

拍卖系统已成功整合到 TWS 主项目中，现在可以通过 `/auction` 路由访问。

## 功能特性

- ✅ 共享 TWS 用户登录状态（使用 AuthContext）
- ✅ 共享 Solana 钱包连接状态（使用 SolanaWalletContext）
- ✅ 单屏交互设计
- ✅ 实时弹幕系统
- ✅ 溢价 10% 抢夺机制
- ✅ TWSCoin (SPL Token) 支付

## 环境变量配置

在 Zeabur 部署时，需要在**前端服务**的环境变量中添加以下配置：

```env
# Solana 网络配置
VITE_SOLANA_NETWORK=devnet
# 或生产环境使用: VITE_SOLANA_NETWORK=mainnet-beta

# Solana RPC URL（可选，如果不提供则使用默认的 clusterApiUrl）
# VITE_SOLANA_RPC_URL=https://api.devnet.solana.com

# TWSCoin SPL Token 配置
VITE_TWS_TOKEN_MINT=ZRGboZN3K6JZYhGe8PHDcazwKuqhgp2tTG7h8G5fKGk
VITE_TWS_TOKEN_DECIMALS=9

# TWS 财库地址（接收 5% 抽水）
VITE_TWS_TREASURY_ADDRESS=你的财库Solana地址

# 财库的 TWSCoin Token Account 地址（可选）
# VITE_TWS_TREASURY_TOKEN_ACCOUNT=
```

## 文件结构

```
tws/
├── src/
│   ├── auction/                    # 拍卖系统目录
│   │   ├── components/
│   │   │   ├── AuctionCard.jsx     # 核心资产卡片
│   │   │   ├── AuctionHeader.jsx   # 拍卖页面头部
│   │   │   ├── BarrageSystem.jsx   # 弹幕系统
│   │   │   └── TauntInput.jsx      # 留言输入组件
│   │   ├── hooks/
│   │   │   └── useAuction.js       # 拍卖逻辑 Hook
│   │   ├── utils/
│   │   │   ├── solana.js           # Solana 工具函数
│   │   │   └── soundManager.js     # 音效管理器
│   │   └── AuctionPage.jsx         # 主页面组件
│   ├── contexts/
│   │   └── SolanaWalletContext.jsx # Solana 钱包共享 Context
│   └── ...
```

## 访问方式

1. **从导航栏访问**：点击导航栏中的"拍賣 | AUCTION"按钮
2. **直接访问**：访问 `/auction` 路由
3. **自动登录检查**：如果未登录，会自动跳转到登录页面，登录后返回拍卖页面

## 状态共享

### 用户登录状态
- 使用 `useAuth()` Hook 获取
- 与 TWS 主站完全共享，一次登录，全站可用

### Solana 钱包状态
- 使用 `useWallet()` Hook 获取（来自 `@solana/wallet-adapter-react`）
- 在 TWS 主站连接钱包后，拍卖页面自动识别
- 钱包连接状态全局共享

## Zeabur 部署配置

### 前端服务配置

1. **Root Directory**: `tws`
2. **Build Command**: `npm install && npm run build`
3. **Output Directory**: `dist`
4. **环境变量**（在 Zeabur 控制台配置）：
   - `VITE_API_BASE_URL` = `https://tws-backend.zeabur.app`
   - `VITE_SOLANA_NETWORK` = `devnet` 或 `mainnet-beta`
   - `VITE_TWS_TOKEN_MINT` = `ZRGboZN3K6JZYhGe8PHDcazwKuqhgp2tTG7h8G5fKGk`
   - `VITE_TWS_TOKEN_DECIMALS` = `9`
   - `VITE_TWS_TREASURY_ADDRESS` = 你的财库地址

### 后端服务配置

保持不变，Root Directory: `tws/server`

## 测试清单

- [ ] 访问 `/auction` 路由正常
- [ ] 未登录时自动跳转到登录页
- [ ] 登录后可以正常访问拍卖页面
- [ ] Solana 钱包可以连接
- [ ] 余额显示正常
- [ ] 弹幕系统运行正常
- [ ] 出价功能正常（需要 TWS Token）

## 注意事项

1. **依赖安装**：确保运行 `npm install` 安装所有新依赖
2. **环境变量**：所有 `VITE_` 开头的变量需要在构建时配置
3. **钱包连接**：用户需要在浏览器中安装 Phantom 或 Solflare 钱包扩展
4. **Token 余额**：出价需要用户钱包中有足够的 TWSCoin

