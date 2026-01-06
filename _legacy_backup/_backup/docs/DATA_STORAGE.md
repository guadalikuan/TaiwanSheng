# 资产入库数据存储位置

## 📁 存储位置概览

资产入库后的数据存储在**文件系统**中，使用 JSON 文件格式。所有数据文件位于后端服务器的 `server/` 目录下。

---

## 📂 数据文件结构

```
tws/
└── server/
    ├── data/                    # 数据文件目录
    │   ├── rawAssets.json      # 原始资产数据（敏感信息）
    │   ├── sanitizedAssets.json # 脱敏资产数据（公开数据）
    │   ├── users.json          # 用户数据
    │   ├── homepage.json       # 首页数据
    │   └── ...                 # 其他数据文件
    │
    └── uploads/                # 文件上传目录
        ├── asset-1234567890-123456789.jpg
        ├── asset-1234567891-123456790.pdf
        └── ...                 # 上传的凭证文件
```

---

## 📄 主要数据文件

### 1. 原始资产数据

**文件路径**：`server/data/rawAssets.json`

**存储内容**：包含所有敏感信息的原始资产数据

**数据结构**：
```json
[
  {
    "id": "raw_1234567890_abc123",
    "ownerName": "张三",
    "ownerId": "",
    "contactPhone": "139...",
    "projectName": "西安·曲江·xx公馆",
    "city": "西安",
    "district": "曲江新区",
    "address": "曲江路123号",
    "roomNumber": "1-2-301",
    "area": 120,
    "marketValuation": 150,
    "debtAmount": 100,
    "proofDocs": [
      "/uploads/asset-1234567890-123456789.jpg"
    ],
    "timestamp": 1234567890,
    "submittedBy": "0x..."  // 可选：提交者地址
  }
]
```

**访问权限**：
- ⚠️ **仅审核员和管理员可访问**
- 通过 API: `GET /api/arsenal/pending`（需要认证）
- 前端：审核台 (`/command`) 显示

---

### 2. 脱敏资产数据

**文件路径**：`server/data/sanitizedAssets.json`

**存储内容**：经过脱敏处理的公开资产数据

**数据结构**：
```json
[
  {
    "id": "raw_1234567890_abc123",
    "codeName": "CN-XI-BKR-4921",
    "displayId": "CN-NW-CAPITAL-123",
    "title": "Strategic Rear Capital (大后方核心指挥部) - BUNKER (加固地堡)",
    "locationTag": "CN-NW-CAPITAL",
    "region": "Strategic Rear Capital (大后方核心指挥部)",
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
    "flavorText": "[CLASSIFIED]...",
    "status": "MINTING",  // 或 "AVAILABLE", "REJECTED", "LOCKED"
    "tokenPrice": 138888,
    "imageUrl": "/assets/blueprints/bunker.png",
    "internalRef": "raw_1234567890_abc123",  // 关联原始数据ID
    "reviewHistory": [  // 审核历史
      {
        "status": "AVAILABLE",
        "reviewedBy": "admin",
        "reviewNotes": "已审核通过",
        "reviewedAt": 1234567890
      }
    ]
  }
]
```

**访问权限**：
- ✅ **公开访问**
- 通过 API: `GET /api/homepage/assets`
- 前端：首页第四屏显示

---

### 3. 上传的凭证文件

**文件路径**：`server/uploads/`

**存储内容**：用户上传的房产证、工抵协议等凭证文件

**文件命名规则**：
```
asset-{timestamp}-{random}.{ext}
例：asset-1234567890-123456789.jpg
```

**文件类型**：
- 图片：`.jpg`, `.jpeg`, `.png`
- 文档：`.pdf`

**文件大小限制**：最大 10MB

**访问方式**：
- URL: `http://localhost:3001/uploads/asset-xxx.jpg`
- 静态文件服务：`/uploads` 路由

---

## 🔄 数据流转过程

### 资产入库流程

```
1. 用户提交资产表单
   ↓
2. 文件上传 → server/uploads/asset-xxx.jpg
   ↓
3. 保存原始数据 → server/data/rawAssets.json
   {
     ownerName: "张三",
     projectName: "xx公馆",
     proofDocs: ["/uploads/asset-xxx.jpg"]
   }
   ↓
4. 脱敏处理（wrapAsset）
   ↓
5. 保存脱敏数据 → server/data/sanitizedAssets.json
   {
     codeName: "CN-XI-BKR-4921",
     title: "Strategic Reserve...",
     status: "MINTING"
   }
```

### 审核确权流程

```
1. 审核员批准资产
   ↓
2. 更新脱敏数据 → server/data/sanitizedAssets.json
   {
     status: "AVAILABLE",  // MINTING → AVAILABLE
     reviewHistory: [...]
   }
   ↓
3. 原始数据不变 → server/data/rawAssets.json
   （保持原始信息，不修改）
```

---

## 📍 文件路径说明

### 绝对路径（开发环境）

```
/Users/fanann/tws/server/data/rawAssets.json
/Users/fanann/tws/server/data/sanitizedAssets.json
/Users/fanann/tws/server/uploads/
```

### 相对路径（代码中）

```javascript
// storage.js
const DATA_DIR = join(__dirname, '../data');
const RAW_ASSETS_FILE = join(DATA_DIR, 'rawAssets.json');
const SANITIZED_ASSETS_FILE = join(DATA_DIR, 'sanitizedAssets.json');

// arsenal.js
const uploadsDir = join(__dirname, '../uploads');
```

---

## 🔍 如何查看存储的数据

### 方法 1: 直接查看文件

```bash
# 查看原始资产数据
cat server/data/rawAssets.json

# 查看脱敏资产数据
cat server/data/sanitizedAssets.json

# 查看上传的文件
ls -la server/uploads/
```

### 方法 2: 通过 API 查看

```bash
# 获取待审核资产（需要认证）
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/arsenal/pending

# 获取已审核资产（公开）
curl http://localhost:3001/api/homepage/assets
```

### 方法 3: 通过前端界面

- **审核台** (`/command`): 查看原始数据和脱敏数据对比
- **首页第四屏**: 查看已审核通过的资产列表

---

## 💾 数据持久化

### 存储方式

- **文件系统存储**：使用 JSON 文件
- **同步写入**：每次操作立即写入文件
- **无数据库**：当前版本不使用数据库

### 数据备份建议

1. **定期备份** `server/data/` 目录
2. **备份上传文件** `server/uploads/` 目录
3. **版本控制**：建议将数据文件加入 `.gitignore`（包含敏感信息）

---

## 🔐 数据安全

### 敏感数据保护

1. **原始数据** (`rawAssets.json`)
   - ⚠️ 包含真实姓名、电话、地址等敏感信息
   - 仅审核员和管理员可访问
   - 建议加密存储（未来改进）

2. **脱敏数据** (`sanitizedAssets.json`)
   - ✅ 已脱敏，可公开访问
   - 不包含真实个人信息

3. **上传文件** (`uploads/`)
   - ⚠️ 可能包含房产证等敏感文档
   - 建议设置访问权限（未来改进）

### 安全建议

1. **文件权限**：限制 `data/` 和 `uploads/` 目录的访问权限
2. **备份加密**：备份文件应加密存储
3. **访问控制**：确保 API 有正确的权限检查
4. **日志审计**：记录所有数据访问操作

---

## 📊 数据统计

### 查看数据统计

通过审核台 API：
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/arsenal/stats
```

返回：
```json
{
  "success": true,
  "stats": {
    "total": 100,      // 总资产数
    "pending": 5,      // 待审核
    "approved": 80,    // 已批准
    "rejected": 10,    // 已拒绝
    "locked": 5        // 已锁定
  }
}
```

---

## 🔧 数据迁移

### 导出数据

```javascript
// 导出原始数据
const rawAssets = getRawAssets();
fs.writeFileSync('backup-rawAssets.json', JSON.stringify(rawAssets, null, 2));

// 导出脱敏数据
const sanitizedAssets = getSanitizedAssets();
fs.writeFileSync('backup-sanitizedAssets.json', JSON.stringify(sanitizedAssets, null, 2));
```

### 导入数据

```javascript
// 导入原始数据
const rawAssets = JSON.parse(fs.readFileSync('backup-rawAssets.json', 'utf8'));
rawAssets.forEach(asset => saveRawAsset(asset));

// 导入脱敏数据
const sanitizedAssets = JSON.parse(fs.readFileSync('backup-sanitizedAssets.json', 'utf8'));
sanitizedAssets.forEach(asset => saveSanitizedAsset(asset));
```

---

## 📝 总结

| 数据类型 | 文件路径 | 访问权限 | 用途 |
|---------|---------|---------|------|
| 原始资产 | `server/data/rawAssets.json` | 审核员/管理员 | 审核时查看真实信息 |
| 脱敏资产 | `server/data/sanitizedAssets.json` | 公开 | 前端展示、交易 |
| 凭证文件 | `server/uploads/` | 公开（需改进） | 审核凭证 |

---

## 🚀 未来改进建议

1. **数据库迁移**：考虑迁移到 MongoDB 或 PostgreSQL
2. **数据加密**：敏感数据加密存储
3. **访问控制**：上传文件添加访问权限控制
4. **数据备份**：自动备份机制
5. **数据同步**：多服务器数据同步

