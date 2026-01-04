# 拍卖功能实现文档

## ✅ 已完成的功能

### 1. 智能合约功能

已在 `tws-asset` 程序中添加以下拍卖功能：

#### `initialize_auction`
- 初始化拍卖资产账户
- 设置起拍价和初始留言
- 关联 TWSCoin 和 TWS 财库地址

#### `seize_asset`
- **10% 溢价机制**：出价必须 >= 当前价格 * 1.1
- **自动分账**：
  - 5% 转给 TWS 财库（平台抽水）
  - 95% 转给上一任房主（本金 + 利润）
- **主权移交**：更新资产所有者和价格
- **留言功能**：支持嘲讽留言（最大 100 字符）

### 2. 后端服务方法

在 `server/utils/solanaBlockchain.js` 中添加：

- `initializeAuction()` - 初始化拍卖
- `seizeAsset()` - 夺取资产
- `getAuctionInfo()` - 查询拍卖信息

### 3. 部署脚本

- `scripts/initialize-auction.js` - 拍卖初始化脚本

## 📋 使用方法

### 初始化拍卖

```bash
# 设置环境变量
export ASSET_ID=1
export START_PRICE=1000  # 1000 TWSCoin (最小单位，9 decimals)
export TAUNT_MESSAGE="此房产已被TWS接管"
export TREASURY_ADDRESS="<TWS财库地址>"

# 运行初始化脚本
node scripts/initialize-auction.js
```

### 前端调用示例

```javascript
import { initializeAuction, seizeAsset, getAuctionInfo } from './server/utils/solanaBlockchain.js';

// 初始化拍卖
const result = await initializeAuction(
  1,                    // assetId
  1000,                 // startPrice (TWSCoin)
  "此房产已被TWS接管",  // tauntMessage
  authorityAddress,     // authority
  treasuryAddress       // treasury
);

// 查询拍卖信息
const info = await getAuctionInfo(1);
console.log('当前价格:', info.price);
console.log('最低出价:', info.minRequired); // 当前价格 * 1.1
console.log('当前房主:', info.owner);

// 夺取资产（10%溢价）
const seizeResult = await seizeAsset(
  1,                    // assetId
  "210% 数学补习班",    // bidMessage
  userAddress,          // userAddress
  treasuryAddress       // treasuryAddress
);
```

## 🔧 核心机制

### 10% 溢价规则

每次出价必须比当前价格高至少 10%：

```
最低出价 = 当前价格 × 1.1
```

### 自动分账

当有人出价时，资金自动分配：

```
总支付 = 最低出价
TWS 财库 = 总支付 × 5%
上一任房主 = 总支付 × 95%
```

这意味着上一任房主会获得：
- 本金：原支付金额
- 利润：约 4.5%（扣除 5% 平台费后）

### 留言功能

每次夺取资产时可以添加一条留言（最大 100 字符），这条留言会显示在资产上，直到下一个人夺取。

## 📝 数据结构

### AuctionAsset 账户

```rust
pub struct AuctionAsset {
    pub owner: Pubkey,              // 当前持有者
    pub price: u64,                 // 当前价格 (TWSCoin, 9 decimals)
    pub taunt_message: String,      // 嘲讽留言 (最大 100 字符)
    pub asset_id: u64,              // 资产ID
    pub created_at: i64,            // 创建时间
    pub last_seized_at: i64,        // 最后被夺取时间
    pub bump: u8,                   // PDA bump
    pub twscoin_mint: Pubkey,       // TWSCoin 铸造地址
    pub treasury: Pubkey,           // TWS 财库地址
}
```

## ⚠️ 重要注意事项

1. **TWSCoin 精度**：TWSCoin 使用 9 位小数，计算时需要注意单位
2. **财库地址**：需要配置 TWS 财库的 TWSCoin 账户地址
3. **账户验证**：确保旧房主的 Token 账户地址正确传递
4. **留言长度**：限制 `taunt_message` 最大长度为 100 字符
5. **价格计算**：所有价格计算使用整数，避免浮点数精度问题

## 🚀 部署流程

1. **构建程序**：
   ```bash
   anchor build
   ```

2. **部署程序**：
   ```bash
   npm run solana:deploy
   ```

3. **初始化拍卖**：
   ```bash
   node scripts/initialize-auction.js
   ```

## 🔗 与前端集成

前端拍卖页面可以通过以下方式调用：

```javascript
// 在 React 组件中
import { getAuctionInfo, seizeAsset } from '../server/utils/solanaBlockchain';

// 获取当前拍卖状态
const auctionInfo = await getAuctionInfo(assetId);

// 用户出价
const handleBid = async () => {
  const bidMessage = "我的留言";
  await seizeAsset(assetId, bidMessage, userAddress, treasuryAddress);
};
```

## 📊 事件监听

程序会发出以下事件：

- `AuctionInitialized` - 拍卖初始化
- `AssetSeized` - 资产被夺取

可以通过监听这些事件来实时更新前端状态。

## 🐛 错误处理

程序定义了以下错误码：

- `MathOverflow` - 数学计算溢出
- `InvalidOldOwner` - 无效的旧房主地址
- `MessageTooLong` - 留言过长（>100字符）
- `InvalidTokenMint` - 无效的代币铸造地址

前端应该妥善处理这些错误，给用户友好的提示。



