# 🚀 Render 部署步骤（实时指南）

## 当前状态检查

✅ 已准备好部署配置文件
✅ 代码已准备好

---

## 步骤 1: 提交代码到 Git

### 1.1 检查当前状态

```bash
cd /Users/fanann/tws
git status
```

### 1.2 添加所有文件

```bash
git add .
```

### 1.3 提交更改

```bash
git commit -m "准备 Render 部署：添加 render.yaml 和部署配置"
```

### 1.4 推送到远程仓库

```bash
# 如果主分支是 main
git push origin main

# 或者如果是 master
git push origin master
```

**如果没有远程仓库**：
```bash
# 1. 在 GitHub/GitLab 创建新仓库
# 2. 然后执行：
git remote add origin https://github.com/yourusername/tws.git
git push -u origin main
```

---

## 步骤 2: 在 Render 中创建服务

### 2.1 访问 Render Dashboard

1. 打开浏览器，访问：https://dashboard.render.com
2. 登录或注册账号（可以使用 GitHub 账号登录）

### 2.2 创建 Blueprint（推荐方式）

1. 点击右上角 **"New +"** 按钮
2. 选择 **"Blueprint"**
3. 连接你的 Git 仓库：
   - 选择 GitHub/GitLab/Bitbucket
   - 授权 Render 访问你的仓库
   - 选择包含 `render.yaml` 的仓库
4. Render 会自动检测 `render.yaml` 文件
5. 你会看到两个服务：
   - `tws-backend` (Web Service)
   - `tws-frontend` (Static Site)
6. 点击 **"Apply"** 按钮开始创建服务

### 2.3 等待服务创建

- Render 会自动开始构建
- 这个过程可能需要 2-5 分钟
- 你可以看到构建日志

---

## 步骤 3: 配置环境变量

### 3.1 进入后端服务

1. 在 Render Dashboard 中找到 `tws-backend` 服务
2. 点击进入服务详情页

### 3.2 设置环境变量

点击左侧菜单 **"Environment"**，然后添加以下变量：

#### 必需的环境变量：

**MONGODB_URI**
- 变量名：`MONGODB_URI`
- 值：你的 MongoDB Atlas 连接字符串
- 格式：`mongodb+srv://username:password@cluster.mongodb.net/dbname`
- 获取方式：
  1. 登录 MongoDB Atlas
  2. 点击 "Connect"
  3. 选择 "Connect your application"
  4. 复制连接字符串

**JWT_SECRET**
- 变量名：`JWT_SECRET`
- 值：随机生成的密钥（见下方生成方法）
- 生成方法：
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- 或者使用在线工具生成随机字符串

#### 可选的环境变量（如果需要）：

**BSC_RPC_URL**
- 变量名：`BSC_RPC_URL`
- 值：`https://bsc-dataseed.binance.org`

**CONTRACT_ADDRESS**
- 变量名：`CONTRACT_ADDRESS`
- 值：你的智能合约地址（如果有）

**PLATFORM_WALLET**
- 变量名：`PLATFORM_WALLET`
- 值：平台钱包地址（如果有）

---

## 步骤 4: 等待部署完成

### 4.1 查看部署日志

1. 在服务详情页，点击 **"Events"** 或 **"Logs"** 标签
2. 查看构建和启动过程
3. 等待状态变为 **"Live"**（绿色）

### 4.2 检查部署状态

- 后端服务状态应该显示为 **"Live"**
- 前端服务状态应该显示为 **"Live"**

---

## 步骤 5: 验证部署

### 5.1 获取服务 URL

部署完成后，Render 会为每个服务生成一个 URL：

- **后端 URL**：`https://tws-backend-xxxx.onrender.com`
- **前端 URL**：`https://tws-frontend-xxxx.onrender.com`

（`xxxx` 是随机生成的标识符）

### 5.2 测试后端

在浏览器或终端中访问：

```
https://your-backend-url.onrender.com/health
```

应该返回：
```json
{"status":"ok","timestamp":"..."}
```

### 5.3 测试前端

1. 访问前端 URL
2. 检查页面是否正常加载
3. 打开浏览器开发者工具（F12）
4. 检查控制台是否有错误
5. 测试钱包连接功能

---

## 步骤 6: 更新前端环境变量（如果需要）

如果前端无法连接到后端：

1. 进入 `tws-frontend` 服务
2. 点击 **"Environment"**
3. 检查 `VITE_API_URL` 是否已自动设置
4. 如果没有，手动设置为后端 URL
5. 点击 **"Manual Deploy"** 重新构建

---

## 🔧 故障排查

### 问题 1: 构建失败

**检查**：
- 查看 Render 日志中的错误信息
- 确保 `server/package.json` 中的依赖都正确
- 检查 Node.js 版本是否兼容

**解决**：
- 修复代码中的错误
- 重新部署

### 问题 2: 后端无法启动

**检查**：
- MongoDB URI 是否正确
- JWT_SECRET 是否已设置
- 查看日志中的具体错误

**解决**：
- 检查环境变量配置
- 确保 MongoDB Atlas 允许来自 Render 的 IP（设置为 0.0.0.0/0）

### 问题 3: 前端无法连接后端

**检查**：
- `VITE_API_URL` 是否正确
- 后端服务是否正常运行
- CORS 配置是否正确

**解决**：
- 更新 `VITE_API_URL` 环境变量
- 重新构建前端

---

## 📝 部署后检查清单

- [ ] 代码已推送到 Git 仓库
- [ ] 在 Render 中创建了 Blueprint
- [ ] 配置了 `MONGODB_URI` 环境变量
- [ ] 配置了 `JWT_SECRET` 环境变量
- [ ] 后端服务状态为 "Live"
- [ ] 前端服务状态为 "Live"
- [ ] 后端健康检查通过（`/health` 返回 `{"status":"ok"}`）
- [ ] 前端可以正常访问
- [ ] 前端可以成功调用后端 API
- [ ] 钱包连接功能正常

---

## 🎉 完成！

部署成功后，记录你的服务 URL：

- **后端 API**: `https://your-backend-url.onrender.com`
- **前端网站**: `https://your-frontend-url.onrender.com`

**下一步**：
- 测试所有功能
- 配置自定义域名（可选）
- 设置监控和告警
- 优化性能

---

## 📞 需要帮助？

如果遇到问题：
1. 查看 Render Dashboard 中的日志
2. 检查环境变量配置
3. 参考 `docs/RENDER_DEPLOYMENT.md` 详细文档
4. 联系 Render 支持团队

