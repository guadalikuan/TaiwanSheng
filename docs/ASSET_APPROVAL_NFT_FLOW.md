# 房产入库审核通过后生成 TWS Land NFT 进入资产池流程

## 📋 完整流程概述

```
房产提交 → 审核 → 审核通过 → 自动进入资产池 → 铸造 TWS Land NFT
```

---

## 🔄 详细流程

### 1️⃣ 资产提交阶段

**操作位置**: `/arsenal` (资产入库界面)

**用户操作**:
- 填写房产信息（项目名称、城市、面积、价格等）
- 在地图上标记位置
- 上传房产证或工抵协议
- 提交审核

**系统处理**:
- 保存原始数据到 `rawAssets.json`
- 自动脱敏处理保存到 `sanitizedAssets.json`
- 资产状态: `MINTING`（待审核）

---

### 2️⃣ 审核阶段

**操作位置**: `/command` (审核台)

**审核员操作**:
1. 查看待审核资产列表
2. 选择资产查看详情（原始数据 vs 脱敏数据对比）
3. 点击"批准"按钮

---

### 3️⃣ 审核通过 - 自动进入资产池

**API**: `PUT /api/arsenal/approve/:id`

**自动执行的操作**:

#### ✅ 1. 更新资产状态
- 状态变更: `MINTING` → `AVAILABLE`
- 保存审核记录（审核员、时间、备注）

#### ✅ 2. 自动添加到地图（进入资产池）
```javascript
// 创建资产日志
const assetLog = {
  id: `${Date.now()}-${id}`,
  lot: sanitizedAsset.codeName,  // 资产代号，如 "CN-XI-BKR-4921"
  location: rawAsset.locationAddress,
  timestamp: Date.now(),
  assetId: id,
  nodeName: nodeName,  // 节点名称，如 "XI'AN (Urban Reserve)"
  nodeLocation: { lat, lng },  // 资产位置坐标
  value: rawAsset.debtAmount,  // 资产价值
  status: 'confirmed'
};

// 添加到地图日志（资产池）
addAssetLog(assetLog);
```

**效果**:
- ✅ 资产立即在首页第三屏地图上显示
- ✅ 资产可在首页第四屏资产列表显示
- ✅ 资产可在市场页面 (`/market`) 显示
- ✅ 资产状态为 `AVAILABLE`（可交易）

#### ✅ 3. 自动铸造 NFT（可选）

**条件**:
- `autoMint = true`（默认启用）
- 配置了 `CONTRACT_ADDRESS` 环境变量

**自动执行**:
```javascript
if (autoMint && process.env.CONTRACT_ADDRESS) {
  const toAddress = mintToAddress || req.user?.address || process.env.PLATFORM_WALLET;
  mintResult = await blockchainService.mintAsset(assetData, toAddress);
  // 更新资产状态，记录 NFT 信息
  updatedAsset.nftTokenId = mintResult.tokenId;
  updatedAsset.nftTxHash = mintResult.txHash;
  updatedAsset.nftMinted = true;
  updatedAsset.nftMintedAt = Date.now();
}
```

**如果自动铸造成功**:
- ✅ NFT Token ID 记录到资产数据
- ✅ 交易哈希记录到资产数据
- ✅ 资产标记为 `nftMinted: true`

**如果自动铸造失败**:
- ⚠️ 资产仍然进入资产池
- ⚠️ 可以后续手动铸造 NFT

---

### 4️⃣ 手动铸造 NFT（如果需要）

**操作位置**: `/command` (审核台)

**前提条件**:
- 资产状态必须是 `AVAILABLE`
- 资产尚未铸造 NFT (`nftMinted: false`)

**操作步骤**:
1. 在审核台找到已批准的资产
2. 点击"铸造NFT"按钮（紫色按钮）
3. 确认铸造操作
4. 系统调用 `POST /api/arsenal/mint-nft/:id`

**API 处理**:
```javascript
// 1. 检查资产状态（必须是 AVAILABLE）
// 2. 铸造 NFT
mintResult = await blockchainService.mintAsset(assetData, toAddress);

// 3. 更新资产状态
updateAssetStatus(id, 'AVAILABLE', {
  nftMinted: true,
  nftTokenId: mintResult.tokenId,
  nftTxHash: mintResult.txHash,
  nftMintedAt: Date.now(),
  mintedTo: toAddress
});
```

---

## 📊 资产状态流转

```
MINTING (待审核)
    ↓ [审核通过]
AVAILABLE (可交易) → 进入资产池 → 自动添加到地图
    ↓ [可选：自动铸造 NFT]
AVAILABLE + nftMinted: true
    ↓ [可选：手动铸造 NFT]
AVAILABLE + nftMinted: true + NFT 信息
```

---

## 🎯 关键要点

### ✅ 审核通过后自动执行
1. **资产状态变更**: `MINTING` → `AVAILABLE`
2. **进入资产池**: 自动添加到地图日志
3. **地图显示**: 立即在首页地图上显示
4. **可选自动铸造**: 如果配置了合约且 `autoMint=true`

### 📍 资产池的定义
资产池 = 系统中所有 `AVAILABLE` 状态的资产集合，包括：
- 首页第三屏地图上的资产标记
- 首页第四屏的资产列表
- 市场页面的可交易资产
- API: `GET /api/arsenal/assets` 返回的所有资产

### 🪙 NFT 铸造的两种方式

#### 方式 1: 审核通过时自动铸造（推荐）
- **优点**: 流程自动化，减少手动操作
- **条件**: 需要配置 `CONTRACT_ADDRESS` 环境变量
- **触发**: 审核通过时自动执行

#### 方式 2: 审核通过后手动铸造
- **优点**: 可以控制 NFT 铸造时机
- **适用**: 区块链未配置或需要手动确认时
- **操作**: 在审核台点击"铸造NFT"按钮

---

## 🔧 配置说明

### 自动铸造 NFT 配置

在 `.env` 文件中配置：

```env
# 区块链合约地址（必需，用于 NFT 铸造）
CONTRACT_ADDRESS=0x...

# NFT 接收地址（可选，默认使用审核员地址或平台钱包）
PLATFORM_WALLET=0x...

# 区块链 RPC 端点
BLOCKCHAIN_RPC_URL=https://...

# 私钥（用于签名交易）
BLOCKCHAIN_PRIVATE_KEY=0x...
```

### 审核通过时的自动铸造控制

**前端调用示例**:
```javascript
// 自动铸造（默认）
await approveAsset(id, {
  autoMint: true,  // 启用自动铸造
  mintToAddress: '0x...'  // 可选：指定接收地址
});

// 不自动铸造
await approveAsset(id, {
  autoMint: false  // 禁用自动铸造
});
```

---

## 📝 API 接口说明

### 1. 批准资产（审核通过）
**端点**: `PUT /api/arsenal/approve/:id`

**请求体**:
```json
{
  "autoMint": true,  // 是否自动铸造 NFT（默认 true）
  "mintToAddress": "0x...",  // 可选：NFT 接收地址
  "reviewNotes": "审核备注"  // 可选
}
```

**响应**:
```json
{
  "success": true,
  "message": "Asset approved successfully",
  "asset": {
    "id": "asset_id",
    "status": "AVAILABLE",
    "codeName": "CN-XI-BKR-4921"
  },
  "blockchain": {
    "txHash": "0x...",  // 如果自动铸造成功
    "tokenId": "1234567890"
  }
}
```

### 2. 手动铸造 NFT
**端点**: `POST /api/arsenal/mint-nft/:id`

**请求体**:
```json
{
  "mintToAddress": "0x..."  // 可选：NFT 接收地址
}
```

**响应**:
```json
{
  "success": true,
  "message": "NFT minted successfully and added to asset pool",
  "asset": {
    "id": "asset_id",
    "codeName": "CN-XI-BKR-4921",
    "status": "AVAILABLE"
  },
  "nft": {
    "tokenId": "1234567890",
    "txHash": "0x...",
    "blockNumber": 12345,
    "toAddress": "0x..."
  }
}
```

---

## ✅ 验证资产是否进入资产池

### 1. 检查地图显示
- 访问首页 (`/`)
- 滚动到第三屏（地图）
- 查看是否有新增的资产标记

### 2. 检查资产列表
- 访问首页 (`/`)
- 滚动到第四屏（资产列表）
- 查看是否有新增的资产卡片

### 3. 检查市场页面
- 访问 `/market`
- 查看资产列表，应该包含新批准的资产

### 4. 检查 API
```bash
curl http://localhost:10000/api/arsenal/assets
```
返回所有 `AVAILABLE` 状态的资产（资产池中的所有资产）

---

## 🐛 故障排除

### 问题 1: 资产审核通过但未显示在地图
**检查**:
- 资产是否有经纬度坐标 (`latitude`, `longitude`)
- 地图日志是否成功添加（查看后端日志）
- 前端是否正确刷新数据

### 问题 2: NFT 自动铸造失败
**检查**:
- 是否配置了 `CONTRACT_ADDRESS`
- 区块链服务是否正常连接
- 是否有足够的 Gas 费用
- 查看后端日志的错误信息

**处理**:
- NFT 铸造失败不影响资产进入资产池
- 可以后续手动点击"铸造NFT"按钮

### 问题 3: 资产状态未更新
**检查**:
- 刷新审核台页面
- 检查 API 响应是否成功
- 查看后端日志

---

## 📋 总结

**审核通过后的完整流程**:
1. ✅ 资产状态变为 `AVAILABLE`
2. ✅ 自动添加到资产池（地图日志）
3. ✅ 立即在首页和市场页面显示
4. ✅ 可选：自动铸造 TWS Land NFT
5. ✅ 可选：后续手动铸造 NFT

**资产进入资产池 = 资产状态为 AVAILABLE + 添加到地图日志 + 在系统中可查看和交易**

---

**最后更新**: 2026-01-03

