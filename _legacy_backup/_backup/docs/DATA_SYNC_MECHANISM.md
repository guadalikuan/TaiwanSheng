# 数据同步机制说明

## 📋 概述

**是的，入库数据变化时，data 文档会实时更新。**

所有数据操作都会立即同步到 `server/data/` 目录下的 JSON 文件。

---

## 🔄 数据同步流程

### 1. 资产入库时

**操作**：用户提交资产

**流程**：
```
用户提交资产表单
    ↓
POST /api/arsenal/submit
    ↓
saveRawAsset() → 写入 rawAssets.json ✅
    ↓
wrapAsset() → 脱敏处理
    ↓
saveSanitizedAsset() → 写入 sanitizedAssets.json ✅
```

**文件变化**：
- `rawAssets.json`：立即添加新的原始资产记录
- `sanitizedAssets.json`：立即添加新的脱敏资产记录

---

### 2. 审核确权时

**操作**：审核员批准/拒绝资产

**流程**：
```
审核员批准资产
    ↓
PUT /api/arsenal/approve/:id
    ↓
updateAssetStatus() → 更新 sanitizedAssets.json ✅
    ↓
状态：MINTING → AVAILABLE
```

**文件变化**：
- `sanitizedAssets.json`：立即更新对应资产的状态和审核历史
- `rawAssets.json`：**不变化**（原始数据保持不变）

---

### 3. 编辑资产时

**操作**：编辑待审核资产

**流程**：
```
编辑资产信息
    ↓
PUT /api/arsenal/edit/:id
    ↓
updateRawAsset() → 更新 rawAssets.json ✅
    ↓
重新脱敏 → 更新 sanitizedAssets.json ✅
```

**文件变化**：
- `rawAssets.json`：立即更新原始资产数据
- `sanitizedAssets.json`：立即更新脱敏资产数据（重新生成）

---

## 💾 数据写入机制

### 同步写入（立即生效）

所有数据操作都使用 **同步写入**（`writeFileSync`），确保：

1. ✅ **实时同步**：操作完成后立即写入文件
2. ✅ **数据持久化**：服务器重启后数据不丢失
3. ✅ **原子操作**：每次写入都是完整的文件替换

### 写入流程

```javascript
// 示例：保存原始资产
export const saveRawAsset = (rawAsset) => {
  const assets = getRawAssets();        // 1. 读取现有数据
  assets.push(rawAsset);                // 2. 添加新数据
  writeFileSync(RAW_ASSETS_FILE, ...);  // 3. 立即写入文件 ✅
  return rawAsset;
};
```

---

## 📊 数据变化场景

### 场景 1: 新增资产

**触发**：用户提交资产入库

**文件变化**：
- `rawAssets.json`：数组长度 +1
- `sanitizedAssets.json`：数组长度 +1

**示例**：
```json
// rawAssets.json 变化前：100 条记录
// rawAssets.json 变化后：101 条记录 ✅
```

---

### 场景 2: 审核资产

**触发**：审核员批准/拒绝

**文件变化**：
- `sanitizedAssets.json`：对应资产的状态字段更新
- `sanitizedAssets.json`：添加审核历史记录
- `rawAssets.json`：**不变**

**示例**：
```json
// sanitizedAssets.json 中某个资产
{
  "id": "raw_123...",
  "status": "MINTING",  // 变化前
  // ...
}
// 变化后
{
  "id": "raw_123...",
  "status": "AVAILABLE",  // ✅ 已更新
  "reviewHistory": [      // ✅ 新增审核记录
    {
      "status": "AVAILABLE",
      "reviewedBy": "fanann",
      "reviewedAt": 1234567890
    }
  ]
}
```

---

### 场景 3: 编辑资产

**触发**：编辑待审核资产

**文件变化**：
- `rawAssets.json`：对应资产的字段更新
- `sanitizedAssets.json`：重新生成脱敏数据

**示例**：
```json
// rawAssets.json 中某个资产
{
  "id": "raw_123...",
  "area": 120,  // 变化前
  // ...
}
// 变化后
{
  "id": "raw_123...",
  "area": 150,  // ✅ 已更新
  "updatedAt": 1234567890  // ✅ 新增更新时间
}
```

---

## 🔍 验证数据变化

### 方法 1: 直接查看文件

```bash
# 查看原始资产数量
cat server/data/rawAssets.json | jq '. | length'

# 查看脱敏资产数量
cat server/data/sanitizedAssets.json | jq '. | length'

# 查看最新添加的资产
cat server/data/rawAssets.json | jq '.[-1]'
```

### 方法 2: 监控文件变化

```bash
# 实时监控文件变化
watch -n 1 'wc -l server/data/rawAssets.json server/data/sanitizedAssets.json'
```

### 方法 3: 通过 API 查看

```bash
# 获取资产统计
curl http://localhost:3001/api/arsenal/stats

# 获取待审核资产数量
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/arsenal/pending
```

---

## ⚡ 性能考虑

### 当前实现

- **同步写入**：每次操作都立即写入文件
- **完整文件替换**：每次写入都是整个文件

### 优点

- ✅ 数据实时同步
- ✅ 简单可靠
- ✅ 无需额外配置

### 缺点

- ⚠️ 大量数据时可能较慢
- ⚠️ 并发写入可能有问题（当前单进程运行，影响不大）

### 优化建议（未来）

1. **批量写入**：累积多个操作后批量写入
2. **增量更新**：只更新变化的部分
3. **数据库迁移**：迁移到 MongoDB 等数据库

---

## 📝 数据一致性

### 保证机制

1. **ID 关联**：原始数据和脱敏数据通过 `id` 字段关联
2. **同步操作**：所有写入都是同步的，确保完成
3. **错误处理**：写入失败会抛出异常，不会出现部分写入

### 数据关联

```javascript
// 原始资产
{
  "id": "raw_1234567890_abc123",  // ← 关联ID
  "ownerName": "张三",
  // ...
}

// 脱敏资产
{
  "id": "raw_1234567890_abc123",  // ← 相同的ID
  "codeName": "CN-XI-BKR-4921",
  "internalRef": "raw_1234567890_abc123",  // ← 内部引用
  // ...
}
```

---

## ✅ 总结

| 操作 | rawAssets.json | sanitizedAssets.json |
|------|---------------|---------------------|
| 新增资产 | ✅ 立即添加 | ✅ 立即添加 |
| 审核批准 | ❌ 不变 | ✅ 更新状态 |
| 审核拒绝 | ❌ 不变 | ✅ 更新状态 |
| 编辑资产 | ✅ 立即更新 | ✅ 重新生成 |
| 删除资产 | ⚠️ 暂不支持 | ⚠️ 暂不支持 |

**结论**：
- ✅ **数据会实时同步**到 data 文档
- ✅ **所有操作都会立即写入**文件
- ✅ **数据持久化**，服务器重启后数据不丢失
- ✅ **数据一致性**通过 ID 关联保证

---

## 🔧 测试验证

### 测试步骤

1. **提交新资产**：
   ```bash
   # 提交资产后立即查看
   cat server/data/rawAssets.json | jq '.[-1]'
   ```

2. **审核资产**：
   ```bash
   # 批准后查看状态变化
   cat server/data/sanitizedAssets.json | jq '.[0].status'
   ```

3. **验证同步**：
   ```bash
   # 查看文件修改时间
   ls -lh server/data/*.json
   ```

---

## 📌 注意事项

1. **文件锁定**：大量并发写入可能导致文件锁定（当前单进程运行，影响不大）
2. **数据备份**：建议定期备份 `server/data/` 目录
3. **文件大小**：随着数据增长，文件会变大，读取/写入可能变慢
4. **版本控制**：`.gitignore` 中应排除这些文件（包含敏感信息）

