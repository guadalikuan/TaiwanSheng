# NFT 铸造功能更新说明

## 📋 更新概述

将审核流程中的"生成合同"功能改为"铸造 TWS Land NFT"，使资产通过审核后自动进入资产池，并可选择性地铸造为区块链 NFT。

---

## 🔄 主要变更

### 1. **后端 API 变更**

#### 新增端点：`POST /api/arsenal/mint-nft/:id`

**功能**：为已审核通过的资产铸造 TWS Land NFT

**权限要求**：`REVIEWER`, `DEVELOPER`, `ADMIN`

**请求参数**：
```json
{
  "mintToAddress": "0x..." // 可选，NFT 接收地址
}
```

**响应示例**：
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

**注意事项**：
- 只有 `AVAILABLE` 状态的资产才能铸造 NFT
- 如果区块链未配置，资产仍会进入资产池，但不会铸造 NFT
- NFT 铸造失败不影响资产进入资产池

#### 移除端点：`POST /api/arsenal/generate-contract/:id`

原合同生成功能已移除，改为 NFT 铸造。

---

### 2. **前端界面更新**

#### `AssetComparisonCard` 组件

**变更**：
- 将"生成合同"按钮改为"铸造NFT"按钮
- 按钮图标从 `FileText` 改为 `Image`
- 按钮颜色从蓝色改为紫色（`bg-purple-600`）
- 只有 `AVAILABLE` 状态的资产才显示铸造按钮
- 已铸造 NFT 的资产显示"已铸造NFT"状态

**按钮状态**：
- 未铸造：显示"铸造NFT"，可点击
- 已铸造：显示"已铸造NFT"，禁用状态

#### `CommandCenter` 组件

**变更**：
- 移除 `generateContract` 函数
- 新增 `handleMintNFT` 函数
- 更新 `AssetComparisonCard` 的 props，从 `onGenerateContract` 改为 `onMintNFT`

---

### 3. **资产入库界面地图更新**

#### `MapLocationPicker` 组件

**样式变更**：

1. **地图瓦片**：
   - 从暗色主题（`dark_all`）改为浅色主题（OpenStreetMap 标准）
   - 更符合房地产网站风格

2. **标记图标**：
   - 从红色军事风格标记改为蓝色房子图标
   - 使用圆形容器，中间显示三角形房子图标

3. **提示信息**：
   - 从黑色半透明背景改为白色半透明背景
   - 添加阴影效果，更现代化

4. **搜索框**：
   - 焦点边框从红色改为蓝色
   - 按钮从红色改为蓝色

5. **坐标显示区**：
   - 从灰色背景改为蓝色背景（`bg-blue-50`）
   - 文字颜色从灰色改为蓝色主题

**视觉效果**：
- 整体风格从军事暗色主题 → 房地产浅色主题
- 配色方案：红色 → 蓝色
- 更加友好和专业

---

### 4. **API 函数更新**

#### `src/utils/api.js`

**移除**：
- `generateContract(id, download)`

**新增**：
- `mintNFT(id, mintToAddress)`

```javascript
export const mintNFT = async (id, mintToAddress = null) => {
  // 调用后端 NFT 铸造端点
  // 返回铸造结果（包括 tokenId, txHash 等）
}
```

---

## 🔄 工作流程

### 审核流程

1. **资产提交** → 状态：`MINTING`
2. **审核通过** → 状态：`AVAILABLE`，进入资产池
3. **铸造 NFT**（可选）：
   - 点击"铸造NFT"按钮
   - 系统调用区块链合约铸造 NFT
   - 返回 Token ID 和交易哈希
   - 资产标记为 `nftMinted: true`

### 数据流

```
审核通过 (approve)
  ↓
状态更新为 AVAILABLE
  ↓
添加到地图日志
  ↓
可选择铸造 NFT
  ↓
调用区块链合约
  ↓
返回 NFT 信息（tokenId, txHash）
  ↓
更新资产元数据
```

---

## 💡 使用说明

### 审核员操作

1. **审核资产**：
   - 查看原始数据和脱敏数据对比
   - 点击"批准"按钮通过审核
   - 资产自动进入资产池

2. **铸造 NFT**：
   - 选择已审核通过的资产（状态为 `AVAILABLE`）
   - 点击"铸造NFT"按钮
   - 确认操作
   - 等待区块链确认
   - 查看 NFT 信息（Token ID、交易哈希等）

### 权限要求

- **审核资产**：`REVIEWER`, `DEVELOPER`, `ADMIN`
- **铸造 NFT**：`REVIEWER`, `DEVELOPER`, `ADMIN`
- **查看资产**：所有角色

---

## ⚙️ 配置要求

### 环境变量

```env
# 区块链配置（可选）
CONTRACT_ADDRESS=0x...  # TWS Asset 合约地址
BSC_RPC_URL=https://bsc-dataseed.binance.org  # RPC 节点
PRIVATE_KEY=0x...  # 平台钱包私钥
PLATFORM_WALLET=0x...  # 平台钱包地址
```

### 注意事项

- 如果未配置区块链环境变量，NFT 铸造将跳过，但资产仍会进入资产池
- NFT 铸造需要消耗 Gas 费用
- 建议使用测试网进行测试

---

## 🔍 技术细节

### NFT 标准

- **标准**：ERC-1155
- **合约**：TWS_Asset.sol
- **Token ID**：基于资产 ID 的哈希值生成
- **份额**：基于资产的 Token 数量

### 区块链集成

使用 `ethers.js` 库与区块链交互：
- 连接 RPC 节点
- 调用合约的 `mintBunker` 方法
- 等待交易确认
- 返回交易哈希和 Token ID

---

## ✅ 测试清单

- [ ] 审核资产后状态变为 `AVAILABLE`
- [ ] 资产进入资产池（可在市场页面查看）
- [ ] NFT 铸造按钮仅对 `AVAILABLE` 资产显示
- [ ] NFT 铸造成功返回 Token ID 和交易哈希
- [ ] NFT 铸造失败不影响资产进入资产池
- [ ] 地图样式为浅色房地产风格
- [ ] 地图标记为蓝色房子图标

---

## 📝 后续优化建议

1. **批量铸造**：支持批量选择资产并铸造 NFT
2. **铸造历史**：记录每次 NFT 铸造的详细信息
3. **NFT 元数据**：为 NFT 添加丰富的元数据（图片、描述等）
4. **NFT 查看**：在前端展示 NFT 详情和交易历史
5. **Gas 优化**：优化合约调用以降低 Gas 费用

---

**最后更新**：2025-01-27

