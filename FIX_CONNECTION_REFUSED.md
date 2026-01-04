# 修复 ERR_CONNECTION_REFUSED 问题

## 🔍 问题原因

服务器只监听 IPv6 (::1)，而浏览器尝试连接 IPv4 (127.0.0.1)，导致连接被拒绝。

## ✅ 解决方案

已更新 `vite.config.js`，添加了 `host: '0.0.0.0'` 配置，使服务器同时监听 IPv4 和 IPv6。

## 🔧 修复步骤

### 1. 停止当前服务器

在运行服务器的终端按 `Ctrl+C` 停止服务器。

或者，如果服务器在后台运行，使用以下命令：

```bash
# 查找并停止 concurrently 进程
ps aux | grep concurrently | grep -v grep | awk '{print $2}' | xargs kill -TERM

# 或者停止所有 vite 进程
ps aux | grep vite | grep -v grep | awk '{print $2}' | xargs kill -TERM
```

### 2. 重新启动服务器

```bash
npm run dev
```

### 3. 验证修复

启动后，检查服务器是否监听所有接口：

```bash
lsof -i:5173
```

应该看到类似这样的输出：
```
node    PID   fanann   18u  IPv6  ... TCP *:5173 (LISTEN)
```

注意：应该是 `*:5173` 而不是 `localhost:5173`。

### 4. 访问页面

现在应该可以通过以下任一地址访问：
- http://localhost:5173
- http://127.0.0.1:5173
- http://[::1]:5173

---

## 📋 配置更改

**文件**: `vite.config.js`

**更改前**:
```javascript
server: {
  port: 5173,
  open: true,
  cors: true,
},
```

**更改后**:
```javascript
server: {
  port: 5173,
  host: '0.0.0.0', // 监听所有网络接口（IPv4 和 IPv6）
  open: true,
  cors: true,
},
```

---

## ✅ 验证步骤

1. ✅ 服务器进程正在运行
2. ✅ 端口 5173 正在监听
3. ✅ 配置已更新为 `host: '0.0.0.0'`
4. ⏳ **需要重启服务器以应用更改**

---

**修复完成后，应该可以正常访问 http://localhost:5173/arsenal**

