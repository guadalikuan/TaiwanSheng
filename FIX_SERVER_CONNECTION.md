# 修复"无法连接到服务器"问题

## ✅ 当前状态

后端服务器已成功启动：
- **进程ID**: 正在运行
- **端口**: 10000 (正在监听)
- **健康检查**: http://localhost:10000/health ✅
- **API端点**: http://localhost:10000/api ✅

---

## 🔧 解决步骤

### 步骤 1: 刷新浏览器

1. **硬刷新浏览器页面**
   - Windows/Linux: `Ctrl + Shift + R`
   - macOS: `Cmd + Shift + R`
   
   这将清除缓存并重新加载页面。

---

### 步骤 2: 检查前端服务器

确认前端服务器正在运行：

```bash
# 检查端口 5173 是否在监听
lsof -i:5173
```

如果前端未运行，启动它：

```bash
cd /Users/fanann/tws
npm run dev
```

---

### 步骤 3: 检查浏览器控制台

1. 打开浏览器开发者工具（F12）
2. 查看 **Console** 标签的错误信息
3. 查看 **Network** 标签：
   - 找到失败的请求
   - 检查请求 URL 是否为 `http://localhost:10000`
   - 查看状态码和错误信息

---

### 步骤 4: 检查环境变量

确认前端使用的是正确的 API 地址：

```javascript
// 在浏览器控制台运行
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
console.log('API URL:', import.meta.env.VITE_API_URL);
```

**应该显示**: `http://localhost:10000` 或空（会使用默认值）

---

### 步骤 5: 测试 API 连接

在浏览器控制台运行：

```javascript
// 测试健康检查端点
fetch('http://localhost:10000/health')
  .then(r => r.json())
  .then(d => console.log('✅ 健康检查成功:', d))
  .catch(e => console.error('❌ 连接失败:', e));
```

如果这个测试成功，说明网络连接正常。

---

## 🐛 常见问题

### 问题 1: CORS 错误

**症状**: 浏览器控制台显示 CORS 相关错误

**解决**: 后端应该已经配置了 CORS，允许来自 `http://localhost:5173` 的请求。

如果仍有问题，检查 `server/server.mjs` 中的 CORS 配置。

---

### 问题 2: 端口被占用

**症状**: 后端服务器无法启动

**解决**:

```bash
# 查找占用端口 10000 的进程
lsof -i:10000

# 杀死进程（替换 PID）
kill -9 <PID>
```

---

### 问题 3: 防火墙阻止连接

**症状**: 所有请求都超时

**解决**: 检查系统防火墙设置，确保允许本地连接。

---

### 问题 4: 环境变量未加载

**症状**: API 请求发送到错误的地址

**解决**:

1. 确保 `.env` 文件存在且包含：
   ```
   VITE_API_BASE_URL=http://localhost:10000
   ```

2. 重启前端开发服务器（环境变量在启动时加载）

---

## 📋 快速诊断命令

```bash
# 1. 检查后端服务器
ps aux | grep "[n]ode.*server.mjs"
lsof -i:10000

# 2. 测试健康检查
curl http://localhost:10000/health

# 3. 测试 API
curl http://localhost:10000/api/arsenal/submit

# 4. 检查前端服务器
lsof -i:5173
```

---

## ✅ 验证清单

- [ ] 后端服务器正在运行
- [ ] 端口 10000 正在监听
- [ ] 健康检查端点返回 `{"status":"ok"}`
- [ ] 前端服务器正在运行（端口 5173）
- [ ] 浏览器控制台没有 CORS 错误
- [ ] API 请求 URL 正确（`http://localhost:10000`）
- [ ] 已刷新浏览器页面

---

## 🆘 如果仍然无法连接

请提供以下信息：

1. **浏览器控制台错误**（F12 → Console）
2. **网络请求详情**（F12 → Network → 失败的请求）
3. **后端服务器日志**：
   ```bash
   tail -50 /tmp/tws-backend.log
   ```

---

**最后更新**: 2026-01-03

