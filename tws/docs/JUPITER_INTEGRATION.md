# Jupiter & Helius RPC 市场数据集成文档

## 概述

本项目使用以下数据源获取市场数据：
- **Jupiter Price API**: 用于获取实时价格数据（主要数据源）
- **Helius RPC**: 用于从 Solana 链上获取交易历史（备用，未来扩展）
- **RocksDB 缓存**: 所有市场数据缓存到本地数据库，实现按需最小化拉取

## 数据流架构

```
Jupiter API → 后端API → RocksDB缓存 → 前端显示
                ↓
            SSE实时推送
```

## 环境变量配置

### Helius RPC URL

项目使用 Helius RPC 作为 Solana 节点（已配置在 `SOLANA_RPC_URL` 环境变量中）。

如果未配置，系统会使用默认的 Solana 公共节点。

## API 端点

### 后端市场数据 API

#### 获取实时价格
- **端点**: `GET /api/market/price`
- **返回**: 实时价格、24小时涨跌幅
- **数据源**: Jupiter Price API + RocksDB 缓存

#### 获取 K 线数据
- **端点**: `GET /api/market/kline?interval=1H&from=xxx&to=xxx`
- **参数**:
  - `interval`: 时间间隔 (1m, 5m, 15m, 1H, 4H, 1D)
  - `from`: 开始时间戳（毫秒）
  - `to`: 结束时间戳（毫秒）
- **返回**: K 线数据数组
- **数据源**: RocksDB 缓存（按需从 RPC 拉取）

#### 获取市场统计
- **端点**: `GET /api/market/stats`
- **返回**: 24h成交量、涨跌幅等统计信息
- **数据源**: RocksDB 缓存

#### 手动触发同步
- **端点**: `GET /api/market/sync`
- **用途**: 手动触发数据同步（管理员）

### Jupiter Price API

- **端点**: `https://price.jup.ag/v3/price?ids={tokenAddress}`
- **方法**: GET
- **认证**: 无需认证
- **用途**: 获取代币实时价格和24小时涨跌幅

## 数据缓存策略

### RocksDB 命名空间

- `marketData`: 存储 K 线数据，key 格式：`{interval}:{timestamp}`
- `marketPrice`: 存储实时价格缓存，key: `latest`
- `marketTransactions`: 存储已处理的交易签名（用于增量更新）
- `marketStats`: 存储市场统计信息，key: `latest`

### 缓存更新机制

- **价格数据**: 每10秒从 Jupiter API 更新一次
- **K线数据**: 每1分钟增量更新一次
- **市场统计**: 每次价格更新时重新计算

### 增量更新

- 记录最后处理的交易签名
- 只拉取新交易，避免重复计算
- 按需最小化拉取数据

## 实时推送（SSE）

市场数据通过 Server-Sent Events (SSE) 实时推送到前端：

- **价格更新**: 价格变化超过0.1%时推送
- **市场统计**: 统计信息更新时推送
- **订阅方式**: 前端通过 `subscribe('market', callback)` 订阅

## 数据源切换原因

1. **更好的数据质量**: Jupiter 提供更准确的实时价格
2. **完全自定义**: 可以完全控制 K 线图的渲染和交互
3. **本地缓存**: 使用 RocksDB 缓存，减少外部 API 调用
4. **按需拉取**: 只拉取需要的数据，最小化网络请求
5. **实时推送**: 通过 SSE 实现实时数据更新

## 使用说明

### 开发环境

1. 确保 `SOLANA_RPC_URL` 环境变量已配置（Helius RPC URL）
2. 启动后端服务器：`npm run dev:backend`
3. 启动前端：`npm run dev:frontend`

### 生产环境

1. 在部署平台配置 `SOLANA_RPC_URL` 环境变量
2. 确保后端服务正常运行
3. 前端会自动连接到后端 API

## 错误处理

- 如果 Jupiter API 不可用，价格数据会显示为 `--`
- 如果 RocksDB 缓存为空，会尝试从 RPC 拉取数据
- 网络超时错误会被静默处理，不会影响用户体验
- 开发环境会显示警告信息，生产环境静默处理

## 速率限制

- **Jupiter API**: 无明确限制，但建议不要过于频繁请求（当前：每10秒一次）
- **Helius RPC**: 根据 API 计划有不同限制，建议合理控制请求频率

## 故障排查

### K 线图不显示

1. 检查后端 API 是否正常运行
2. 检查浏览器控制台是否有错误信息
3. 检查网络连接
4. 查看后端日志确认数据是否正常拉取

### 价格数据不更新

1. 检查 Jupiter API 是否可访问
2. 检查后端服务是否正常运行
3. 检查 SSE 连接是否正常
4. 查看浏览器控制台错误信息

### 数据同步问题

1. 检查 `SOLANA_RPC_URL` 是否正确配置
2. 检查 Helius RPC 是否可访问
3. 查看后端日志确认同步任务是否正常运行

## 相关文件

- `tws/server/utils/marketDataService.js` - 市场数据服务（后端）
- `tws/server/routes/market.js` - 市场数据 API 路由
- `tws/server/utils/marketDataTasks.js` - 市场数据后台任务
- `tws/src/utils/jupiterApi.js` - Jupiter API 工具函数（前端，备用）
- `tws/src/components/KlineChart.jsx` - 自定义 K 线图组件
- `tws/src/components/MarketSection.jsx` - 市场数据展示组件

## 未来扩展

- 从 Solana 链上获取交易历史并聚合生成 K 线数据
- 支持更多时间间隔的 K 线数据
- 实现更智能的增量更新机制
- 添加交易池监控功能
