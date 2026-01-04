# 拍卖功能衔接说明

## ✅ 已完成的衔接

### 1. 后端 API 路由
- ✅ `server/routes/auction.js` - 拍卖 API 路由
- ✅ 已在 `server.js` 中注册：`/api/auction`

### 2. 前端 API 调用
- ✅ `src/utils/api.js` 中添加：
  - `getAuctionInfo(assetId)` - 获取拍卖信息
  - `seizeAuctionAsset(assetId, bidMessage, userAddress, treasuryAddress?)` - 夺取资产
  - `getTWSCoinBalanceAPI(userAddress)` - 获取 TWSCoin 余额

### 3. 前端组件
- ✅ `src/auction/AuctionPage.jsx` - 拍卖页面组件
- ✅ `src/utils/twscoin.js` - TWSCoin 工具函数

### 4. 智能合约
- ✅ 已在 `tws-asset` 程序中实现拍卖功能
- ✅ 使用 TWSCoin 作为支付代币

## 🔗 钱包连接衔接

### 方式 1: 通过事件通知（推荐）

如果您的钱包连接组件已经存在，可以通过自定义事件通知 AuctionPage：

```javascript
// 在钱包连接成功后，触发事件
const walletAddress = '...'; // 用户的钱包地址
window.dispatchEvent(new CustomEvent('walletConnected', {
  detail: { address: walletAddress }
}));

// 同时保存到 localStorage（可选）
localStorage.setItem('solana_wallet_address', walletAddress);
```

AuctionPage 会自动监听这个事件并更新状态。

### 方式 2: 通过 Context 或 Props

如果您的钱包连接是通过 React Context 管理的，可以：

1. **创建钱包 Context**（如果还没有）：
```javascript
// src/contexts/WalletContext.jsx
import { createContext, useContext, useState } from 'react';

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const connectWallet = async () => {
    // 您的钱包连接逻辑
    // ...
    setWalletAddress(address);
    setIsConnected(true);
  };

  return (
    <WalletContext.Provider value={{ walletAddress, isConnected, connectWallet }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
```

2. **在 AuctionPage 中使用**：
```javascript
import { useWallet } from '../contexts/WalletContext';

const AuctionPage = () => {
  const { walletAddress, isConnected } = useWallet();
  // ...
};
```

### 方式 3: 直接修改 AuctionPage

如果您的钱包连接组件在页面中，可以直接修改 AuctionPage 来接收 props：

```javascript
// 修改 AuctionPage 组件签名
const AuctionPage = ({ walletAddress, onWalletConnect }) => {
  // 使用传入的 walletAddress
  // ...
};
```

## 📝 重要配置

### TWSCoin 地址
- **铸造地址**: `ZRGboZN3K6JZYhGe8PHDcazwKuqhgp2tTG7h8G5fKGk`
- **财库地址**: 与铸造地址相同（已在代码中配置）

### API 端点
- 获取拍卖信息: `GET /api/auction/:assetId`
- 夺取资产: `POST /api/auction/:assetId/seize`
- 获取余额: `GET /api/auction/balance/:userAddress`

## 🔧 使用示例

### 在钱包连接组件中

```javascript
// 连接钱包成功后
const handleWalletConnect = async () => {
  // 您的钱包连接逻辑
  const address = await connectSolanaWallet();
  
  // 通知 AuctionPage
  window.dispatchEvent(new CustomEvent('walletConnected', {
    detail: { address }
  }));
  
  // 可选：保存到 localStorage
  localStorage.setItem('solana_wallet_address', address);
};
```

### 在 AuctionPage 中调用 API

```javascript
// 获取拍卖信息
const auctionInfo = await getAuctionInfo(1);

// 夺取资产（不需要传递 treasuryAddress，会自动使用 TWSCoin 铸造地址）
const result = await seizeAuctionAsset(
  1,                    // assetId
  "我的留言",           // bidMessage
  walletAddress,        // userAddress
  null                  // treasuryAddress (可选)
);

// 获取余额
const balance = await getTWSCoinBalanceAPI(walletAddress);
```

## ⚠️ 注意事项

1. **TWSCoin 精度**: 使用 9 位小数，所有价格计算需要注意单位转换
2. **最低出价**: 自动计算为当前价格 × 1.1
3. **财库地址**: 如果不传递 `treasuryAddress`，后端会自动使用 TWSCoin 铸造地址
4. **留言长度**: 最大 100 字符
5. **余额检查**: 前端会检查用户余额是否足够支付最低出价

## 🐛 调试

如果遇到问题，检查：

1. **后端服务是否运行**: `http://localhost:3001`
2. **API 路由是否注册**: 查看 `server.js` 中的路由列表
3. **钱包地址格式**: 确保是有效的 Solana 地址
4. **TWSCoin 余额**: 使用 `getTWSCoinBalanceAPI` 检查余额

## 📞 下一步

1. 确保钱包连接组件能够触发 `walletConnected` 事件
2. 或者修改 AuctionPage 以适配您现有的钱包连接方式
3. 测试完整的流程：连接钱包 → 查看余额 → 出价 → 夺取资产



