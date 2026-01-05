# 修复 "Failed to fetch" 错误

## 🔍 问题原因

前端无法连接到后端API，原因是：

1. **环境变量名称不匹配**
   - 前端代码使用 `VITE_API_URL`
   - `.env` 文件使用 `VITE_API_BASE_URL`

2. **端口配置错误**
   - 后端运行在端口 `10000`
   - `.env` 中配置的是 `3001`

---

## ✅ 已修复

### 1. 修复前端 API 配置

**文件**: `src/utils/api.js`

**修复前**:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

**修复后**:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:10000';
```

### 2. 更新环境变量

**文件**: `.env`

**修复前**:
```
VITE_API_BASE_URL=http://localhost:3001
```

**修复后**:
```
VITE_API_BASE_URL=http://localhost:10000
```

---

## 🔄 重启服务器

已重启开发服务器以应用更改。

---

## ✅ 验证修复

### 检查服务器状态

```bash
# 前端服务器
lsof -i:5173

# 后端服务器
lsof -i:10000
```

### 测试API连接

```bash
# 测试后端API（会返回401，说明连接正常）
curl http://localhost:10000/api/auth/me
```

### 浏览器检查

1. 打开浏览器开发者工具（F12）
2. 查看 **Network** 标签
3. 访问 `/arsenal` 页面
4. 查看API请求是否指向 `http://localhost:10000`

---

## 🐛 如果仍然失败

### 1. 清除浏览器缓存

```javascript
// 在浏览器控制台运行
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 2. 检查 CORS 配置

后端应该已经配置了 CORS，允许来自 `http://localhost:5173` 的请求。

### 3. 检查防火墙

确保防火墙没有阻止端口 10000。

### 4. 查看服务器日志

```bash
# 查看前端日志
tail -f /tmp/tws-dev.log

# 查看后端日志
tail -f /tmp/tws-server.log
```

---

## 📋 配置总结

- **前端端口**: 5173
- **后端端口**: 10000
- **API 基础URL**: `http://localhost:10000`
- **环境变量**: `VITE_API_BASE_URL=http://localhost:10000`

---

**修复完成后，应该可以正常访问资产入库系统了！**

