# 重启后端服务指南

## 🔄 快速重启命令

### 方法1：使用进程ID（推荐）

```bash
# 1. 查找后端进程ID
ps aux | grep "node.*server.mjs" | grep -v grep

# 2. 停止服务（替换 PID 为实际的进程ID）
kill <PID>

# 3. 启动服务
cd server
node server.mjs
```

### 方法2：使用 pkill（如果有多个实例）

```bash
# 停止所有 server.mjs 进程
pkill -f "node.*server.mjs"

# 启动服务
cd server
node server.mjs
```

### 方法3：一键重启（如果使用后台运行）

```bash
kill $(ps aux | grep "node.*server.mjs" | grep -v grep | awk '{print $2}') && \
sleep 2 && \
cd server && \
node server.mjs > ../server-output.log 2>&1 &
```

## ✅ 验证服务已启动

```bash
# 1. 检查健康状态
curl http://localhost:3001/health

# 2. 检查进程
ps aux | grep "node.*server.mjs" | grep -v grep

# 3. 检查端口
lsof -i :3001
```

## 📝 说明

如果遇到 **HTTP 404** 错误，通常是因为：
- 后端服务器在添加新路由之前启动
- 需要重启服务器以加载新的路由配置

重启后，新添加的 API 路由（如 `/api/arsenal/my-assets`）将会生效。

