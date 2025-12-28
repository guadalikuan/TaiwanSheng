# TWS 协议 Zeabur 部署指南

本文档将指导您如何将 TWS 协议项目部署到 Zeabur 平台。本项目包含前端（Vite + React）和后端（Node.js + Express），我们需要在 Zeabur 中创建两个服务来分别部署它们。

## 项目结构说明

- **前端根目录**: `tws/` (包含 `package.json`, `vite.config.js`, `Dockerfile`)
- **后端根目录**: `tws/server/` (包含 `package.json`, `server.js`)

## 准备工作

1. 确保您的代码已推送到 GitHub 仓库。
2. 注册并登录 [Zeabur Dashboard](https://dash.zeabur.com)。

---

## 第一步：创建项目

1. 在 Zeabur 控制台点击 **"Create Project"**。
2. 选择合适的区域（建议选择亚太地区以获得更好的访问速度）。
3. 给项目起个名字，例如 `tws-protocol`。

---

## 第二步：部署后端服务 (Backend)

首先部署后端，因为前端构建时需要后端的 API 地址。

1. 在项目页面点击 **"Deploy New Service"**。
2. 选择 **"Git"** -> 选择您的 GitHub 仓库。
3. **关键配置**：
   - Zeabur 会尝试自动检测，但我们需要手动指定路径。
   - 点击刚刚创建的服务，进入 **"Settings" (设置)**。
   - 找到 **"Root Directory" (根目录)** 选项。
   - 将其修改为：`tws/server`
   - 保存设置。
4. **服务重部署**：
   - 修改根目录后，服务会自动重新构建。Zeabur 会识别出这是一个 Node.js 项目。
   - 它会自动运行 `npm install` 和 `npm start` (对应 `node start.js`)。
5. **绑定域名**：
   - 进入 **"Networking" (网络)** 标签页。
   - 点击 **"Generate Domain"** 或绑定自定义域名。
   - 记下生成的域名，例如 `tws-backend.zeabur.app`。
   - **注意**：由于后端 API 使用 HTTPS，完整的 API 地址将是 `https://tws-backend.zeabur.app`。

---

## 第三步：部署前端服务 (Frontend)

现在部署前端，并连接到后端。

1. 回到项目概览，再次点击 **"Deploy New Service"**。
2. 再次选择 **"Git"** -> 选择同一个 GitHub 仓库。
3. **关键配置**：
   - 点击新创建的服务，进入 **"Settings" (设置)**。
   - 找到 **"Root Directory" (根目录)** 选项。
   - 将其修改为：`tws`
   - 保存设置。
4. **构建配置**：
   - Zeabur 可能会检测到 `Dockerfile` 并使用 Docker 部署，这是推荐的方式，因为它内置了 Nginx 服务器。
   - 如果 Zeabur 没有使用 Docker，而是识别为静态站点：
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
5. **环境变量**：
   - 进入 **"Variables" (变量)** 标签页。
   - 点击 **"Add Variable"**。
   - 添加以下变量，将 `<您的后端域名>` 替换为第二步中获得的域名：
     - `VITE_API_BASE_URL` = `https://tws-backend.zeabur.app`
     - `VITE_APP_ENV` = `production`
6. **绑定域名**：
   - 进入 **"Networking" (网络)** 标签页。
   - 生成或绑定前端访问域名，例如 `tws-app.zeabur.app`。

---

## 第四步：验证部署

1. 访问您的前端域名（例如 `https://tws-app.zeabur.app`）。
2. 打开浏览器的开发者工具 (F12) -> Network 标签。
3. 观察应用是否成功向后端 API 发送请求（例如 `/api/homepage/data`）。
4. 如果看到数据正常加载，且没有 CORS 错误，说明部署成功。

## 常见问题排查

### 1. 跨域 (CORS) 错误
后端代码目前配置为允许所有来源（在开发模式下），或者允许特定的 localhost 端口。如果在生产环境遇到 CORS 错误：
- 检查 `tws/server/server.js` 中的 `allowedOrigins` 配置。
- 确保后端正确接收到了请求。当前的后端逻辑包含 `if (!origin) return callback(null, true);` 和开发模式下的宽容策略，理论上应该能直接工作。

### 2. 构建失败
- **后端**：检查 `tws/server/package.json` 中的 `dependencies` 是否完整。
- **前端**：如果使用 Docker 部署失败，尝试在 Zeabur 设置中强制使用 "Static Site" 模式，并指定构建命令。

### 3. WebSocket / SSE 连接失败
- Zeabur 默认支持 WebSocket 和 SSE。如果连接断开，请确保前端使用的是 HTTPS 协议（Zeabur 默认启用 HTTPS），且 `VITE_API_BASE_URL` 也是 `https://` 开头。
