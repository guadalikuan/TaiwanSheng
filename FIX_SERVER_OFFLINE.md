# 修复 "服务器离线" 问题

## 🔍 问题原因

前端显示"服务器离线"，原因是：

1. **环境变量配置错误**
   - `ServerStatusContext.jsx` 使用的环境变量名不正确
   - 默认端口设置为 `3001`，但后端实际运行在 `10000`

2. **健康检查路径错误**
   - 前端尝试访问 `/api/health`
   - 后端实际路径是 `/health`（不在 `/api` 下）

---

## ✅ 已修复

### 1. 修复 ServerStatusContext.jsx

**文件**: `src/contexts/ServerStatusContext.jsx`

**修复前**:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const response = await fetch(`${API_BASE_URL}/health`, {
```

**修复后**:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:10000';

// 健康检查端点不在 /api 下，直接在根路径
const healthUrl = API_BASE_URL.replace('/api', '') + '/health';
const response = await fetch(healthUrl, {
```

---

## 🔍 验证修复

### 检查后端服务器

```bash
# 检查进程
ps aux | grep "node.*server.mjs"

# 检查端口
lsof -i:10000

# 测试健康检查
curl http://localhost:10000/health
```

**期望结果**:
```json
{"status":"ok","timestamp":"2026-01-03T12:41:57.585Z"}
```

---

## 🚀 应用修复

### 方法 1: 刷新浏览器（推荐）

1. **硬刷新浏览器**
   - Windows: `Ctrl + Shift + R` 或 `Ctrl + F5`
   - Mac: `Cmd + Shift + R`

2. **清除缓存（如果硬刷新无效）**
   - 打开开发者工具 (F12)
   - 右键点击刷新按钮
   - 选择"清空缓存并硬性重新加载"

### 方法 2: 清除所有缓存

在浏览器控制台运行：
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

---

## 📋 当前配置

- **前端端口**: 5173
- **后端端口**: 10000
- **API 基础 URL**: `http://localhost:10000`
- **健康检查端点**: `http://localhost:10000/health`
- **环境变量**: `VITE_API_BASE_URL=http://localhost:10000`

---

## 🐛 故障排除

### 仍然显示"服务器离线"？

1. **检查浏览器控制台**
   - 打开开发者工具 (F12)
   - 查看 Console 标签的错误信息
   - 查看 Network 标签，检查 `/health` 请求的状态

2. **手动测试健康检查**
   ```bash
   curl http://localhost:10000/health
   ```
   应该返回 JSON 响应

3. **检查 CORS 配置**
   - 后端应该允许来自 `http://localhost:5173` 的请求
   - 健康检查端点不需要认证，应该可以正常访问

4. **检查防火墙**
   - 确保防火墙没有阻止端口 10000
   - 检查是否有安全软件阻止连接

---

## ✅ 修复验证清单

- [x] 后端服务器正在运行
- [x] 端口 10000 正在监听
- [x] 健康检查端点 `/health` 可访问
- [x] `ServerStatusContext.jsx` 使用正确的 API 地址
- [x] 健康检查路径已修正
- [ ] **浏览器已刷新**（需要您操作）

---

**修复完成后，页面顶部应该不再显示"服务器离线"提示！**

