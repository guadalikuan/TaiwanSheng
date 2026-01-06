# 角色权限界面分离说明

## 📋 功能概述

根据用户角色，系统提供不同的界面和功能：
- **管理员（ADMIN）**：审核界面 + 账户管理界面
- **开发商（DEVELOPER）**：资产界面 + 审核界面

---

## 🎯 界面权限配置

### 1. **管理员（ADMIN）**

#### 可用界面：
- ✅ **审核界面** (`/command`)：可以审核所有待审核资产
- ✅ **账户管理界面** (`/admin/users`)：可以管理所有账户（创建、编辑、删除开发商账户）

#### 导航按钮：
在资产入库界面显示：
- "入库"：提交新资产
- "审核"：进入审核界面
- "账户"：进入账户管理界面

---

### 2. **开发商（DEVELOPER）**

#### 可用界面：
- ✅ **我的资产界面** (`/my-assets`)：查看该开发商提交的所有资产（包括各种状态）
- ✅ **审核界面** (`/command`)：查看该开发商提交的资产的审核状态（只能看到自己提交的资产）

#### 导航按钮：
在资产入库界面显示：
- "入库"：提交新资产
- "资产"：查看我的资产
- "审核"：查看审核状态

---

### 3. **审核员（REVIEWER）**

#### 可用界面：
- ✅ **审核界面** (`/command`)：可以审核所有待审核资产

#### 导航按钮：
在资产入库界面显示：
- "审核"：进入审核界面

---

## 🔧 技术实现

### 1. **资产提交时保存提交者信息**

**文件**：`server/routes/arsenal.js`

在资产提交时，自动保存 `submittedBy` 字段：
```javascript
const rawAsset = {
  // ... 其他字段
  submittedBy: req.user?.address || req.user?.username || 'unknown'
};
```

---

### 2. **后端API更新**

#### A. 获取我的资产 API

**端点**：`GET /api/arsenal/my-assets`

**权限**：需要 `SUBMITTER`、`DEVELOPER` 或 `ADMIN` 权限

**功能**：
- 开发商和提交者：只返回自己提交的资产
- 管理员：返回所有资产

**响应示例**：
```json
{
  "success": true,
  "count": 5,
  "assets": [
    {
      "raw": { /* 原始资产数据 */ },
      "sanitized": { /* 脱敏资产数据 */ }
    }
  ]
}
```

#### B. 获取待审核资产 API（已更新）

**端点**：`GET /api/arsenal/pending`

**权限**：需要 `REVIEWER`、`DEVELOPER` 或 `ADMIN` 权限

**功能**：
- 管理员和审核员：返回所有待审核资产
- 开发商：只返回自己提交的待审核资产

**筛选逻辑**：
```javascript
if (userRole === ROLES.DEVELOPER) {
  pendingAssets = pendingAssets.filter(asset => {
    const rawAsset = asset.raw;
    return rawAsset && rawAsset.submittedBy === userAddress;
  });
}
```

---

### 3. **前端组件**

#### A. 我的资产组件

**文件**：`src/components/MyAssets.jsx`

**功能**：
- 显示当前用户提交的所有资产
- 支持按状态筛选（全部、审核中、已上架、已预订、已锁定、已拒绝）
- 显示资产统计信息
- 显示资产详情（位置、面积、债务金额、提交时间等）
- 显示NFT铸造状态

**状态筛选**：
- `ALL`：全部资产
- `MINTING`：审核中
- `AVAILABLE`：已上架
- `RESERVED`：已预订
- `LOCKED`：已锁定
- `REJECTED`：已拒绝

#### B. 审核界面组件（已更新）

**文件**：`src/components/CommandCenter.jsx`

**功能**：
- 管理员和审核员：显示所有待审核资产
- 开发商：只显示自己提交的待审核资产

---

### 4. **路由配置**

**文件**：`src/App.jsx`

**新增路由**：
```javascript
<Route 
  path="/my-assets" 
  element={
    <ProtectedRoute allowedRoles={['SUBMITTER', 'DEVELOPER', 'ADMIN']}>
      <MyAssets />
    </ProtectedRoute>
  } 
/>
```

---

### 5. **导航按钮更新**

**文件**：`src/components/ArsenalEntry.jsx`

**根据角色显示不同的导航按钮**：

```javascript
// 开发商
{user?.role === 'DEVELOPER' && (
  <>
    <button onClick={() => navigate('/my-assets')}>资产</button>
    <button onClick={() => navigate('/command')}>审核</button>
  </>
)}

// 管理员
{user?.role === 'ADMIN' && (
  <>
    <button onClick={() => navigate('/command')}>审核</button>
    <button onClick={() => navigate('/admin/users')}>账户</button>
  </>
)}

// 审核员
{user?.role === 'REVIEWER' && (
  <button onClick={() => navigate('/command')}>审核</button>
)}
```

---

## 📊 数据流

### 资产提交流程

```
用户提交资产
  ↓
后端保存 rawAsset（包含 submittedBy）
  ↓
submittedBy = req.user.address || req.user.username
```

### 我的资产查询流程

```
用户访问 /my-assets
  ↓
前端调用 getMyAssets()
  ↓
后端 GET /api/arsenal/my-assets
  ↓
根据用户角色筛选：
  - DEVELOPER: 只返回 submittedBy === userAddress 的资产
  - ADMIN: 返回所有资产
```

### 审核资产查询流程

```
用户访问 /command
  ↓
前端调用 getPendingAssets()
  ↓
后端 GET /api/arsenal/pending
  ↓
根据用户角色筛选：
  - DEVELOPER: 只返回 submittedBy === userAddress 的待审核资产
  - ADMIN/REVIEWER: 返回所有待审核资产
```

---

## ✅ 功能清单

- [x] 资产提交时保存 `submittedBy` 字段
- [x] 创建后端API：`GET /api/arsenal/my-assets`
- [x] 修改后端API：`GET /api/arsenal/pending`（按角色筛选）
- [x] 创建前端组件：`MyAssets.jsx`
- [x] 更新前端API函数：`getMyAssets()`
- [x] 更新路由配置
- [x] 更新导航按钮（根据角色显示）

---

## 🎨 界面展示

### 我的资产界面特性

1. **统计卡片**：显示总数、审核中、已上架、已预订、已锁定、已拒绝的数量
2. **状态筛选**：快速筛选不同状态的资产
3. **资产卡片**：
   - 资产代号
   - 状态标签
   - NFT铸造状态（如果已铸造）
   - 项目名称
   - 位置信息
   - 建筑面积
   - 债务金额
   - 提交时间
   - NFT Token ID 和交易哈希（如果已铸造）
4. **快速操作**：查看详情、资产入库

---

## 📝 使用示例

### 开发商使用流程

1. **登录系统**（使用开发商账户）
2. **提交资产**：点击"入库"按钮，填写资产信息并提交
3. **查看我的资产**：点击"资产"按钮，查看所有提交的资产及其状态
4. **查看审核状态**：点击"审核"按钮，查看待审核资产的审核状态

### 管理员使用流程

1. **登录系统**（使用管理员账户）
2. **审核资产**：点击"审核"按钮，审核所有待审核资产
3. **管理账户**：点击"账户"按钮，创建、编辑、删除开发商账户

---

## 🔍 注意事项

1. **数据隔离**：开发商只能看到自己提交的资产，不能看到其他开发商的资产
2. **权限验证**：所有API端点都通过 `authenticate` 和 `requireRole` 中间件验证
3. **提交者标识**：使用 `req.user.address`（Solana地址）或 `req.user.username` 作为提交者标识
4. **状态同步**：资产状态变更时，会自动更新到相应的数据文件中

---

## 📚 相关文件

- `server/routes/arsenal.js`：后端API路由
- `server/utils/storage.js`：数据存储工具
- `src/components/MyAssets.jsx`：我的资产组件
- `src/components/CommandCenter.jsx`：审核界面组件
- `src/components/ArsenalEntry.jsx`：资产入库组件（导航按钮）
- `src/App.jsx`：路由配置
- `src/utils/api.js`：前端API函数

---

**最后更新**：2025-01-27

