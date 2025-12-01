# 环境变量说明

本文档说明 TWS Protocol 应用所需的环境变量。

## 环境变量列表

### 应用配置

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `VITE_APP_NAME` | 应用名称 | `TWS Protocol` | 否 |
| `VITE_APP_VERSION` | 应用版本 | `1.0.0` | 否 |
| `VITE_APP_ENV` | 应用环境 | `development` | 否 |

### API 配置

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `VITE_API_BASE_URL` | API 基础 URL | 空 | 是 |
| `VITE_API_TIMEOUT` | API 请求超时时间（毫秒） | `30000` | 否 |

### 区块链配置

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `VITE_CHAIN_ID` | 链 ID（BSC 主网为 56） | `56` | 否 |
| `VITE_RPC_URL` | RPC 节点 URL | `https://bsc-dataseed.binance.org` | 否 |
| `VITE_CONTRACT_ADDRESS` | 智能合约地址 | 空 | 是（生产环境） |

### 倒计时配置

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `VITE_COUNTDOWN_TARGET` | 倒计时目标日期（Unix 时间戳，毫秒） | `0` | 是（生产环境） |

示例：2027-01-01 00:00:00 UTC 的时间戳为 `1798761600000`

### Telegram 配置

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `VITE_TELEGRAM_BOT_TOKEN` | Telegram Bot Token | 空 | 否 |
| `VITE_TELEGRAM_CHANNEL_ID` | Telegram 频道 ID | 空 | 否 |

### 功能开关

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `VITE_ENABLE_ANALYTICS` | 启用分析 | `false` | 否 |
| `VITE_ENABLE_ERROR_TRACKING` | 启用错误追踪 | `false` | 否 |

### 安全配置

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `VITE_ENABLE_HTTPS_REDIRECT` | 启用 HTTPS 重定向 | `true` | 否 |

## 使用方法

### 开发环境

1. 复制 `.env.example` 为 `.env`
2. 根据需要修改 `.env` 文件中的值
3. 重启开发服务器

### 生产环境

1. 复制 `.env.production.example` 为 `.env.production`
2. 填入生产环境实际值
3. 构建应用：`npm run build:prod`

## 注意事项

1. **所有环境变量必须以 `VITE_` 开头**，这是 Vite 的要求
2. 环境变量在构建时注入，运行时无法修改
3. 不要在代码中硬编码敏感信息
4. 确保 `.env` 文件在 `.gitignore` 中，不要提交到版本控制
5. 生产环境变量应通过 CI/CD 系统或服务器环境变量设置

## 在代码中使用

环境变量通过 `src/config/env.js` 统一管理：

```javascript
import env from './config/env';

console.log(env.apiBaseUrl);
console.log(env.countdownTarget);
```

## 示例配置

### 开发环境 (.env)

```env
VITE_APP_ENV=development
VITE_API_BASE_URL=http://localhost:3000/api
VITE_COUNTDOWN_TARGET=1735689600000
```

### 生产环境 (.env.production)

```env
VITE_APP_ENV=production
VITE_API_BASE_URL=https://api.tws-protocol.xyz/api
VITE_CONTRACT_ADDRESS=0x1234567890abcdef1234567890abcdef12345678
VITE_COUNTDOWN_TARGET=1798761600000
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_TRACKING=true
```

