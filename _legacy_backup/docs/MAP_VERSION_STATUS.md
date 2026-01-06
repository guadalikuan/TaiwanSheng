# 地图版本状态

## 📍 当前版本信息

**更新日期**: 2025-01-XX

---

## 🗺️ Leaflet 地图库

### 当前版本
- **版本号**: `1.9.4`
- **状态**: ✅ **最新稳定版**
- **位置**: `package.json`

### 版本检查

```bash
# 检查当前安装的版本
npm list leaflet

# 查看 npm 上的最新版本
npm view leaflet version

# 查看所有可用版本
npm view leaflet versions --json
```

### 版本对比

| 版本 | 状态 | 说明 |
|------|------|------|
| `1.9.4` | ✅ 当前使用 | 最新稳定版，推荐生产环境使用 |
| `2.0.0-alpha` | ⚠️ 预发布 | 测试版本，不推荐生产环境 |

---

## 🗺️ 地图瓦片服务

### 1. OpenStreetMap 标准瓦片

**使用位置**: `MapLocationPicker.jsx` (资产入库界面)

```javascript
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '© OpenStreetMap contributors',
  crossOrigin: true,
})
```

**特点**:
- ✅ 免费，开源
- ✅ 数据实时更新（每日更新）
- ✅ 浅色主题，适合房地产展示
- ✅ 全球覆盖

**更新频率**: 每天更新

---

### 2. CartoDB 暗色瓦片

**使用位置**: `MapSection.jsx` (首页地图)

```javascript
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
  maxZoom: 19,
  subdomains: 'abcd',
  crossOrigin: true,
})
```

**特点**:
- ✅ 免费（有限制）
- ✅ 暗色主题，适合展示资产标记
- ✅ 高质量渲染
- ✅ 支持高缩放级别（maxZoom: 19）

**更新频率**: 实时或每日更新

---

## 📊 地理编码服务

### Nominatim API

**使用位置**: `MapLocationPicker.jsx`

```javascript
// 正向地理编码（地址 → 坐标）
https://nominatim.openstreetmap.org/search?
  format=json&
  q={地址}&
  countrycodes=cn&
  limit=1&
  accept-language=zh-CN

// 反向地理编码（坐标 → 地址）
https://nominatim.openstreetmap.org/reverse?
  format=json&
  lat={纬度}&
  lon={经度}&
  zoom=18&
  accept-language=zh-CN
```

**特点**:
- ✅ 免费，无需 API Key
- ✅ 支持中文地址
- ✅ 限制为中国境内搜索
- ✅ 数据实时更新

**更新频率**: 实时更新

---

## ✅ 版本状态总结

### 地图库
- ✅ **Leaflet**: `1.9.4` - 最新稳定版
- ✅ **无需更新**

### 地图数据
- ✅ **OpenStreetMap**: 每日更新
- ✅ **CartoDB**: 实时更新
- ✅ **Nominatim**: 实时更新

### 结论
**所有地图相关服务均为最新版本，无需更新。**

---

## 🔄 如何更新（如果需要）

### 更新 Leaflet

```bash
# 更新到最新稳定版
npm install leaflet@latest

# 或更新到特定版本
npm install leaflet@1.9.4
```

### 更新 CDN 链接（HTML 文件）

如果使用 CDN，更新以下文件中的链接：

- `tw.html`
- `mainland.html`

```html
<!-- 更新前 -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<!-- 更新后（如果有新版本） -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@最新版本/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@最新版本/dist/leaflet.js"></script>
```

---

## 📝 注意事项

1. **Leaflet 2.0**: 当前只有 alpha 版本，不推荐用于生产环境
2. **瓦片服务**: 免费服务可能有使用限制，大量请求时需注意
3. **数据准确性**: OpenStreetMap 依赖社区贡献，偏远地区可能数据不完整

---

## 🔗 相关链接

- [Leaflet 官方网站](https://leafletjs.com/)
- [Leaflet GitHub](https://github.com/Leaflet/Leaflet)
- [Leaflet npm 包](https://www.npmjs.com/package/leaflet)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Nominatim API 文档](https://nominatim.org/release-docs/latest/api/Search/)

---

**最后更新**: 2025-01-XX
**维护者**: TWS 开发团队

