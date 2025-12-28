# Solana RPC 配置说明

## 问题说明

当前应用使用的是 Solana 官方公共 RPC 端点（`https://api.mainnet-beta.solana.com/`），该端点有访问限制，会返回 **403 Forbidden** 错误。

## 解决方案

需要配置自定义 RPC 端点。请按照以下步骤操作：

### 步骤 1：获取 RPC API Key

选择一个 RPC 提供商并注册账号：

#### 选项 1：Helius（推荐，免费额度充足）
1. 访问 https://www.helius.dev/
2. 注册账号并登录
3. 在 Dashboard 中创建 **Mainnet** API Key
4. 复制你的 API Key

#### 选项 2：QuickNode
1. 访问 https://www.quicknode.com/
2. 注册并创建 Solana Mainnet 端点
3. 获取端点 URL 和 API Key

#### 选项 3：Alchemy
1. 访问 https://www.alchemy.com/
2. 注册并创建 Solana Mainnet 应用
3. 获取 API Key

### 步骤 2：创建环境变量文件

在 `tws/` 目录下创建 `.env.local` 文件：

**Windows PowerShell:**
```powershell
cd tws
New-Item -Path .env.local -ItemType File -Force
```

**Linux/Mac:**
```bash
cd tws
touch .env.local
```

### 步骤 3：配置环境变量

编辑 `.env.local` 文件，添加以下内容：

#### Helius 配置示例：
```env
VITE_SOLANA_NETWORK=mainnet-beta
VITE_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY_HERE
```

#### QuickNode 配置示例：
```env
VITE_SOLANA_NETWORK=mainnet-beta
VITE_SOLANA_RPC_URL=https://YOUR_ENDPOINT.solana-mainnet.quiknode.pro/YOUR_API_KEY/
```

#### Alchemy 配置示例：
```env
VITE_SOLANA_NETWORK=mainnet-beta
VITE_SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

**重要：** 将 `YOUR_API_KEY_HERE` 替换为你的实际 API Key！

### 步骤 4：重启开发服务器

配置完成后，**必须重启开发服务器**才能生效：

1. 停止当前服务器（按 `Ctrl+C`）
2. 重新启动：
   ```bash
   npm run dev:frontend
   ```

### 步骤 5：验证配置

重启后，打开浏览器控制台，你应该看到：
- `🔍 连接的网络:` 显示你配置的自定义 RPC URL（而不是 `https://api.mainnet-beta.solana.com/`）
- 不再出现 403 错误
- 能够成功查询 TWSCoin 余额

## 其他配置项（可选）

如果需要，还可以配置以下环境变量：

```env
# TWSCoin Mint 地址（已有默认值，通常不需要修改）
VITE_TWS_TOKEN_MINT=ZRGboZN3K6JZYhGe8PHDcazwKuqhgp2tTG7h8G5fKGk

# 国库地址（用于接收拍卖手续费）
VITE_TREASURY_ADDRESS=YOUR_TREASURY_ADDRESS_HERE
```

## 故障排除

### 问题 1：仍然显示 403 错误
- 检查 `.env.local` 文件是否在 `tws/` 目录下
- 检查环境变量名称是否正确（必须以 `VITE_` 开头）
- 确认已重启开发服务器
- 检查 API Key 是否正确

### 问题 2：无法找到 `.env.local` 文件
- 确保文件在 `tws/` 目录下（不是项目根目录）
- 确保文件名是 `.env.local`（注意前面的点）

### 问题 3：环境变量未生效
- Vite 需要重启才能读取新的环境变量
- 确保变量名以 `VITE_` 开头
- 检查是否有语法错误（不要有多余的空格或引号）

## 注意事项

- `.env.local` 文件包含敏感信息，**不要提交到 Git**
- 该文件已在 `.gitignore` 中，不会被版本控制追踪
- 生产环境部署时，需要在服务器上配置相同的环境变量

