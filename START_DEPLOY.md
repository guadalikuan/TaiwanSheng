# 🚀 开始部署到 Render - 快速指南

## ✅ 第一步：代码已准备完成

你的代码已经推送到 GitHub：
- **仓库地址**：https://github.com/FANANN2402/fanan.git
- **分支**：main
- **部署配置**：已包含 `render.yaml`

---

## 🎯 第二步：在 Render 中创建服务

### 1. 访问 Render Dashboard

打开浏览器，访问：**https://dashboard.render.com**

### 2. 登录/注册

- 如果没有账号，点击 "Get Started for Free"
- 可以使用 GitHub 账号快速登录

### 3. 创建 Blueprint

1. 点击右上角 **"New +"** 按钮
2. 选择 **"Blueprint"**
3. 连接 Git 仓库：
   - 选择 **GitHub**
   - 授权 Render 访问你的仓库
   - 选择仓库：**FANANN2402/fanan**
4. Render 会自动检测 `render.yaml` 文件
5. 你会看到两个服务：
   - ✅ `tws-backend` (Web Service)
   - ✅ `tws-frontend` (Static Site)
6. 点击 **"Apply"** 按钮

### 4. 等待服务创建

- Render 会自动开始构建
- 这个过程需要 2-5 分钟
- 你可以看到实时构建日志

---

## 🔐 第三步：配置环境变量

### 进入后端服务

1. 在 Render Dashboard 中找到 **`tws-backend`** 服务
2. 点击进入服务详情页
3. 点击左侧菜单 **"Environment"**

### 添加必需的环境变量

点击 **"Add Environment Variable"**，逐个添加：

#### 1. MONGODB_URI（必需）

- **变量名**：`MONGODB_URI`
- **值**：你的 MongoDB Atlas 连接字符串
- **格式**：`mongodb+srv://username:password@cluster.mongodb.net/dbname`

**如何获取**：
1. 登录 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. 选择你的集群
3. 点击 "Connect"
4. 选择 "Connect your application"
5. 复制连接字符串
6. 替换 `<password>` 为你的实际密码

**重要**：确保 MongoDB Atlas 允许来自任何 IP 的连接：
- 在 Network Access 中，添加 IP：`0.0.0.0/0`

#### 2. JWT_SECRET（必需）

- **变量名**：`JWT_SECRET`
- **值**：`8a0573b1ef514688b94b85de7c8bd66a3df79b85aa9a4ca1ed363f0ef24982bf`
- **说明**：已为你生成的随机密钥

---

## ⏳ 第四步：等待部署完成

### 查看部署状态

1. 在服务详情页，点击 **"Events"** 或 **"Logs"** 标签
2. 查看构建和启动过程
3. 等待状态变为 **"Live"**（绿色）

### 检查部署日志

如果看到以下信息，说明部署成功：
- ✅ "Build successful"
- ✅ "Deploy successful"
- ✅ 状态显示为 "Live"

如果看到错误：
- 查看日志中的错误信息
- 检查环境变量是否正确设置
- 参考故障排查部分

---

## 🧪 第五步：验证部署

### 获取服务 URL

部署完成后，Render 会为每个服务生成一个 URL：

- **后端 URL**：`https://tws-backend-xxxx.onrender.com`
- **前端 URL**：`https://tws-frontend-xxxx.onrender.com`

（`xxxx` 是随机生成的标识符）

### 测试后端

在浏览器中访问：

```
https://your-backend-url.onrender.com/health
```

应该返回：
```json
{"status":"ok","timestamp":"..."}
```

### 测试前端

1. 访问前端 URL
2. 检查页面是否正常加载
3. 打开浏览器开发者工具（F12）
4. 检查控制台是否有错误
5. 测试钱包连接功能

---

## 🔧 故障排查

### 问题 1: 构建失败

**可能原因**：
- 依赖安装失败
- Node.js 版本不兼容

**解决方法**：
- 查看 Render 日志中的具体错误
- 检查 `server/package.json` 中的依赖

### 问题 2: 后端无法启动

**可能原因**：
- MongoDB 连接失败
- 缺少必需的环境变量

**解决方法**：
- 检查 `MONGODB_URI` 是否正确
- 确保 MongoDB Atlas 允许来自 Render 的 IP
- 检查所有必需的环境变量是否已设置

### 问题 3: 前端无法连接后端

**可能原因**：
- `VITE_API_URL` 未正确设置
- CORS 配置问题

**解决方法**：
- 检查前端环境变量 `VITE_API_URL`
- 重新构建前端（环境变量在构建时注入）
- 检查后端 CORS 配置

---

## 📋 部署检查清单

完成以下检查确保部署成功：

- [ ] 代码已推送到 GitHub
- [ ] 在 Render 中创建了 Blueprint
- [ ] 配置了 `MONGODB_URI` 环境变量
- [ ] 配置了 `JWT_SECRET` 环境变量
- [ ] MongoDB Atlas 已允许来自 Render 的 IP
- [ ] 后端服务状态为 "Live"
- [ ] 前端服务状态为 "Live"
- [ ] 后端健康检查通过（`/health` 返回 `{"status":"ok"}`）
- [ ] 前端可以正常访问
- [ ] 前端可以成功调用后端 API
- [ ] 钱包连接功能正常

---

## 📚 相关文档

- **详细步骤**：查看 `DEPLOY_STEPS.md`
- **环境变量清单**：查看 `RENDER_ENV_VARS.md`
- **快速参考**：查看 `RENDER_QUICK_START.md`
- **完整指南**：查看 `docs/RENDER_DEPLOYMENT.md`

---

## 🎉 完成！

部署成功后，记录你的服务 URL：

- **后端 API**: `https://your-backend-url.onrender.com`
- **前端网站**: `https://your-frontend-url.onrender.com`

**下一步**：
- 测试所有功能
- 配置自定义域名（可选）
- 设置监控和告警

---

## 🆘 需要帮助？

如果遇到问题：
1. 查看 Render Dashboard 中的日志
2. 检查环境变量配置
3. 参考详细文档
4. 联系 Render 支持团队

**祝你部署顺利！** 🚀

