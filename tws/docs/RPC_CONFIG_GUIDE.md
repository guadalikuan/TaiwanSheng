# Solana RPC 节点配置指南 (Zeabur 部署版)

由于 Solana 公共节点 (api.mainnet-beta.solana.com) 会封禁来自云服务器（如 Zeabur）的请求，导致出现 `403 Access Forbidden` 错误。

**解决方法：使用私有 RPC 节点服务商。**

## 第一步：获取免费的私有 RPC 链接

推荐使用 **Helius** (Solana 专用，速度快) 或 **QuickNode**。以下以 Helius 为例：

1. 打开 [Helius 官网](https://www.helius.dev/) 并点击 "Start for Free"。
2. 使用 GitHub 或 Google 账号登录。
3. 登录后，在 Dashboard 首页，你会看到 **"API Key"** 和生成的 RPC URL。
4. 找到 **Mainnet** 的 HTTPS 链接，格式通常如下：
   ```
   https://mainnet.helius-rpc.com/?api-key=你的API密钥
   ```
   > 复制这个链接，这就是你的 `RPC_URL`。

---

## 第二步：在 Zeabur 中配置环境变量

我们需要将这个链接配置到 Zeabur 的服务中，让前端和后端都使用它。

1. 登录 [Zeabur 控制台](https://dash.zeabur.com/)。
2. 进入你的项目 (**Project**)。
3. 找到你的服务 (**Service**)。如果你是 Docker Compose 部署，通常是一个服务组；如果是分开部署，需要分别设置。

### 设置环境变量 (Environment Variables)

点击 "Settings" (设置) -> "Variables" (环境变量)，添加以下 **两条** 变量：

| 变量名 (Key) | 变量值 (Value) | 说明 |
| :--- | :--- | :--- |
| `VITE_SOLANA_RPC_URL` | `https://mainnet.helius-rpc.com/?api-key=xxxx` | **前端使用** (注意必须带 `VITE_` 前缀) |
| `SOLANA_RPC_URL` | `https://mainnet.helius-rpc.com/?api-key=xxxx` | **后端使用** (确保后端脚本也能连上) |

> **注意**：请将 Value 替换为你第一步中获取的真实链接。

---

## 第三步：重新部署服务

1. 环境变量保存后，Zeabur 通常会提示需要重启或重新部署。
2. 如果没有自动开始，请点击服务页面的 **"Redeploy"** (重新部署) 按钮。
3. 等待部署完成后，打开网页控制台 (F12)，查看 Console 日志。
   - 如果配置成功，你应该能看到类似以下的日志（我们在代码里加的）：
     ```
     [TWS Wallet] Using Custom RPC: https://mainnet.helius-rpc.com/?api-key=...
     ```

## 常见问题

- **Q: 还是报错 403？**
  - A: 检查变量名是否拼写正确（`VITE_SOLANA_RPC_URL`）。
  - A: 检查 Helius 后台的 Usage 是否超限（免费版通常够用）。
  - A: 确保你使用的是 Mainnet 链接，而不是 Devnet。

- **Q: 本地开发需要配置吗？**
  - A: 本地开发通常可以直接连公共节点，但如果遇到限流，也可以在本地 `.env` 文件中添加同样的变量。
