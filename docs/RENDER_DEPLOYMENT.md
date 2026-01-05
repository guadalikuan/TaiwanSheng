# Render 部署指南

## 📋 概述

本项目采用前后端分离架构，需要在 Render 上分别部署：
- **后端服务**：Express API 服务器
- **前端静态站点**：Vite + React 构建的静态文件

---

## 🚀 部署步骤

### 方法一：使用 render.yaml（推荐）

#### 1. 准备代码仓库

确保代码已推送到 GitHub/GitLab/Bitbucket：

```bash
git add .
git commit -m "准备 Render 部署"
git push origin main
```

#### 2. 在 Render 中创建服务

1. 登录 [Render Dashboard](https://dashboard.render.com)
2. 点击 **"New +"** → **"Blueprint"**
3. 连接你的 Git 仓库
4. Render 会自动检测 `render.yaml` 文件
5. 点击 **"Apply"** 创建服务

#### 3. 配置环境变量

在 Render Dashboard 中为 **tws-backend** 服务设置以下环境变量：

**必需的环境变量**：
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
JWT_SECRET=your-secret-key-here
BSC_RPC_URL=https://bsc-dataseed.binance.org
CONTRACT_ADDRESS=0x...
PLATFORM_WALLET=0x...
```

**可选的环境变量**：
```
PORT=10000
NODE_ENV=production
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

#### 4. 等待部署完成

Render 会自动：
- 安装依赖
- 构建项目
- 启动服务

---

### 方法二：手动创建服务

#### 1. 部署后端服务

1. 在 Render Dashboard 点击 **"New +"** → **"Web Service"**
2. 连接 Git 仓库
3. 配置如下：
   - **Name**: `tws-backend`
   - **Environment**: `Node`
   - **Region**: 选择离用户最近的区域（如 Singapore）
   - **Branch**: `main` 或 `master`
   - **Root Directory**: `server`（如果后端代码在 server 目录）
   - **Build Command**: `npm install`
   - **Start Command**: `node server.mjs`
   - **Plan**: 选择适合的计划（Free/Starter/Standard）

4. 添加环境变量（见上方列表）

5. 点击 **"Create Web Service"**

#### 2. 部署前端静态站点

1. 在 Render Dashboard 点击 **"New +"** → **"Static Site"**
2. 连接 Git 仓库
3. 配置如下：
   - **Name**: `tws-frontend`
   - **Branch**: `main` 或 `master`
   - **Root Directory**: `.`（项目根目录）
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Environment Variables**:
     - `VITE_API_URL`: 设置为后端服务的 URL（如 `https://tws-backend.onrender.com`）
     - `VITE_SOLANA_RPC_URL`: `https://api.mainnet-beta.solana.com`

4. 点击 **"Create Static Site"**

---

## 🔧 配置说明

### 后端服务配置

**文件位置**: `server/server.mjs`

**关键配置**：
```javascript
const PORT = process.env.PORT || 3001;  // Render 会自动设置 PORT
```

**注意事项**：
- Render 会自动设置 `PORT` 环境变量
- 确保使用 `process.env.PORT` 而不是硬编码端口
- CORS 需要配置允许前端域名

### 前端配置

**环境变量**：
- `VITE_API_URL`: 后端 API 的完整 URL
- `VITE_SOLANA_RPC_URL`: Solana RPC 端点

**构建输出**: `dist/` 目录

---

## 📝 环境变量清单

### 后端环境变量

| 变量名 | 说明 | 必需 | 示例 |
|--------|------|------|------|
| `MONGODB_URI` | MongoDB 连接字符串 | ✅ | `mongodb+srv://...` |
| `JWT_SECRET` | JWT 密钥 | ✅ | `your-secret-key` |
| `PORT` | 服务器端口 | ❌ | `10000` (Render 自动设置) |
| `NODE_ENV` | 环境模式 | ❌ | `production` |
| `BSC_RPC_URL` | BSC 网络 RPC | ❌ | `https://bsc-dataseed...` |
| `CONTRACT_ADDRESS` | 合约地址 | ❌ | `0x...` |
| `PLATFORM_WALLET` | 平台钱包地址 | ❌ | `0x...` |
| `SOLANA_RPC_URL` | Solana RPC | ❌ | `https://api.mainnet...` |

### 前端环境变量

| 变量名 | 说明 | 必需 | 示例 |
|--------|------|------|------|
| `VITE_API_URL` | 后端 API URL | ✅ | `https://tws-backend.onrender.com` |
| `VITE_SOLANA_RPC_URL` | Solana RPC | ❌ | `https://api.mainnet-beta.solana.com` |

---

## 🔍 故障排查

### 后端服务无法启动

1. **检查日志**：
   - 在 Render Dashboard 中查看服务日志
   - 查找错误信息

2. **常见问题**：
   - MongoDB 连接失败 → 检查 `MONGODB_URI`
   - 端口冲突 → 确保使用 `process.env.PORT`
   - 依赖安装失败 → 检查 `server/package.json`

3. **测试连接**：
   ```bash
   curl https://your-backend.onrender.com/health
   ```

### 前端无法连接后端

1. **检查环境变量**：
   - 确保 `VITE_API_URL` 设置正确
   - 重新构建前端（环境变量在构建时注入）

2. **CORS 问题**：
   - 检查后端 CORS 配置
   - 确保允许前端域名

3. **网络问题**：
   - 检查浏览器控制台错误
   - 验证 API URL 是否正确

### 构建失败

1. **依赖问题**：
   - 检查 `package.json` 中的依赖版本
   - 确保所有依赖都可用

2. **内存不足**：
   - Free 计划有内存限制
   - 考虑升级到 Starter 计划

---

## 🚀 部署后操作

### 1. 验证部署

**后端健康检查**：
```bash
curl https://your-backend.onrender.com/health
```

**前端访问**：
```
https://your-frontend.onrender.com
```

### 2. 配置自定义域名（可选）

1. 在 Render Dashboard 中进入服务设置
2. 点击 **"Custom Domains"**
3. 添加你的域名
4. 按照提示配置 DNS 记录

### 3. 设置自动部署

Render 默认会在每次 push 到主分支时自动部署。

**禁用自动部署**：
- 在服务设置中关闭 **"Auto-Deploy"**

**手动部署**：
- 在 Dashboard 中点击 **"Manual Deploy"**

---

## 📊 Render 计划对比

| 计划 | 价格 | 特点 |
|------|------|------|
| **Free** | $0/月 | 适合测试，有资源限制，服务会休眠 |
| **Starter** | $7/月 | 适合小型项目，无休眠 |
| **Standard** | $25/月 | 适合生产环境，更高性能 |

**建议**：
- 开发/测试：Free 计划
- 生产环境：Starter 或 Standard 计划

---

## 🔐 安全建议

1. **环境变量**：
   - 不要在代码中硬编码敏感信息
   - 使用 Render 的环境变量功能

2. **JWT Secret**：
   - 使用强随机字符串
   - 定期轮换密钥

3. **MongoDB**：
   - 使用 IP 白名单
   - 启用身份验证

4. **HTTPS**：
   - Render 自动提供 HTTPS
   - 确保所有 API 调用使用 HTTPS

---

## 📚 相关文档

- [Render 官方文档](https://render.com/docs)
- [Node.js 部署指南](https://render.com/docs/deploy-node-express-app)
- [静态站点部署](https://render.com/docs/deploy-static-site)

---

## ✅ 部署检查清单

- [ ] 代码已推送到 Git 仓库
- [ ] 创建了后端 Web Service
- [ ] 配置了所有必需的环境变量
- [ ] 创建了前端 Static Site
- [ ] 设置了 `VITE_API_URL` 环境变量
- [ ] 后端服务健康检查通过
- [ ] 前端可以正常访问
- [ ] 前端可以成功调用后端 API
- [ ] 测试了钱包连接功能
- [ ] 配置了自定义域名（如需要）

---

## 🆘 获取帮助

如果遇到问题：

1. 查看 Render Dashboard 中的日志
2. 检查环境变量配置
3. 验证网络连接
4. 参考 Render 官方文档
5. 联系 Render 支持团队

---

**部署完成后，你的应用将在以下地址可用**：
- 后端：`https://tws-backend.onrender.com`
- 前端：`https://tws-frontend.onrender.com`

