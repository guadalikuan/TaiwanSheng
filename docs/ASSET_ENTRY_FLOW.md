# 资产入库完整逻辑流程

## 📋 整体架构

```
前端 (ArsenalEntry.jsx)
    ↓
API 层 (api.js)
    ↓
后端路由 (arsenal.js)
    ↓
存储层 (storage.js)
    ↓
数据文件 (rawAssets.json, sanitizedAssets.json)
```

---

## 🔄 完整流程

### 阶段 1: 用户填写表单

**前端组件**: `ArsenalEntry.jsx`

1. **第一步：基础信息登记**
   - 用户填写：债权人姓名、联系电话、项目名称、城市、建筑面积
   - 实时预览：系统根据城市和面积生成脱敏代号（如：`CN-XI-BKR-4921`）
   - 前端验证：检查必填字段

2. **第二步：价值评估与凭证上传**
   - 用户填写：期望回款金额（万元）
   - 文件上传：房产证或工抵协议（JPG/PNG/PDF，最大10MB）
   - 协议确认：勾选同意《数字资产委托处置协议》

### 阶段 2: 文件上传

**API 调用**: `POST /api/arsenal/upload`

**流程**:
```
前端 (ArsenalEntry.jsx)
  ↓ handleFileUpload()
  ↓ 调用 uploadFile(file)
API (api.js)
  ↓ FormData.append('file', file)  ← 关键：字段名必须是 'file'
  ↓ POST /api/arsenal/upload
后端 (arsenal.js)
  ↓ multer.single('file')  ← 接收字段名 'file'
  ↓ 保存到 server/uploads/ 目录
  ↓ 返回文件信息 { filename, url, size }
前端
  ↓ 保存到 uploadedFiles 状态
```

**数据格式**:
```javascript
// 后端返回
{
  success: true,
  file: {
    filename: "asset-1234567890-123456789.jpg",
    originalName: "房产证.jpg",
    size: 1024000,
    url: "/uploads/asset-1234567890-123456789.jpg"
  }
}
```

### 阶段 3: 提交资产数据

**API 调用**: `POST /api/arsenal/submit`

**流程**:
```
前端 (ArsenalEntry.jsx)
  ↓ handleSubmit()
  ↓ 构建 proofDocs URL 数组
  ↓ 调用 submitAsset(formData)
API (api.js)
  ↓ POST /api/arsenal/submit
  ↓ body: {
      ownerName, phone, projectName, city, area, debtPrice,
      proofDocs: ["/uploads/file1.jpg", "/uploads/file2.pdf"]
    }
后端 (arsenal.js)
  ↓ 验证必填字段
  ↓ 创建原始资产对象 (rawAsset)
  ↓ 保存到 rawAssets.json
  ↓ 调用 wrapAsset() 进行脱敏
  ↓ 保存脱敏资产到 sanitizedAssets.json
  ↓ 返回 { success: true, sanitizedAsset }
前端
  ↓ 显示成功页面（第三步）
```

**原始资产数据结构** (`rawAssets.json`):
```json
{
  "id": "raw_1234567890_abc123",
  "ownerName": "张三",
  "contactPhone": "139...",
  "projectName": "西安·曲江·xx公馆",
  "city": "西安",
  "area": 120,
  "debtAmount": 100,
  "marketValuation": 150,
  "proofDocs": ["/uploads/file1.jpg"],
  "timestamp": 1234567890
}
```

**脱敏资产数据结构** (`sanitizedAssets.json`):
```json
{
  "id": "raw_1234567890_abc123",
  "codeName": "CN-XI-BKR-4921",
  "title": "Strategic Rear Capital (大后方核心指挥部) - BUNKER (加固地堡)",
  "locationTag": "CN-NW-CAPITAL",
  "zoneClass": "BUNKER (加固地堡)",
  "securityLevel": 5,
  "specs": {
    "area": "120 m²",
    "capacity": "6 Personnel",
    "type": "BUNKER (加固地堡)"
  },
  "financials": {
    "totalTokens": 138888,
    "pricePerToken": 1.00,
    "yield": "3.5% APY (Rent derived)"
  },
  "status": "MINTING",
  "tokenPrice": 138888,
  "internalRef": "raw_1234567890_abc123"
}
```

### 阶段 4: 资产脱敏处理

**处理函数**: `assetWrapperFactory.js` → `wrapAsset()`

**脱敏规则**:
1. **城市映射**: 真实城市 → 战区代号
   - 西安 → `CN-NW-CAPITAL` (大后方核心指挥部)
   - 咸阳 → `CN-NW-SUB` (近郊储备区)
   - 宝鸡 → `CN-IND-HUB` (重工业储备区)
   - 商洛 → `CN-QINLING-MTN` (秦岭深山核掩体)

2. **资产等级**: 根据面积分类
   - < 50㎡ → POD (单兵休眠舱)
   - < 90㎡ → SHELTER (标准避难所)
   - < 140㎡ → BUNKER (加固地堡)
   - ≥ 140㎡ → COMMAND_POST (前线指挥所)

3. **代号生成**: `CN-{城市代码}-{类型代码}-{随机数}`
   - 例：`CN-XI-BKR-4921`

4. **价格计算**: 
   - 汇率：7.2 (CNY → USD)
   - `tokenPrice = (debtAmount * 10000) / 7.2`

5. **安全等级**: 根据城市风险因子计算（1-5星）

### 阶段 5: 资产状态流转

```
MINTING (提交后)
    ↓
AVAILABLE (审核通过)  ← 管理员在 CommandCenter 审核
    ↓
RESERVED (被预订)
    ↓
LOCKED (已锁定/已售出)
```

### 阶段 6: 资产列表显示

**API 调用**: `GET /api/homepage/assets`

**流程**:
```
前端 (AssetsSection.jsx)
  ↓ useEffect() 加载资产列表
  ↓ 调用 getHomepageAssets()
API (api.js)
  ↓ GET /api/homepage/assets
后端 (homepage.js)
  ↓ 获取 AVAILABLE 状态的资产
  ↓ 如果不足10个，补充 MINTING 状态的资产
  ↓ 匹配原始数据获取城市信息
  ↓ 格式化数据返回
前端
  ↓ 渲染资产卡片列表
```

**返回格式**:
```json
{
  "success": true,
  "data": {
    "assets": [
      {
        "id": "raw_1234567890_abc123",
        "city": "西安",
        "title": "CN-XI-BKR-4921",
        "type": "BUNKER (加固地堡)",
        "price": "138,888 USDT",
        "yield": "4%",
        "status": "AVAILABLE",
        "risk": "LOW"
      }
    ]
  }
}
```

---

## ❌ 修改前的问题分析

### 问题 1: 文件上传字段名不匹配 ⚠️ **关键问题**

**修改前** (`api.js`):
```javascript
formData.append('proofDocs', file);  // ❌ 错误
```

**后端期望** (`arsenal.js`):
```javascript
router.post('/upload', upload.single('file'), ...)  // 期望 'file'
```

**结果**: 
- ❌ 文件上传会失败
- ❌ multer 无法接收文件（字段名不匹配）
- ❌ 返回 400 错误或文件为 undefined

**修复后**:
```javascript
formData.append('file', file);  // ✅ 正确
```

### 问题 2: 文件 URL 路径处理不完整

**修改前** (`ArsenalEntry.jsx`):
```javascript
proofDocs: uploadedFiles.map(f => f.url)  // ❌ 可能是相对路径
```

**问题**:
- 后端返回的是相对路径：`/uploads/file.jpg`
- 如果前端和服务器不在同一域名，需要拼接完整 URL
- 可能导致提交时 URL 不正确

**修复后**:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const proofDocs = uploadedFiles.map(f => {
  if (f.url && f.url.startsWith('http')) {
    return f.url;  // 已经是完整 URL
  }
  return `${API_BASE_URL}${f.url || f.filename || ''}`;  // 拼接完整 URL
});
```

### 问题 3: 资产列表数据验证不足

**修改前** (`AssetsSection.jsx`):
```javascript
setAssets(response.data.assets);  // ❌ 没有验证是否为数组
```

**问题**:
- 如果 API 返回格式异常，可能导致渲染错误
- 没有处理空数据或非数组情况

**修复后**:
```javascript
const assetsList = Array.isArray(response.data.assets) 
  ? response.data.assets 
  : [];
setAssets(assetsList);
```

### 问题 4: 缺少自动刷新机制

**修改前**: 资产列表只在组件加载时获取一次

**问题**:
- 用户提交新资产后，列表不会自动更新
- 需要手动刷新页面才能看到新资产

**修复后**: 添加了 30 秒自动刷新机制

---

## ✅ 修改前能否正常工作？

### 结论：**部分功能可以，但文件上传会失败**

| 功能 | 修改前状态 | 原因 |
|------|-----------|------|
| 表单填写 | ✅ 正常 | 前端逻辑完整 |
| 文件上传 | ❌ **失败** | 字段名不匹配 (`proofDocs` vs `file`) |
| 资产提交 | ⚠️ 可能失败 | 如果文件上传失败，proofDocs 为空数组，但提交仍可能成功 |
| 数据保存 | ✅ 正常 | 后端逻辑完整 |
| 资产列表 | ⚠️ 部分正常 | 如果数据格式异常可能报错 |
| 资产显示 | ✅ 正常 | 后端 API 完整 |

### 关键阻塞点

1. **文件上传完全无法工作** - 这是最严重的问题
   - 用户无法上传房产证或工抵协议
   - 虽然不影响提交，但缺少重要凭证

2. **用户体验问题**
   - 资产列表不会自动刷新
   - 数据验证不足可能导致错误

---

## 📊 修改前后对比

| 项目 | 修改前 | 修改后 |
|------|--------|--------|
| 文件上传 | ❌ 失败（字段名错误） | ✅ 正常 |
| URL 处理 | ⚠️ 可能有问题 | ✅ 完整处理 |
| 数据验证 | ⚠️ 不足 | ✅ 完善 |
| 自动刷新 | ❌ 无 | ✅ 30秒刷新 |
| 错误处理 | ⚠️ 基础 | ✅ 完善 |

---

## 🎯 总结

**修改前**：
- 核心功能（资产提交、数据保存）可以工作
- 但文件上传功能**完全无法使用**
- 用户体验和稳定性有改进空间

**修改后**：
- 所有功能正常工作
- 文件上传修复
- 数据验证和错误处理完善
- 用户体验提升（自动刷新）

**建议**：必须修复文件上传问题，否则用户无法上传凭证文件，影响审核流程。

