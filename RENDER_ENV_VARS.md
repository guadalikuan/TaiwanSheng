# Render 环境变量配置清单

## 🔐 必需的环境变量

### tws-backend 服务

在 Render Dashboard 中为 **tws-backend** 服务设置以下环境变量：

#### 1. MONGODB_URI（必需）

- **变量名**：`MONGODB_URI`
- **值**：你的 MongoDB Atlas 连接字符串
- **格式**：`mongodb+srv://username:password@cluster.mongodb.net/dbname`
- **获取方式**：
  1. 登录 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
  2. 选择你的集群
  3. 点击 "Connect"
  4. 选择 "Connect your application"
  5. 复制连接字符串
  6. 替换 `<password>` 为你的实际密码

#### 2. JWT_SECRET（必需）

- **变量名**：`JWT_SECRET`
- **值**：`8a0573b1ef514688b94b85de7c8bd66a3df79b85aa9a4ca1ed363f0ef24982bf`
- **说明**：已为你生成的随机密钥，用于 JWT 签名

---

## 🔧 可选的环境变量

### tws-backend 服务

如果需要以下功能，请添加相应环境变量：

#### BSC_RPC_URL（可选）

- **变量名**：`BSC_RPC_URL`
- **值**：`https://bsc-dataseed.binance.org`
- **说明**：BSC 网络 RPC 端点（如果需要 BSC 相关功能）

#### CONTRACT_ADDRESS（可选）

- **变量名**：`CONTRACT_ADDRESS`
- **值**：`0x...`（你的智能合约地址）
- **说明**：智能合约地址（如果已部署）

#### PLATFORM_WALLET（可选）

- **变量名**：`PLATFORM_WALLET`
- **值**：`0x...`（平台钱包地址）
- **说明**：平台收款钱包地址（如果需要）

---

## 📝 前端环境变量（自动设置）

### tws-frontend 服务

以下环境变量会在 `render.yaml` 中自动配置，无需手动设置：

- `VITE_API_URL` - 自动从后端服务获取
- `VITE_SOLANA_RPC_URL` - 自动设置为 `https://api.mainnet-beta.solana.com`

---

## 🚀 快速配置步骤

1. **进入 Render Dashboard**
   - 访问 https://dashboard.render.com
   - 找到 `tws-backend` 服务

2. **添加环境变量**
   - 点击左侧菜单 "Environment"
   - 点击 "Add Environment Variable"
   - 逐个添加上述变量

3. **保存并重新部署**
   - 添加完所有变量后，服务会自动重新部署
   - 或点击 "Manual Deploy" 手动触发部署

---

## ✅ 配置检查清单

- [ ] `MONGODB_URI` 已设置
- [ ] `JWT_SECRET` 已设置
- [ ] MongoDB Atlas 已允许来自 Render 的 IP（设置为 0.0.0.0/0）
- [ ] 后端服务重新部署完成
- [ ] 后端健康检查通过

---

## 🔒 安全提示

1. **不要**在代码中硬编码这些值
2. **不要**将 `.env` 文件提交到 Git
3. **定期轮换** JWT_SECRET（建议每 3-6 个月）
4. **使用强密码**保护 MongoDB 数据库

---

## 📞 需要帮助？

如果遇到问题：
- 查看 Render Dashboard 中的日志
- 检查环境变量是否正确设置
- 参考 `DEPLOY_STEPS.md` 获取详细步骤

