# TWS Land NFT 展示指南

## 📋 概述

本文档说明 TWS Land NFT 在系统中的展示位置和方式。

---

## 🎨 NFT 展示位置

### 1. **资产市场页面** (`BlackMarket.jsx`)

#### NFT 标识徽章
- **位置**：房源卡片图片左上角
- **样式**：紫色圆形徽章，显示 "NFT" 文字和图标
- **条件**：仅当资产已铸造 NFT 时显示

#### NFT 信息卡片
- **位置**：房源信息区域，在房源属性下方
- **显示内容**：
  - NFT 标题："TWS Land NFT"
  - Token ID（完整显示）
  - 交易哈希链接（可点击跳转到 BSCScan）
- **样式**：紫色主题，带有图标和链接

---

### 2. **资产详情页面** (`AssetDetailPage.jsx`)

#### NFT 信息区块
- **位置**：资产详情网格下方，风险等级上方
- **样式**：大型卡片，紫色边框和背景
- **显示内容**：
  - **Token ID**：完整显示
  - **交易哈希**：完整显示 + 外部链接图标（跳转 BSCScan）
  - **铸造时间**：格式化的日期时间
  - **接收地址**：完整钱包地址

---

### 3. **审核界面** (`AssetComparisonCard.jsx`)

#### NFT 状态显示
- **位置**：脱敏数据区域底部
- **显示内容**：
  - NFT 标题和图标
  - Token ID
  - 交易哈希（截断显示）
  - 铸造时间
- **样式**：紫色边框分隔线，紫色文字

---

## 🔍 NFT 信息字段

### 后端存储字段

```javascript
{
  nftMinted: true,           // 是否已铸造 NFT
  nftTokenId: "1234567890",  // NFT Token ID
  nftTxHash: "0x...",        // 交易哈希
  nftMintedAt: 1234567890,   // 铸造时间戳
  mintedTo: "0x..."          // 接收地址
}
```

### 前端展示字段

- **Token ID**：NFT 的唯一标识符
- **交易哈希**：区块链交易的哈希值
- **铸造时间**：NFT 铸造的日期和时间
- **接收地址**：NFT 接收者的钱包地址

---

## 🎨 视觉设计

### 颜色方案
- **主色**：紫色 (`purple-600`, `purple-700`)
- **背景**：浅紫色 (`purple-50`, `purple-900/20`)
- **边框**：紫色 (`purple-200`, `purple-700`)

### 图标
- **NFT 图标**：`Image` (Lucide React)
- **外部链接**：`ExternalLink` (Lucide React)

---

## 🔗 外部链接

### BSCScan 交易链接
- **格式**：`https://bscscan.com/tx/{txHash}`
- **用途**：查看区块链交易详情
- **位置**：资产市场页面和资产详情页面

---

## 📱 响应式设计

所有 NFT 展示组件都支持响应式布局：
- **桌面端**：完整显示所有信息
- **移动端**：信息自动换行，保持可读性

---

## ✅ 展示条件

### 何时显示 NFT 信息

1. **资产状态为 `AVAILABLE`**
2. **`nftMinted` 字段为 `true`**
3. **至少包含 `nftTokenId` 或 `nftTxHash` 之一**

### 展示优先级

1. **资产市场页面**：显示 NFT 徽章和基本信息
2. **资产详情页面**：显示完整的 NFT 信息
3. **审核界面**：显示 NFT 状态和信息

---

## 🔧 技术实现

### 数据流

```
后端存储 NFT 信息
  ↓
资产数据包含 NFT 字段
  ↓
前端 assetMapper 映射 NFT 字段
  ↓
组件根据 nftMinted 条件渲染
  ↓
显示 NFT 信息和链接
```

### 数据映射

`assetMapper.js` 中的 `mapSanitizedAssetToMarketFormat` 函数会：
- 提取 `sanitized.nftMinted`
- 提取 `sanitized.nftTokenId`
- 提取 `sanitized.nftTxHash`
- 提取 `sanitized.nftMintedAt`
- 提取 `sanitized.mintedTo`

---

## 📝 使用示例

### 查看资产的 NFT 信息

1. **在市场页面**：
   - 寻找带有紫色 "NFT" 徽章的房源卡片
   - 查看卡片中的 NFT 信息区域

2. **在详情页面**：
   - 点击房源卡片进入详情页
   - 查看 "TWS Land NFT" 信息区块

3. **查看链上交易**：
   - 点击交易哈希链接
   - 在新标签页打开 BSCScan 查看交易详情

---

## 🎯 未来优化

1. **NFT 图片展示**：显示 NFT 的元数据图片
2. **NFT 市场链接**：链接到 OpenSea 或其他 NFT 市场
3. **NFT 转移历史**：显示 NFT 的持有者变更历史
4. **NFT 元数据**：展示 NFT 的完整元数据信息

---

**最后更新**：2025-01-27

