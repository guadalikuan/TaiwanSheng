# 资产入库页面故障排除指南

## 🔍 问题诊断

如果 `http://localhost:5173/arsenal` 打不开，请按以下步骤检查：

### 1. 检查服务器状态

```bash
# 检查服务器是否运行
ps aux | grep vite

# 检查端口是否监听
lsof -i:5173

# 检查前端是否可以访问
curl http://localhost:5173
```

### 2. 检查浏览器控制台

打开浏览器开发者工具（F12），查看：
- **Console 标签**：是否有 JavaScript 错误
- **Network 标签**：是否有请求失败

### 3. 常见错误

#### 错误 1: "useAuth must be used within an AuthProvider"
**原因**：`ArsenalProtectedRoute` 使用了 `useAuth()`，但不在 `AuthProvider` 内

**解决**：检查 `main.jsx` 中是否有 `AuthProvider` 包裹整个 App

#### 错误 2: "useArsenalAuth must be used within an ArsenalAuthProvider"
**原因**：`ArsenalProtectedRoute` 使用了 `useArsenalAuth()`，但不在 `ArsenalAuthProvider` 内

**解决**：检查 `App.jsx` 中 `/arsenal` 路由是否被 `ArsenalAuthProvider` 包裹

#### 错误 3: 页面显示空白或加载中
**原因**：可能是认证检查逻辑问题

**解决**：
- 清除浏览器缓存
- 清除 localStorage 中的 token
- 刷新页面

### 4. 清除缓存和 Token

```javascript
// 在浏览器控制台运行
localStorage.removeItem('arsenal_token');
localStorage.removeItem('tws_token');
location.reload();
```

### 5. 检查路由配置

确认 `App.jsx` 中的路由配置：

```jsx
<Route 
  path="/arsenal" 
  element={
    <ArsenalAuthProvider>
      <ArsenalProtectedRoute allowedRoles={['SUBMITTER', 'DEVELOPER', 'ADMIN']}>
        <ArsenalEntry />
      </ArsenalProtectedRoute>
    </ArsenalAuthProvider>
  } 
/>
```

---

## ✅ 快速修复步骤

1. **清除浏览器缓存和 Token**
2. **刷新页面**
3. **检查浏览器控制台错误**
4. **确认服务器正在运行**

---

**如果问题仍然存在，请提供浏览器控制台的具体错误信息。**

