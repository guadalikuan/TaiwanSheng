# 地图地址搜索标准

## 📍 概述

系统使用 **OpenStreetMap Nominatim API** 进行地址搜索和地理编码，支持中文地址查询和反向地理编码。

---

## 🔍 搜索标准

### 1. **API 服务**

- **服务提供商**: OpenStreetMap Nominatim
- **API 端点**: `https://nominatim.openstreetmap.org/search`
- **反向地理编码**: `https://nominatim.openstreetmap.org/reverse`
- **特点**: 免费、无需 API Key、支持中文

### 2. **搜索范围限制**

```javascript
countrycodes=cn  // 限制搜索范围为中国境内
```

- ✅ 只搜索中国境内的地址
- ✅ 提高搜索准确性和速度
- ✅ 避免返回国外同名地址

### 3. **语言设置**

```javascript
accept-language=zh-CN  // 返回中文地址
```

- ✅ 地址结果以中文显示
- ✅ 支持中文地址查询
- ✅ 返回的地址名称使用中文

### 4. **查询字符串构建规则**

系统会自动优化查询字符串以提高搜索准确性：

#### 规则 1: 包含省份信息
```javascript
if (province && !addressQuery.includes(province)) {
  query = `${province}${city}${addressQuery}`;
}
// 示例：用户输入"曲江路123号"
// 实际查询："陕西省西安市曲江路123号"
```

#### 规则 2: 仅包含城市信息
```javascript
else if (!addressQuery.includes(city)) {
  query = `${city} ${addressQuery}`;
}
// 示例：用户输入"曲江路123号"
// 实际查询："西安市 曲江路123号"
```

#### 规则 3: 已包含完整信息
```javascript
// 如果用户输入已包含省份或城市，直接使用
query = addressQuery;
// 示例：用户输入"陕西省西安市曲江路123号"
// 实际查询："陕西省西安市曲江路123号"
```

### 5. **结果处理**

#### 返回数量
```javascript
limit=1  // 只返回第一个匹配结果
```

- ✅ 返回最相关的第一个结果
- ✅ 避免用户选择困难
- ✅ 提高响应速度

#### 地址详情
```javascript
addressdetails=1  // 返回详细的地址组成部分
```

返回的地址信息包括：
- `display_name`: 完整地址字符串
- `lat` / `lon`: 经纬度坐标
- `type`: 地址类型（building, road, city 等）
- `address`: 地址组成部分（省、市、区、街道等）

### 6. **地图缩放级别**

根据返回的地址类型自动调整地图缩放级别：

```javascript
const zoom = result.type === 'building' || result.type === 'house' ? 18 :  // 建筑物/房屋：最大缩放
             result.type === 'road' ? 17 :                                  // 道路：中等缩放
             result.type === 'city' || result.type === 'town' ? 13 : 15;   // 城市/城镇：较小缩放
```

| 地址类型 | 缩放级别 | 说明 |
|---------|---------|------|
| `building` / `house` | 18 | 建筑物级别，最详细 |
| `road` | 17 | 道路级别 |
| `city` / `town` | 13 | 城市级别，较宽视野 |
| 其他 | 15 | 默认中等缩放 |

---

## 📝 推荐的地址输入格式

### ✅ 最佳格式（推荐）

1. **完整地址**
   ```
   陕西省西安市雁塔区曲江路123号
   ```

2. **包含区/县的详细地址**
   ```
   西安市雁塔区曲江路123号
   ```

3. **包含街道和门牌号**
   ```
   曲江路123号
   ```

4. **地标建筑**
   ```
   大雁塔
   西安钟楼
   ```

### ⚠️ 可能不准确的格式

1. **仅输入城市名**
   ```
   西安  // 可能定位到城市中心，不够精确
   ```

2. **过于简略的地址**
   ```
   路123号  // 缺少城市和区县信息
   ```

3. **模糊的描述**
   ```
   某个小区  // 无法精确定位
   ```

---

## 🔄 反向地理编码（坐标 → 地址）

当用户**点击地图**或**拖动标记**时，系统会自动进行反向地理编码：

### API 调用
```javascript
https://nominatim.openstreetmap.org/reverse?
  format=json&
  lat={纬度}&
  lon={经度}&
  zoom=18&
  addressdetails=1&
  accept-language=zh-CN
```

### 参数说明

| 参数 | 值 | 说明 |
|-----|-----|------|
| `format` | `json` | 返回 JSON 格式 |
| `lat` | 纬度 | 点击位置的纬度 |
| `lon` | 经度 | 点击位置的经度 |
| `zoom` | `18` | 详细级别（18 为最详细） |
| `addressdetails` | `1` | 返回详细地址组成部分 |
| `accept-language` | `zh-CN` | 返回中文地址 |

### 使用场景

1. **点击地图任意位置** → 自动获取该位置的地址
2. **拖动标记** → 拖动结束后获取新位置的地址
3. **显示当前坐标** → 实时显示经纬度和地址

---

## ⚙️ 技术实现细节

### 1. **请求头设置**

```javascript
headers: {
  'User-Agent': 'TWS-Asset-Management-System/1.0',
}
```

- ✅ 符合 Nominatim 使用规范
- ✅ 避免请求被拒绝

### 2. **错误处理**

```javascript
// 搜索失败时的错误提示
if (data && data.length > 0) {
  // 成功：更新地图和标记
} else {
  setSearchError('未找到该地址，请尝试更详细的地址描述');
}
```

### 3. **编码处理**

```javascript
const encodedQuery = encodeURIComponent(query);
```

- ✅ 正确处理中文和特殊字符
- ✅ 避免 URL 编码问题

---

## 📊 搜索流程示例

### 示例 1: 用户输入"曲江路123号"

```
1. 用户输入: "曲江路123号"
   ↓
2. 系统检测: 不包含省份和城市
   ↓
3. 构建查询: "西安市 曲江路123号"
   ↓
4. API 请求: 
   https://nominatim.openstreetmap.org/search?
     q=西安市%20曲江路123号&
     countrycodes=cn&
     limit=1&
     accept-language=zh-CN
   ↓
5. 返回结果: 
   {
     "display_name": "曲江路123号, 雁塔区, 西安市, 陕西省, 中国",
     "lat": "34.234567",
     "lon": "108.987654",
     "type": "building"
   }
   ↓
6. 更新地图: 
   - 标记位置: [34.234567, 108.987654]
   - 缩放级别: 18 (building 类型)
   - 显示地址: "曲江路123号, 雁塔区, 西安市, 陕西省, 中国"
```

### 示例 2: 用户输入"陕西省西安市雁塔区曲江路123号"

```
1. 用户输入: "陕西省西安市雁塔区曲江路123号"
   ↓
2. 系统检测: 已包含省份和城市
   ↓
3. 构建查询: "陕西省西安市雁塔区曲江路123号" (直接使用)
   ↓
4. API 请求: (同上)
   ↓
5. 返回结果: (同上)
```

---

## 🎯 最佳实践

### 对用户

1. **输入详细地址**：包含省、市、区、街道、门牌号
2. **使用地标名称**：如"大雁塔"、"钟楼"等
3. **检查搜索结果**：确认返回的地址是否正确
4. **手动调整**：如果搜索结果不准确，可以点击地图或拖动标记

### 对开发者

1. **缓存常用地址**：减少 API 调用
2. **防抖处理**：避免频繁请求
3. **错误重试**：网络错误时自动重试
4. **用户反馈**：提供清晰的错误提示

---

## ⚠️ 限制和注意事项

### 1. **API 使用限制**

- Nominatim 有请求频率限制（建议每秒不超过 1 次）
- 大量请求可能被限制，建议添加缓存机制

### 2. **地址准确性**

- 依赖 OpenStreetMap 数据质量
- 新建或偏远地区可能数据不完整
- 建议用户手动验证地址准确性

### 3. **网络依赖**

- 需要稳定的网络连接
- 离线环境无法使用
- 建议添加离线地图支持（可选）

---

## 📚 相关文档

- [OpenStreetMap Nominatim API 文档](https://nominatim.org/release-docs/latest/api/Search/)
- [反向地理编码文档](https://nominatim.org/release-docs/latest/api/Reverse/)
- [MapLocationPicker 组件文档](../src/components/MapLocationPicker.jsx)

---

**最后更新**: 2025-01-XX
**维护者**: TWS 开发团队

