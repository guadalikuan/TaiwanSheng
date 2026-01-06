# 开发商审核界面权限说明

## 📋 功能概述

房地产开发商账户在审核界面的权限和显示内容已进行特殊配置：
- **无审核权限**：开发商不能进行批准/拒绝操作
- **仅显示自己的资产**：只显示该开发商账户录入的房产信息
- **显示所有状态**：显示该开发商提交的所有资产（包括各种状态）

---

## 🎯 功能特性

### 1. **权限限制**

开发商在审核界面：
- ❌ **不能批准资产**
- ❌ **不能拒绝资产**
- ❌ **不能铸造NFT**
- ✅ **只能查看**自己提交的资产信息

### 2. **数据范围**

- **管理员/审核员**：查看所有待审核资产（MINTING状态）
- **开发商**：查看自己提交的所有资产（所有状态）

### 3. **界面显示**

#### 标题和说明
- **管理员/审核员**：
  - 标题：`总司令审核台`
  - 说明：`Command Center - Asset Review & Verification System`
  
- **开发商**：
  - 标题：`我的资产审核状态`
  - 说明：`查看您提交的资产审核状态`

#### 列表标题
- **管理员/审核员**：`待审核列表`
- **开发商**：`我的资产列表`

---

## 🔧 技术实现

### 1. **前端组件**

#### CommandCenter 组件

**文件**：`src/components/CommandCenter.jsx`

**关键逻辑**：
```javascript
// 判断是否为开发商（仅查看模式，无审核权限）
const isDeveloper = user?.role === 'DEVELOPER';
// 判断是否有审核权限（管理员和审核员）
const canReview = user?.role === 'ADMIN' || user?.role === 'REVIEWER';
```

**条件渲染**：
- 根据 `canReview` 决定是否传递审核相关的回调函数
- 根据 `isDeveloper` 改变界面文字和标题

#### AssetComparisonCard 组件

**文件**：`src/components/AssetComparisonCard.jsx`

**关键改动**：
```javascript
const AssetComparisonCard = ({ 
  asset, 
  onApprove, 
  onReject, 
  onMintNFT, 
  isProcessing, 
  canReview = true  // 新增参数
}) => {
  // ...
  
  // 只有有审核权限的用户才显示操作按钮
  {canReview && (
    <div className="flex gap-2">
      {/* 批准、拒绝、铸造NFT按钮 */}
    </div>
  )}
}
```

### 2. **后端API**

#### GET /api/arsenal/pending

**文件**：`server/routes/arsenal.js`

**逻辑**：
```javascript
// 如果是开发商，返回该开发商提交的所有资产（所有状态）
if (userRole === ROLES.DEVELOPER) {
  const allAssets = getAllAssets();
  
  // 筛选出该开发商提交的所有资产
  const developerAssets = allAssets.raw
    .filter(rawAsset => rawAsset.submittedBy === userAddress)
    .map(rawAsset => {
      const sanitized = allAssets.sanitized.find(s => s.id === rawAsset.id);
      return {
        raw: rawAsset,
        sanitized: sanitized || null
      };
    });
  
  // 按时间倒序排列（最新的在前）
  developerAssets.sort((a, b) => (b.raw?.timestamp || 0) - (a.raw?.timestamp || 0));
  
  return res.json({
    success: true,
    count: developerAssets.length,
    assets: developerAssets
  });
}

// 管理员和审核员：只返回待审核资产
const pendingAssets = getPendingAssets();
```

---

## 📊 状态显示

### 资产状态标签

开发商可以看到的所有状态：
- **审核中**（MINTING）：黄色标签
- **已上架**（AVAILABLE）：绿色标签
- **已预订**（RESERVED）：蓝色标签
- **已锁定**（LOCKED）：红色标签
- **已拒绝**（REJECTED）：灰色标签

### 状态颜色映射

```javascript
const statusColors = {
  'MINTING': 'bg-yellow-100 text-yellow-800',
  'AVAILABLE': 'bg-green-100 text-green-800',
  'RESERVED': 'bg-blue-100 text-blue-800',
  'LOCKED': 'bg-red-100 text-red-800',
  'REJECTED': 'bg-gray-100 text-gray-800',
};

const statusLabels = {
  'MINTING': '审核中',
  'AVAILABLE': '已上架',
  'RESERVED': '已预订',
  'LOCKED': '已锁定',
  'REJECTED': '已拒绝',
};
```

---

## 📝 使用流程

### 开发商使用审核界面

1. **登录系统**（使用开发商账户）
2. **访问审核界面**：点击"审核"按钮或访问 `/command`
3. **查看资产列表**：
   - 显示该开发商提交的所有资产
   - 按提交时间倒序排列
   - 显示资产状态标签
4. **查看资产详情**：
   - 点击资产列表中的任意资产
   - 查看原始数据和脱敏数据
   - **注意**：不显示批准/拒绝按钮
5. **查看状态**：
   - 可以通过状态标签了解每个资产的审核状态
   - 可以看到NFT铸造状态（如果已铸造）

---

## 🔍 对比说明

### 管理员/审核员 vs 开发商

| 功能 | 管理员/审核员 | 开发商 |
|------|--------------|--------|
| 查看资产 | 所有待审核资产 | 自己的所有资产 |
| 资产状态 | 仅待审核（MINTING） | 所有状态 |
| 批准权限 | ✅ 有 | ❌ 无 |
| 拒绝权限 | ✅ 有 | ❌ 无 |
| NFT铸造 | ✅ 有 | ❌ 无 |
| 统计数据 | ✅ 显示 | ❌ 不显示 |

---

## ✅ 功能清单

- [x] 开发商不显示批准/拒绝按钮
- [x] 开发商不显示NFT铸造按钮
- [x] 开发商只能查看自己的资产
- [x] 开发商可以看到所有状态的资产
- [x] 开发商不加载统计信息
- [x] 更新界面标题和说明文字
- [x] 更新后端API返回开发商的所有资产
- [x] 添加状态标签显示（支持所有状态）

---

## 📚 相关文件

- `src/components/CommandCenter.jsx`：审核界面主组件
- `src/components/AssetComparisonCard.jsx`：资产对比卡片组件
- `server/routes/arsenal.js`：后端API路由
- `server/utils/storage.js`：数据存储工具

---

**最后更新**：2025-01-27

