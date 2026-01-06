# Leaflet 地图库更新说明

## 📋 更新概述

已更新 Leaflet 地图库到最新稳定版本。

---

## 🔄 更新内容

### 1. **当前版本**

- **Leaflet 版本**：`1.9.4`（最新稳定版）
- **更新日期**：2025-01-27

### 2. **更新位置**

#### A. npm 依赖

**文件**：`package.json`

```json
{
  "dependencies": {
    "leaflet": "^1.9.4"
  }
}
```

#### B. HTML 文件中的 CDN 链接

**文件**：`tw.html`, `mainland.html`

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
```

---

## 📦 使用 Leaflet 的组件

### 1. **MapLocationPicker 组件**

**文件**：`src/components/MapLocationPicker.jsx`

**功能**：
- 地图位置选择器
- 支持地理编码和反向地理编码
- 支持点击地图选择位置
- 支持拖拽标记

**导入**：
```javascript
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
```

### 2. **MapSection 组件**

**文件**：`src/components/MapSection.jsx`

**功能**：
- 首页地图展示
- 显示资产位置标记
- 支持地图交互

**导入**：
```javascript
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
```

---

## 🔧 图标配置

由于项目中使用了自定义图标，已配置禁用 Leaflet 默认图标以避免加载问题：

```javascript
const transparentGif = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

if (L.Icon.Default.prototype) {
  L.Icon.Default.mergeOptions({
    iconUrl: transparentGif,
    iconRetinaUrl: transparentGif,
    shadowUrl: transparentGif,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  });
}
```

---

## 📝 更新命令

### 检查当前版本

```bash
npm list leaflet
```

### 更新到最新版本

```bash
npm install leaflet@latest
```

### 检查可用版本

```bash
npm view leaflet versions
```

---

## 🔍 版本信息

### Leaflet 1.9.4 特性

- 稳定的地图渲染
- 支持多种地图瓦片源（OpenStreetMap、高德地图等）
- 支持标记（Markers）、弹出窗口（Popups）、图层（Layers）
- 支持移动端触摸操作
- 支持自定义控件

### 未来版本

- Leaflet 2.0.0-alpha 正在开发中（不推荐用于生产环境）
- 当前推荐使用 1.9.4 稳定版

---

## ⚠️ 注意事项

1. **兼容性**：Leaflet 1.9.4 与当前代码完全兼容，无需修改代码
2. **图标问题**：项目中使用自定义图标，已禁用默认图标加载
3. **CSS 导入**：确保导入 `leaflet/dist/leaflet.css` 以正确显示地图样式

---

## 📚 相关文件

- `package.json`：npm 依赖配置
- `src/components/MapLocationPicker.jsx`：地图位置选择器组件
- `src/components/MapSection.jsx`：地图展示组件
- `src/index.css`：地图样式定义
- `tw.html`：HTML 文件（包含 CDN 链接）
- `mainland.html`：HTML 文件（包含 CDN 链接）

---

## 🔗 相关资源

- [Leaflet 官方网站](https://leafletjs.com/)
- [Leaflet 文档](https://leafletjs.com/reference.html)
- [Leaflet GitHub](https://github.com/Leaflet/Leaflet)
- [Leaflet npm 包](https://www.npmjs.com/package/leaflet)

---

**最后更新**：2025-01-27

