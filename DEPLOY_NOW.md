# 🚀 立即开始部署到 Render

## 📋 部署前检查清单

在开始之前，请确保：

- [ ] 代码已推送到 Git 仓库（GitHub/GitLab/Bitbucket）
- [ ] 已准备好 MongoDB 连接字符串
- [ ] 已准备好 JWT 密钥（随机字符串）
- [ ] 已注册 Render 账号（https://render.com）

---

## 🎯 部署步骤（5分钟）

### 步骤 1: 准备代码并推送到 Git

```bash
# 1. 检查当前状态
cd /Users/fanann/tws
git status

# 2. 添加所有文件（包括新创建的部署配置）
git add .

# 3. 提交更改
git commit -m "准备 Render 部署：添加 render.yaml 和部署配置"

# 4. 推送到远程仓库
git push origin main
# 或
git push origin master
```

**如果没有 Git 仓库**：
```bash
# 初始化 Git 仓库
git init
git add .
git commit -m "Initial commit: TWS Project with Render deployment config"

# 在 GitHub/GitLab 创建新仓库，然后：
git remote add origin https://github.com/yourusername/tws.git
git push -u origin main
```

---

### 步骤 2: 在 Render 中创建服务

1. **访问 Render Dashboard**
   - 打开 https://dashboard.render.com
   - 登录或注册账号

2. **创建 Blueprint**
   - 点击右上角 **"New +"** 按钮
   - 选择 **"Blueprint"**
   - 连接你的 Git 仓库（GitHub/GitLab/Bitbucket）
   - 选择包含 `render.yaml` 的仓库

3. **应用配置**
   - Render 会自动检测 `render.yaml` 文件
   - 你会看到两个服务：
     - `tws-backend` (Web Service)
     - `tws-frontend` (Static Site)
   - 点击 **"Apply"** 按钮

---

### 步骤 3: 配置环境变量

部署开始后，需要为 **tws-backend** 服务配置环境变量：

1. **进入 tws-backend 服务**
   - 在 Render Dashboard 中找到 `tws-backend` 服务
   - 点击进入服务详情页

2. **设置环境变量**
   - 点击左侧菜单 **"Environment"**
   - 点击 **"Add Environment Variable"**
   - 添加以下变量：

#### 必需的环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas 连接字符串 |
| `JWT_SECRET` | `your-random-secret-key` | JWT 签名密钥（建议使用长随机字符串） |

#### 可选的环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `BSC_RPC_URL` | `https://bsc-dataseed.binance.org` | BSC 网络 RPC（如果需要） |
| `CONTRACT_ADDRESS` | `0x...` | 智能合约地址（如果需要） |
| `PLATFORM_WALLET` | `0x...` | 平台钱包地址（如果需要） |

**生成 JWT_SECRET**：
```bash
# 在终端运行
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### 步骤 4: 等待部署完成

1. **查看部署日志**
   - 在服务详情页，点击 **"Events"** 或 **"Logs"** 标签
   - 查看构建和启动日志

2. **检查部署状态**
   - 等待状态变为 **"Live"**（绿色）
   - 通常需要 2-5 分钟

3. **验证部署**
   - 后端健康检查：`https://tws-backend.onrender.com/health`
   - 前端访问：`https://tws-frontend.onrender.com`

---

### 步骤 5: 验证部署

#### 测试后端：

```bash
# 健康检查
curl https://tws-backend.onrender.com/health

# 应该返回：
# {"status":"ok","timestamp":"..."}
```

#### 测试前端：

1. 访问前端 URL：`https://tws-frontend.onrender.com`
2. 检查浏览器控制台是否有错误
3. 测试钱包连接功能
4. 测试 API 调用

---

## 🔧 常见问题解决

### 问题 1: 构建失败

**可能原因**：
- 依赖安装失败
- Node.js 版本不兼容

**解决方法**：
- 检查 `server/package.json` 中的 `engines.node` 版本
- 查看 Render 日志中的具体错误信息

### 问题 2: 后端无法启动

**可能原因**：
- MongoDB 连接失败
- 缺少必需的环境变量

**解决方法**：
- 检查 `MONGODB_URI` 是否正确
- 确保 MongoDB Atlas 允许来自 Render 的 IP（或设置为 0.0.0.0/0）
- 检查所有必需的环境变量是否已设置

### 问题 3: 前端无法连接后端

**可能原因**：
- `VITE_API_URL` 未正确设置
- CORS 配置问题

**解决方法**：
- 检查前端环境变量 `VITE_API_URL` 是否指向正确的后端 URL
- 重新构建前端（环境变量在构建时注入）
- 检查后端 CORS 配置

### 问题 4: 服务休眠（Free 计划）

**说明**：
- Free 计划的服务在 15 分钟无活动后会休眠
- 首次访问需要等待几秒唤醒服务

**解决方法**：
- 升级到 Starter 计划（$7/月）避免休眠
- 或使用外部监控服务定期 ping 你的服务

---

## 📊 部署后操作

### 1. 配置自定义域名（可选）

1. 在服务设置中点击 **"Custom Domains"**
2. 添加你的域名
3. 按照提示配置 DNS 记录

### 2. 设置自动部署

Render 默认会在每次 push 到主分支时自动部署。

**禁用自动部署**：
- 在服务设置中关闭 **"Auto-Deploy"**

**手动部署**：
- 在 Dashboard 中点击 **"Manual Deploy"**

### 3. 监控和日志

- **查看日志**：服务详情页 → "Logs"
- **监控指标**：服务详情页 → "Metrics"
- **设置告警**：服务详情页 → "Alerts"

---

## ✅ 部署检查清单

完成以下检查确保部署成功：

- [ ] 代码已推送到 Git 仓库
- [ ] 在 Render 中创建了 Blueprint
- [ ] 配置了 `MONGODB_URI` 环境变量
- [ ] 配置了 `JWT_SECRET` 环境变量
- [ ] 后端服务状态为 "Live"
- [ ] 前端服务状态为 "Live"
- [ ] 后端健康检查返回 `{"status":"ok"}`
- [ ] 前端可以正常访问
- [ ] 前端可以成功调用后端 API
- [ ] 钱包连接功能正常

---

## 🆘 需要帮助？

如果遇到问题：

1. **查看日志**：Render Dashboard → 服务 → Logs
2. **检查环境变量**：确保所有必需变量已设置
3. **参考文档**：
   - `docs/RENDER_DEPLOYMENT.md` - 详细部署指南
   - `RENDER_QUICK_START.md` - 快速开始
4. **联系支持**：Render Dashboard → Support

---

## 🎉 完成！

部署成功后，你的应用将在以下地址可用：

- **后端 API**: `https://tws-backend.onrender.com`
- **前端网站**: `https://tws-frontend.onrender.com`

**下一步**：
- 测试所有功能
- 配置自定义域名
- 设置监控和告警
- 优化性能

---

**祝你部署顺利！** 🚀

