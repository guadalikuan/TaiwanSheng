# TWS Protocol 部署指南

本文档提供 TWS Protocol 应用的详细部署说明。

## 目录

- [前置要求](#前置要求)
- [部署方式](#部署方式)
  - [Docker 部署](#docker-部署)
  - [传统部署](#传统部署)
  - [云平台部署](#云平台部署)
- [环境配置](#环境配置)
- [安全配置](#安全配置)
- [故障排查](#故障排查)

## 前置要求

- Node.js 18+ 和 npm
- Docker 和 Docker Compose（如使用 Docker 部署）
- Nginx（如使用传统部署）
- 服务器：推荐使用新加坡或日本节点（AWS/DigitalOcean）

## 部署方式

### Docker 部署

#### 1. 构建镜像

```bash
npm run docker:build
```

或使用 Docker Compose：

```bash
npm run docker:compose
```

#### 2. 运行容器

```bash
npm run docker:run
```

或使用 Docker Compose：

```bash
docker-compose up -d
```

#### 3. 停止容器

```bash
npm run docker:compose:down
```

### 传统部署

#### 1. 构建应用

```bash
npm install
npm run build:prod
```

#### 2. 配置 Nginx

复制 `nginx.conf` 到服务器，并根据实际情况修改：

```bash
sudo cp nginx.conf /etc/nginx/sites-available/tws
sudo ln -s /etc/nginx/sites-available/tws /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 3. 部署文件

将 `dist` 目录内容复制到 Nginx 配置的根目录：

```bash
sudo cp -r dist/* /usr/share/nginx/html/
```

### 云平台部署

#### Vercel

1. 连接 GitHub 仓库
2. 设置构建命令：`npm run build`
3. 设置输出目录：`dist`
4. 配置环境变量

#### Netlify

1. 连接 GitHub 仓库
2. 设置构建命令：`npm run build`
3. 设置发布目录：`dist`
4. 配置环境变量和重定向规则

## 环境配置

### 1. 创建环境变量文件

复制环境变量模板：

```bash
cp .env.example .env
cp .env.production.example .env.production
```

### 2. 配置环境变量

编辑 `.env.production` 文件，填入实际值：

- `VITE_API_BASE_URL`: API 基础 URL
- `VITE_CONTRACT_ADDRESS`: 智能合约地址
- `VITE_COUNTDOWN_TARGET`: 倒计时目标日期（Unix 时间戳，毫秒）
- `VITE_TELEGRAM_BOT_TOKEN`: Telegram Bot Token
- 其他配置项...

详细说明请参考 [ENVIRONMENT.md](./ENVIRONMENT.md)

## 安全配置

### 1. HTTPS 配置

确保使用 HTTPS，配置 SSL 证书：

```nginx
server {
    listen 443 ssl;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    # ...
}
```

### 2. 安全头

已在 `nginx.conf` 中配置基本安全头，可根据需要调整。

### 3. 防火墙

确保只开放必要端口（80, 443）。

## 故障排查

### 问题：页面空白

- 检查构建是否成功
- 检查 Nginx 配置是否正确
- 检查浏览器控制台错误

### 问题：路由不工作

- 确保 Nginx 配置了 SPA 路由支持（`try_files`）
- 检查 `nginx.conf` 中的路由配置

### 问题：环境变量不生效

- 确保环境变量以 `VITE_` 开头
- 重新构建应用
- 检查 `.env` 文件位置

### 问题：Docker 容器无法启动

- 检查 Docker 日志：`docker logs <container-id>`
- 检查端口是否被占用
- 检查 Nginx 配置文件路径

## 监控和维护

### 健康检查

应用提供健康检查端点：`/health`

### 日志

- Docker 日志：`docker logs <container-id>`
- Nginx 日志：`/var/log/nginx/`

### 更新部署

1. 拉取最新代码
2. 重新构建：`npm run build:prod`
3. 重启服务或容器

## 联系支持

如遇到问题，请查看 [CHECKLIST.md](./CHECKLIST.md) 中的部署检查清单。

