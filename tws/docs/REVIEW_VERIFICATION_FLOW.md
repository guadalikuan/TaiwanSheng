# 资产审核确权流程文档

## 📋 概述

资产审核确权系统是 TWS 平台的核心功能，用于审核用户提交的房产资产，完成确权后资产才能上架交易。

---

## 🔄 完整流程

### 1. 资产提交阶段

**用户操作**：
- 访问 `/arsenal` 页面
- 填写资产信息（债权人、项目名称、城市、面积、价格等）
- 上传房产证或工抵协议
- 提交审核

**系统处理**：
- 保存原始资产数据 → `rawAssets.json`
- 自动脱敏处理 → `sanitizedAssets.json`
- 资产状态：`MINTING`（待审核）

---

### 2. 审核阶段

**审核员操作**：
1. 访问 `/command` 审核台（需要 REVIEWER 或 ADMIN 权限）
2. 查看待审核资产列表
3. 选择资产查看详情（原始数据 vs 脱敏数据对比）
4. 审核决策：
   - **批准**：资产确权，状态变为 `AVAILABLE`
   - **拒绝**：资产状态变为 `REJECTED`

**审核界面功能**：
- ✅ 查看原始数据（敏感信息，仅审核员可见）
- ✅ 查看脱敏数据（公开展示数据）
- ✅ 生成合同 PDF
- ✅ 批准/拒绝操作
- ✅ 审核历史记录
- ✅ 统计信息面板

---

### 3. 确权流程（批准后）

**批准操作触发**：
```
审核员点击"批准"按钮
    ↓
确认对话框（显示确权说明）
    ↓
调用 API: PUT /api/arsenal/approve/:id
    ↓
后端处理：
1. 更新资产状态：MINTING → AVAILABLE
2. 保存审核记录（审核员、时间、备注）
3. 可选：自动上链（生成区块链Token）
    ↓
返回成功响应
    ↓
资产上架展示（首页第四屏）
```

**确权后的资产状态**：
- ✅ 状态：`AVAILABLE`（可交易）
- ✅ 可在首页资产列表显示
- ✅ 可在市场页面交易
- ✅ 已生成区块链Token（如果配置了合约）

---

### 4. 拒绝流程

**拒绝操作触发**：
```
审核员点击"拒绝"按钮
    ↓
输入拒绝原因（必填）
    ↓
确认对话框
    ↓
调用 API: PUT /api/arsenal/reject/:id
    ↓
后端处理：
1. 更新资产状态：MINTING → REJECTED
2. 保存审核记录（拒绝原因）
    ↓
资产不会上架展示
```

---

## 🔐 权限控制

### 访问权限

**审核台路由**：`/command`

**权限要求**：
- ✅ 必须登录（`isAuthenticated = true`）
- ✅ 角色必须是 `REVIEWER` 或 `ADMIN`

**权限检查**：
- 前端：`ProtectedRoute` 组件检查
- 后端：`authenticate` + `requireRole(ROLES.REVIEWER, ROLES.ADMIN)` 中间件

### 角色定义

```javascript
ROLES = {
  USER: 'USER',           // 普通用户（只能提交资产）
  SUBMITTER: 'SUBMITTER', // 提交者（可提交资产）
  REVIEWER: 'REVIEWER',   // 审核员（可审核资产）⭐
  ADMIN: 'ADMIN'          // 管理员（所有权限）⭐
}
```

---

## 📊 资产状态流转

```
MINTING（待审核）
    ↓
    ├─→ AVAILABLE（已批准/已确权）✅
    │   └─→ 可上架展示
    │   └─→ 可交易
    │   └─→ 已生成Token
    │
    └─→ REJECTED（已拒绝）❌
        └─→ 不会上架
        └─→ 保留审核记录
```

---

## 🛠️ API 端点

### 获取待审核资产

**GET** `/api/arsenal/pending`

**权限**：REVIEWER, ADMIN

**响应**：
```json
{
  "success": true,
  "count": 5,
  "assets": [
    {
      "raw": { /* 原始数据 */ },
      "sanitized": { /* 脱敏数据 */ }
    }
  ]
}
```

### 批准资产（确权）

**PUT** `/api/arsenal/approve/:id`

**权限**：REVIEWER, ADMIN

**请求体**：
```json
{
  "reviewNotes": "审核备注",
  "autoMint": true,  // 是否自动上链
  "mintToAddress": "0x..."  // 可选：Token接收地址
}
```

**响应**：
```json
{
  "success": true,
  "message": "Asset approved successfully",
  "asset": { /* 更新后的资产 */ },
  "blockchain": {
    "txHash": "0x...",
    "tokenId": "123"
  }
}
```

### 拒绝资产

**PUT** `/api/arsenal/reject/:id`

**权限**：REVIEWER, ADMIN

**请求体**：
```json
{
  "reviewNotes": "拒绝原因"
}
```

### 获取统计信息

**GET** `/api/arsenal/stats`

**权限**：REVIEWER, ADMIN

**响应**：
```json
{
  "success": true,
  "stats": {
    "total": 100,
    "pending": 5,
    "approved": 80,
    "rejected": 10,
    "locked": 5
  }
}
```

---

## 📝 审核记录

每次审核操作都会记录：

```json
{
  "status": "AVAILABLE",
  "reviewedBy": "admin",
  "reviewNotes": "审核备注",
  "reviewedAt": 1234567890
}
```

**查看审核历史**：
- API: `GET /api/arsenal/review-history/:id`
- 权限：REVIEWER, ADMIN

---

## ✅ 确权完成标志

资产确权完成的标志：

1. ✅ **状态变更**：`MINTING` → `AVAILABLE`
2. ✅ **审核记录**：有审核历史记录
3. ✅ **上架展示**：出现在首页资产列表（`/api/homepage/assets`）
4. ✅ **区块链Token**：如果配置了合约，已生成Token（可选）

---

## 🎯 使用指南

### 审核员操作步骤

1. **登录系统**
   - 使用具有 REVIEWER 或 ADMIN 角色的账号登录

2. **访问审核台**
   - 访问 `http://localhost:5173/command`
   - 或从导航栏进入（如果已添加链接）

3. **查看待审核资产**
   - 左侧列表显示所有 `MINTING` 状态的资产
   - 点击资产查看详情

4. **审核资产**
   - 查看原始数据（敏感信息）
   - 查看脱敏数据（公开数据）
   - 检查上传的凭证文件
   - 决定批准或拒绝

5. **批准确权**
   - 点击"批准"按钮
   - 输入审核备注（可选）
   - 确认后资产状态变为 `AVAILABLE`
   - 资产自动上架展示

6. **拒绝资产**
   - 点击"拒绝"按钮
   - 输入拒绝原因（必填）
   - 确认后资产状态变为 `REJECTED`

---

## 🔧 技术实现

### 前端组件

- `CommandCenter.jsx` - 审核台主组件
- `AssetComparisonCard.jsx` - 资产对比卡片
- `ProtectedRoute.jsx` - 权限保护路由

### 后端路由

- `server/routes/arsenal.js` - 审核相关 API
- `server/utils/storage.js` - 资产状态管理
- `server/middleware/auth.js` - 权限中间件

---

## 📌 注意事项

1. **权限保护**：审核台必须登录且具有审核权限
2. **数据安全**：原始数据仅审核员可见，脱敏数据公开
3. **审核记录**：所有审核操作都会记录，不可撤销
4. **确权不可逆**：批准后资产状态变为 AVAILABLE，建议谨慎操作
5. **区块链集成**：如果配置了合约地址，批准后会自动上链

---

## 🚀 快速开始

1. **创建审核员账号**：
   ```javascript
   // 注册时指定角色
   registerUser(username, password, null, 'REVIEWER')
   ```

2. **访问审核台**：
   ```
   http://localhost:5173/command
   ```

3. **开始审核**：
   - 查看待审核资产
   - 批准或拒绝
   - 完成确权

---

## 📚 相关文档

- [资产入库流程](./ASSET_ENTRY_FLOW.md)
- [权限系统说明](./IMPLEMENTATION_SUMMARY.md)

