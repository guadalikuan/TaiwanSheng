# TWS Protocol

TWS Protocol 是一个基于 React 的单页面应用，提供资产管理和交易功能。

## 技术栈

- **框架**: React 18
- **构建工具**: Vite 5
- **路由**: React Router DOM 7
- **样式**: Tailwind CSS 3
- **图标**: Lucide React
- **地图**: Leaflet

## 项目结构

```
tws/
├── src/
│   ├── components/      # React 组件
│   ├── config/          # 配置文件
│   ├── App.jsx          # 主应用组件
│   ├── main.jsx         # 入口文件
│   └── index.css        # 全局样式
├── docs/                # 文档
├── public/              # 静态资源
├── Dockerfile           # Docker 配置
├── docker-compose.yml   # Docker Compose 配置
├── nginx.conf           # Nginx 配置
└── package.json         # 项目配置
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

### 构建生产版本

```bash
npm run build:prod
```

构建产物将输出到 `dist` 目录。

### 预览生产构建

```bash
npm run preview
```

## 环境变量

项目使用环境变量进行配置。详细说明请参考 [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md)。

### 快速设置

1. 复制环境变量模板：
   ```bash
   cp .env.example .env
   cp .env.production.example .env.production
   ```

2. 编辑 `.env` 文件，填入实际值。

## 部署

### Docker 部署

```bash
# 构建镜像
npm run docker:build

# 运行容器
npm run docker:run

# 或使用 Docker Compose
npm run docker:compose
```

### 传统部署

详细部署指南请参考 [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)。

## 可用脚本

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建应用
- `npm run build:prod` - 构建生产版本
- `npm run preview` - 预览生产构建
- `npm run docker:build` - 构建 Docker 镜像
- `npm run docker:run` - 运行 Docker 容器
- `npm run docker:compose` - 使用 Docker Compose 启动
- `npm run docker:compose:down` - 停止 Docker Compose

## 文档

- [部署指南](./docs/DEPLOYMENT.md) - 详细的部署说明
- [环境变量说明](./docs/ENVIRONMENT.md) - 环境变量配置指南
- [部署检查清单](./docs/CHECKLIST.md) - 部署前的检查清单

## 页面路由

### 完整版路由（使用 React Router）
- `/` - 首页（四屏滚动）
- `/bunker` - 地堡页面
- `/market` - 交易页面
- `/loadout` - 我的资产页面
- `/agent` - 特工页面

### 简化版入口（适合 Telegram 小程序体验）
- `/app` - 简化版应用，使用状态切换而非路由，包含：
  - UPLINK（简化首页：倒计时 + K线图）
  - ASSETS（简化市场：资产卡片）
  - AGENTS（简化特工：基本信息 + 任务列表）

**注意**：简化版入口 `/app` 使用内部状态切换视图，适合 Telegram 小程序等场景。完整版路由系统保持不变，两者可以共存。

## 开发

### 代码规范

项目使用 ESLint 进行代码检查（如已配置）。

### 提交代码

确保代码通过 lint 检查后再提交。

## 许可证

私有项目，保留所有权利。

## 免责声明

This is a gamified asset simulation. Not financial advice.

