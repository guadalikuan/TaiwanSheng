# 账户管理 API 404 错误排查指南

## 🔍 问题描述
账户管理页面显示：`API路径不存在，请检查后端路由配置`

## 📋 排查步骤

### 1. 检查后端服务是否运行

```bash
# 检查后端服务是否在运行
cd server
npm run dev

# 或者检查端口是否被占用
lsof -ti:3001
```

### 2. 检查路由是否正确注册

确认 `server/server.mjs` 中有以下代码：

```javascript
import usersRoutes from './routes/users.js';
// ...
app.use('/api/users', usersRoutes);
```

### 3. 测试 API 端点

使用 curl 或 Postman 测试：

```bash
# 需要先登录获取 token
curl -X GET http://localhost:3001/api/users/developers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. 检查后端日志

查看后端控制台是否有错误信息：
- 路由加载错误
- 导入错误
- 权限验证错误

### 5. 检查用户权限

确保登录的用户角色是 `ADMIN`：
- 用户名：`admin`
- 密码：`admin123456`
- 角色必须是 `ADMIN`

### 6. 重启后端服务

如果修改了路由配置，需要重启后端服务：

```bash
# 停止当前服务（Ctrl+C）
# 然后重新启动
cd server
npm run dev
```

## 🔧 常见问题

### Q: 后端服务没有运行
**解决方案**：
```bash
cd server
npm run dev
```

### Q: 端口被占用
**解决方案**：
```bash
# 查找占用端口的进程
lsof -ti:3001

# 杀死进程
kill -9 $(lsof -ti:3001)

# 重新启动
npm run dev
```

### Q: 路由文件语法错误
**解决方案**：
检查 `server/routes/users.js` 文件：
- 确保使用 ES6 模块语法：`export default router`
- 确保没有语法错误
- 确保所有导入的模块都存在

### Q: Token 无效或过期
**解决方案**：
- 重新登录获取新的 token
- 检查 localStorage 中的 `tws_token` 是否存在
- 清除浏览器缓存后重新登录

## ✅ 验证步骤

1. **后端服务运行**：
   ```bash
   curl http://localhost:3001/health
   # 应该返回: {"status":"ok","timestamp":"..."}
   ```

2. **路由已注册**：
   - 检查后端启动日志中是否有路由注册信息
   - 或者测试 `/api/users` 路径

3. **权限正确**：
   - 登录后检查用户角色是否为 `ADMIN`
   - 在浏览器控制台查看用户信息

4. **API 调用成功**：
   - 打开浏览器开发者工具
   - 查看 Network 标签
   - 检查 `/api/users/developers` 请求的响应

## 🆘 如果问题仍然存在

1. 检查后端控制台的所有错误信息
2. 检查浏览器控制台的网络请求详情
3. 确认 API 基础 URL 配置正确（`VITE_API_URL`）
4. 检查 CORS 配置是否允许前端域名

