# 端口问题修复指南

## 🔍 问题诊断

**问题**: 无法访问 `http://localhost:5173/test-amap`

**原因**: Vite 服务器实际运行在端口 **5174**，而不是配置的 5173

**状态**: 
- 配置文件端口: 5173
- 实际监听端口: 5174
- 服务器状态: ✅ 正常运行

---

## ✅ 快速解决方案

### 方案 1: 使用当前端口（推荐，最快）

直接访问当前运行的端口：

```
http://localhost:5174/test-amap
```

或者访问首页：
```
http://localhost:5174
```

### 方案 2: 重启服务器使用正确端口

1. **停止当前服务器**:
   - 找到运行服务器的终端窗口
   - 按 `Ctrl + C` 停止服务器

2. **重启服务器**:
   ```bash
   npm run dev
   ```

3. **访问测试页面**:
   ```
   http://localhost:5173/test-amap
   ```

---

## 🔍 检查当前端口

### 方法 1: 查看终端输出

查看运行 `npm run dev` 的终端窗口，应该会显示：
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5174/
  ➜  Network: use --host to expose
```

### 方法 2: 检查监听端口

在终端运行：
```bash
lsof -i -P | grep LISTEN | grep node
```

或：
```bash
netstat -an | grep LISTEN | grep 517
```

---

## 📝 其他路由测试

如果端口 5174 可以访问，你也可以测试其他页面：

- 首页: `http://localhost:5174/`
- 登录页: `http://localhost:5174/login`
- 资产入库: `http://localhost:5174/arsenal`
- **测试页面**: `http://localhost:5174/test-amap` ⭐

---

## 🔧 永久修复（可选）

如果想确保始终使用 5173 端口，可以：

1. **检查是否有其他进程占用 5173**:
   ```bash
   lsof -ti:5173
   ```

2. **如果被占用，找到并关闭该进程**:
   ```bash
   # 查看进程详情
   lsof -ti:5173 | xargs ps -p
   
   # 关闭进程（替换 PID）
   kill -9 <PID>
   ```

3. **修改 vite.config.js 使用固定端口**:
   ```javascript
   server: {
     port: 5173,
     strictPort: true, // 如果端口被占用则失败而不是切换
     // ...
   }
   ```

---

## ✅ 验证

访问测试页面后，应该能看到：

- ✅ API Key 配置状态显示
- ✅ 测试按钮（如果已配置 API Key）
- ✅ 使用说明

如果看到这些内容，说明一切正常！

---

**最后更新**: 2025-01-03

