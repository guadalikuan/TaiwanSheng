# 拍卖功能衔接完成总结

## ✅ 已完成的衔接工作

### 1. 后端 API 路由 ✅
- **文件**: `server/routes/auction.js`
- **路由**: `/api/auction`
- **功能**:
  - `GET /api/auction/:assetId` - 获取拍卖信息
  - `POST /api/auction/:assetId/seize` - 夺取资产
  - `GET /api/auction/balance/:userAddress` - 获取 TWSCoin 余额

### 2. 后端服务集成 ✅
- **文件**: `server/utils/solanaBlockchain.js`
- **方法**:
  - `initializeAuction()` - 初始化拍卖
  - `seizeAsset()` - 夺取资产（10%溢价）
  - `getAuctionInfo()` - 查询拍卖信息
  - `getTWSCoinBalance()` - 查询余额

### 3. 前端 API 调用 ✅
- **文件**: `src/utils/api.js`
- **函数**:
  - `getAuctionInfo(assetId)` - 获取拍卖信息
  - `seizeAuctionAsset(assetId, bidMessage, userAddress, treasuryAddress?)` - 夺取资产
  - `getTWSCoinBalanceAPI(userAddress)` - 获取余额

### 4. 前端组件 ✅
- **文件**: `src/auction/AuctionPage.jsx`
- **功能**:
  - 显示拍卖信息（当前价格、房主、留言）
  - 显示最低出价（当前价格 + 10%）
  - 出价输入框（留言功能）
  - 夺取资产按钮
  - 自动刷新拍卖信息（每5秒）
  - 钱包连接状态显示

### 5. 工具函数 ✅
- **文件**: `src/utils/twscoin.js`
- **功能**:
  - `TWSCoin_MINT` - TWSCoin 铸造地址常量
  - `formatTWSCoinBalance()` - 格式化余额显示
  - `calculateMinBid()` - 计算最低出价

### 6. 智能合约 ✅
- **文件**: `programs/tws-asset/src/lib.rs`
- **功能**:
  - `initialize_auction()` - 初始化拍卖
  - `seize_asset()` - 夺取资产（10%溢价机制）
  - 自动分账（5% 财库，95% 上一任房主）

## 🔗 钱包连接衔接方式

AuctionPage 支持以下方式接收钱包连接信息：

### 方式 1: 自定义事件（已实现）

当钱包连接成功后，触发事件：

```javascript
window.dispatchEvent(new CustomEvent('walletConnected', {
  detail: { address: '用户钱包地址' }
}));
```

AuctionPage 会自动监听并更新状态。

### 方式 2: localStorage（已实现）

钱包连接组件可以将地址保存到 localStorage：

```javascript
localStorage.setItem('solana_wallet_address', '用户钱包地址');
```

AuctionPage 会在加载时自动读取。

### 方式 3: 修改组件接收 Props

如果需要，可以修改 AuctionPage 接收 props：

```javascript
<AuctionPage walletAddress={walletAddress} />
```

## 📋 使用流程

### 1. 初始化拍卖（管理员操作）

```bash
export ASSET_ID=1
export START_PRICE=1000  # 1000 TWSCoin (最小单位)
export TAUNT_MESSAGE="此房产已被TWS接管"
node scripts/initialize-auction.js
```

### 2. 用户使用流程

1. **访问页面**: `/auction`
2. **连接钱包**: 点击右上角钱包连接按钮
3. **查看信息**: 
   - 当前价格
   - 当前房主
   - 最低出价（自动计算）
   - TWSCoin 余额
4. **出价**:
   - 输入留言（可选，最大100字符）
   - 点击"立即溢价 10% 强行接管"按钮
   - 确认交易
5. **结果**:
   - 成功：显示交易哈希
   - 失败：显示错误信息

## 🔧 配置说明

### TWSCoin 地址
- **铸造地址**: `ZRGboZN3K6JZYhGe8PHDcazwKuqhgp2tTG7h8G5fKGk`
- **财库地址**: 与铸造地址相同（代码中已自动使用）

### 默认资产 ID
- 当前默认使用 `assetId = 1`
- 可以从 URL 参数或路由参数获取

## ⚠️ 重要提示

1. **财库地址**: 如果不传递 `treasuryAddress`，后端会自动使用 TWSCoin 铸造地址
2. **余额检查**: 前端会检查用户余额是否足够支付最低出价
3. **自动刷新**: 拍卖信息每5秒自动刷新一次
4. **价格计算**: 所有价格使用 9 位小数（TWSCoin 标准）

## 🧪 测试步骤

1. **启动后端服务**:
   ```bash
   cd server
   npm start
   ```

2. **启动前端**:
   ```bash
   npm run dev
   ```

3. **访问页面**: `http://localhost:5173/auction`

4. **测试流程**:
   - 检查页面是否正常加载
   - 连接钱包
   - 查看余额是否正确显示
   - 尝试出价（确保有足够的 TWSCoin）

## 📝 下一步

如果您的钱包连接组件已经存在，只需要：

1. **确保钱包连接后触发事件**:
   ```javascript
   window.dispatchEvent(new CustomEvent('walletConnected', {
     detail: { address: walletAddress }
   }));
   ```

2. **或者保存到 localStorage**:
   ```javascript
   localStorage.setItem('solana_wallet_address', walletAddress);
   ```

AuctionPage 会自动检测并更新状态。

## 🎉 完成状态

✅ 所有衔接工作已完成！
- 后端 API 路由已创建并注册
- 前端 API 调用函数已添加
- AuctionPage 组件已创建
- 钱包连接衔接机制已实现
- TWSCoin 工具函数已创建

现在可以开始测试完整的拍卖流程了！



