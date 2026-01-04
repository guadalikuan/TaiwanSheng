# 加载数据失败问题排查指南

## 🔍 问题现象

前端显示："加载数据失败，请检查后端服务是否运行"

---

## ✅ 快速检查清单

### 1. **检查后端服务是否运行**

```bash
# 检查端口3001是否有服务在监听
lsof -i :3001

# 或者检查进程
ps aux | grep "node.*server.mjs"
```

**期望结果**：应该有node进程在运行

### 2. **测试后端健康检查**

```bash
curl http://localhost:3001/health
```

**期望结果**：
```json
{"status":"ok","timestamp":"2025-12-28T..."}
```

### 3. **检查登录状态**

打开浏览器开发者工具（F12），在Console中执行：
```javascript
localStorage.getItem('tws_token')
```

**期望结果**：应该返回一个JWT token字符串

如果返回 `null`，说明未登录，需要先登录。

### 4. **检查API地址配置**

检查前端环境变量：
- 打开浏览器开发者工具（F12） → Console
- 执行：`console.log(import.meta.env.VITE_API_URL)`

**期望结果**：应该是 `http://localhost:3001` 或正确的后端URL

---

## 🛠️ 常见问题及解决方案

### 问题1：后端服务未启动

**症状**：
- `lsof -i :3001` 没有输出
- `curl http://localhost:3001/health` 连接失败

**解决方案**：
```bash
cd server
node server.mjs
```

或者：
```bash
npm run dev:backend
```

### 问题2：未登录或token过期

**症状**：
- `localStorage.getItem('tws_token')` 返回 `null`
- 错误信息包含 "登录已过期" 或 "未登录"

**解决方案**：
1. 访问登录页面：`http://localhost:5173/login`
2. 使用账户登录
3. 登录成功后会自动保存token

### 问题3：网络连接问题

**症状**：
- 错误信息包含 "无法连接到服务器"
- 浏览器控制台显示 CORS 错误

**解决方案**：
1. 确认后端服务正在运行
2. 检查防火墙设置
3. 确认后端CORS配置正确

### 问题4：端口不匹配

**症状**：
- 后端运行在不同的端口（如10000）
- 前端仍在使用3001

**解决方案**：

**方法1：修改后端端口（推荐）**
在 `.env` 文件中设置：
```
PORT=3001
```

**方法2：修改前端API地址**
在项目根目录创建或修改 `.env` 文件：
```
VITE_API_URL=http://localhost:10000
```

然后重启前端服务：
```bash
npm run dev:frontend
```

---

## 🔧 详细诊断步骤

### 步骤1：检查后端服务日志

查看后端服务输出，检查是否有错误：

```bash
# 如果后端在终端运行，直接查看输出
# 或者在 server/ 目录查看日志文件
tail -f server/server-output.log
```

### 步骤2：测试API端点

使用curl测试API（需要有效的token）：

```bash
# 1. 先登录获取token
# 2. 使用token测试API
TOKEN="your_token_here"
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/arsenal/my-assets
```

### 步骤3：检查浏览器控制台

1. 打开浏览器开发者工具（F12）
2. 切换到 "Network" 标签
3. 刷新页面
4. 查看失败的请求：
   - 点击失败的请求
   - 查看 "Headers" 确认请求URL和Headers
   - 查看 "Response" 查看服务器返回的错误信息

### 步骤4：检查认证token

在浏览器控制台（Console）执行：

```javascript
// 检查token是否存在
const token = localStorage.getItem('tws_token');
console.log('Token:', token ? '存在' : '不存在');

// 如果token存在，解析token内容
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Token内容:', payload);
    console.log('用户角色:', payload.role);
    console.log('Token过期时间:', new Date(payload.exp * 1000));
  } catch (e) {
    console.error('Token解析失败:', e);
  }
}
```

---

## 📊 错误信息说明

### 改进后的错误信息

现在系统会根据不同的错误类型显示更详细的信息：

1. **未登录**：
   - 显示："未登录，请先登录"
   - 解决：访问登录页面登录

2. **登录过期**：
   - 显示："登录已过期，请重新登录"
   - 解决：重新登录

3. **网络错误**：
   - 显示："无法连接到服务器 http://localhost:3001，请确保后端服务正在运行"
   - 解决：启动后端服务

4. **权限不足**：
   - 显示："权限不足，无法访问此资源"
   - 解决：检查用户角色权限

5. **服务器错误**：
   - 显示具体的错误消息（从服务器返回）
   - 解决：查看后端日志，修复服务器问题

---

## 🚀 快速修复命令

### 重启后端服务

```bash
# 停止当前服务（如果有）
pkill -f "node.*server.mjs"

# 启动后端服务
cd server
node server.mjs
```

### 清理并重新登录

```javascript
// 在浏览器控制台执行
localStorage.clear();
// 然后刷新页面，重新登录
```

### 检查并修复环境变量

```bash
# 检查 .env 文件（如果存在）
cat .env | grep PORT
cat .env | grep VITE_API_URL

# 如果需要，创建或修改 .env
echo "PORT=3001" >> .env
echo "VITE_API_URL=http://localhost:3001" >> .env
```

---

## 📞 仍然无法解决？

如果以上步骤都无法解决问题，请提供以下信息：

1. **后端服务状态**：
   ```bash
   lsof -i :3001
   curl http://localhost:3001/health
   ```

2. **浏览器控制台错误**：
   - 截图或复制 Network 标签中的错误请求
   - 截图或复制 Console 中的错误信息

3. **环境信息**：
   - 操作系统
   - Node.js 版本 (`node -v`)
   - 浏览器及版本

4. **相关日志**：
   - 后端服务输出
   - 浏览器控制台完整错误信息

---

**最后更新**：2025-01-27

