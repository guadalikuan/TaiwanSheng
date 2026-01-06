# 资产按地区显示功能说明

## 📋 功能概述

资产市场页面现在支持**按地区（城市）分组显示**已被录入的资产，用户可以更直观地查看不同城市的资产分布情况。

---

## 🎯 功能特性

### 1. **按地区筛选**
- 筛选栏显示所有有资产的城市列表
- 点击城市名称可筛选该城市的资产
- "全部地区"按钮显示所有资产

### 2. **按地区分组展示**
- 资产列表按城市分组显示
- 每个城市显示：
  - 城市名称（带地图图标）
  - 该城市的资产数量
  - 该城市下的所有资产卡片

### 3. **城市信息显示**
- 每个资产卡片保留原有的军事风格包装
- 城市信息从原始资产数据中提取
- 如果无法获取城市信息，会尝试从战区代码（locationTag）反向映射

---

## 🔧 技术实现

### 后端修改

#### 1. **修改 `/api/arsenal/assets` 端点**

**文件**: `server/routes/arsenal.js`

**修改内容**:
- 返回已审核通过的资产时，为每个资产添加城市信息
- 从原始资产数据（rawAssets.json）中查找城市信息
- 如果找不到，则从战区代码（locationTag）反向映射

```javascript
// GET /api/arsenal/assets - 获取所有已审核通过的资产（用于前端展示）
router.get('/assets', (req, res) => {
  try {
    const approvedAssets = getApprovedAssets();
    const allAssets = getAllAssets();
    
    // 为每个资产添加城市信息
    const assetsWithCity = approvedAssets.map(sanitized => {
      // 尝试从原始数据中获取城市信息
      let city = 'UNKNOWN';
      if (sanitized.internalRef) {
        const rawAsset = allAssets.raw.find(r => r.id === sanitized.internalRef || r.id === sanitized.id);
        if (rawAsset && rawAsset.city) {
          city = rawAsset.city;
        }
      }
      
      // 如果还是没有城市，尝试从locationTag中提取
      if (city === 'UNKNOWN' && sanitized.locationTag) {
        const locationMap = {
          'CN-NW-CAPITAL': '西安',
          'CN-NW-SUB': '咸阳',
          'CN-IND-HUB': '宝鸡',
          'CN-QINLING-MTN': '商洛',
          'CN-INT-RES': '汉中'
        };
        city = locationMap[sanitized.locationTag] || sanitized.locationTag;
      }
      
      return {
        ...sanitized,
        city: city
      };
    });
    
    res.json({
      success: true,
      count: assetsWithCity.length,
      assets: assetsWithCity
    });
  } catch (error) {
    // ... 错误处理
  }
});
```

---

### 前端修改

#### 1. **修改资产映射器**

**文件**: `src/utils/assetMapper.js`

**修改内容**:
- `mapSanitizedAssetToMarketFormat` 函数现在接受原始资产数据作为参数
- 优先使用原始资产数据中的城市信息
- 保留城市信息在映射后的资产对象中

```javascript
export const mapSanitizedAssetToMarketFormat = (sanitizedAsset, rawAsset = null) => {
  // 优先使用原始资产数据中的城市信息
  let city = 'UNKNOWN';
  if (rawAsset && rawAsset.city) {
    city = rawAsset.city;
  } else if (sanitizedAsset.city) {
    city = sanitizedAsset.city;
  }
  // ...
  return {
    // ...
    city: city, // 添加城市信息
    // ...
  };
};
```

#### 2. **修改资产市场组件**

**文件**: `src/components/BlackMarket.jsx`

**新增功能**:

1. **按地区分组函数**:
```javascript
const groupAssetsByCity = (assetsList) => {
  const grouped = {};
  assetsList.forEach(asset => {
    const city = asset.city || 'UNKNOWN';
    if (!grouped[city]) {
      grouped[city] = [];
    }
    grouped[city].push(asset);
  });
  return grouped;
};
```

2. **获取城市列表函数**:
```javascript
const getCityList = (assetsList) => {
  const cities = new Set();
  assetsList.forEach(asset => {
    if (asset.city) {
      cities.add(asset.city);
    }
  });
  return Array.from(cities).sort();
};
```

3. **筛选栏更新**:
- 从固定的战区筛选改为动态的城市筛选
- 显示"全部地区"和所有有资产的城市

4. **资产列表展示**:
- 按城市分组显示
- 每个城市显示标题和资产数量
- 每个城市下的资产以网格形式展示

---

## 📊 数据流

```
1. 用户点击"资产"按钮
   ↓
2. 前端调用 getApprovedAssets() API
   ↓
3. 后端从 storage.js 获取已审核通过的资产
   ↓
4. 后端从 rawAssets.json 查找每个资产的城市信息
   ↓
5. 后端返回包含城市信息的资产列表
   ↓
6. 前端使用 assetMapper 映射数据
   ↓
7. 前端按城市分组并显示
```

---

## 🎨 UI 变化

### 筛选栏
- **之前**: 固定的战区筛选（ALL, NORTH-WEST, SOUTH-WEST, CENTRAL, COASTAL(RISKY)）
- **现在**: 动态的城市筛选（全部地区 + 所有有资产的城市）

### 资产列表
- **之前**: 统一的资产网格，不分组
- **现在**: 按城市分组的资产列表
  - 每个城市显示标题和资产数量
  - 每个城市下的资产以网格形式展示

---

## ✅ 使用示例

### 场景1: 查看所有资产
1. 打开资产市场页面
2. 点击"全部地区"按钮（默认选中）
3. 看到所有资产，按城市分组显示

### 场景2: 查看特定城市的资产
1. 打开资产市场页面
2. 点击筛选栏中的城市名称（如"西安"）
3. 只显示该城市的资产

### 场景3: 资产数量显示
- 每个城市标题下方显示该城市的资产数量
- 例如："西安 (5 项资产)"

---

## 🔍 注意事项

1. **城市信息来源**:
   - 优先使用原始资产数据中的城市信息
   - 如果找不到，则从战区代码反向映射
   - 如果都无法获取，则显示"UNKNOWN"

2. **城市排序**:
   - 城市列表按字母顺序排序
   - 资产分组中的城市也按字母顺序排序

3. **兼容性**:
   - 如果资产没有城市信息，会被归入"UNKNOWN"分组
   - 旧的资产数据会尝试从战区代码映射城市

---

## 📝 未来优化建议

1. **地区聚合**: 可以添加省/自治区级别的聚合显示
2. **地图视图**: 在地图上标注每个城市的资产分布
3. **统计信息**: 显示每个城市的资产总数、总价值等统计信息
4. **排序功能**: 支持按资产数量、总价值等排序城市

---

**最后更新**: 2025-01-27

