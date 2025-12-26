# Render 快速部署指南

## 🚀 5分钟快速部署

### 步骤 1: 准备代码

```bash
# 确保代码已提交并推送到 Git 仓库
git add .
git commit -m "准备 Render 部署"
git push origin main
```

### 步骤 2: 在 Render 中创建服务

1. 访问 [Render Dashboard](https://dashboard.render.com)
2. 点击 **"New +"** → **"Blueprint"**
3. 连接你的 Git 仓库（GitHub/GitLab/Bitbucket）
4. Render 会自动检测 `render.yaml` 文件
5. 点击 **"Apply"**

### 步骤 3: 配置环境变量

在 **tws-backend** 服务中设置以下环境变量：

**必需**：
- `MONGODB_URI` - MongoDB 连接字符串
- `JWT_SECRET` - JWT 密钥（随机字符串）

**可选**：
- `BSC_RPC_URL` - BSC 网络 RPC（如果需要）
- `CONTRACT_ADDRESS` - 合约地址（如果需要）
- `PLATFORM_WALLET` - 平台钱包地址（如果需要）

### 步骤 4: 等待部署

Render 会自动：
- ✅ 安装依赖
- ✅ 构建项目
- ✅ 启动服务

### 步骤 5: 验证部署

**后端健康检查**：
```
https://tws-backend.onrender.com/health
```

**前端访问**：
```
https://tws-frontend.onrender.com
```

---

## 📝 环境变量快速参考

### 后端 (tws-backend)

| 变量 | 说明 | 必需 |
|------|------|------|
| `MONGODB_URI` | MongoDB 连接 | ✅ |
| `JWT_SECRET` | JWT 密钥 | ✅ |
| `PORT` | 端口（自动设置） | ❌ |
| `NODE_ENV` | 环境（自动设置） | ❌ |

### 前端 (tws-frontend)

| 变量 | 说明 | 必需 |
|------|------|------|
| `VITE_API_URL` | 后端 URL（自动设置） | ✅ |
| `VITE_SOLANA_RPC_URL` | Solana RPC | ❌ |

---

## ⚠️ 常见问题

### 1. 后端无法启动

**检查**：
- MongoDB URI 是否正确
- 查看 Render 日志

### 2. 前端无法连接后端

**检查**：
- `VITE_API_URL` 是否正确
- 重新构建前端（环境变量在构建时注入）

### 3. CORS 错误

**解决**：
- 确保 `ALLOWED_ORIGINS` 包含前端 URL
- 或使用 `render.yaml` 中的自动配置

---

## 📚 详细文档

查看 `docs/RENDER_DEPLOYMENT.md` 获取完整部署指南。

---

## ✅ 部署检查清单

- [ ] 代码已推送到 Git
- [ ] 在 Render 中创建了 Blueprint
- [ ] 配置了 `MONGODB_URI`
- [ ] 配置了 `JWT_SECRET`
- [ ] 后端健康检查通过
- [ ] 前端可以访问
- [ ] 前端可以调用后端 API

---

**完成！** 🎉

