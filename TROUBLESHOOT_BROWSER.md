# 浏览器访问故障排除指南

## ✅ 服务器状态

服务器已成功重启并正常运行：
- ✅ 进程运行中 (PID: 36933)
- ✅ 端口 5173 正在监听 (IPv4, TCP *:5173)
- ✅ HTTP 状态码: 200 (正常)
- ✅ 两个地址均可访问

---

## 🔍 如果浏览器仍无法访问，请尝试以下步骤：

### 步骤 1: 清除浏览器缓存

**Chrome/Edge:**
1. 按 `Ctrl+Shift+Delete` (Windows) 或 `Cmd+Shift+Delete` (Mac)
2. 选择"缓存的图片和文件"
3. 时间范围选择"全部时间"
4. 点击"清除数据"

**或使用开发者工具:**
1. 按 `F12` 打开开发者工具
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

### 步骤 2: 清除 localStorage

在浏览器控制台（F12 -> Console）运行：

```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 步骤 3: 尝试不同的访问方式

1. **使用 IP 地址:**
   ```
   http://127.0.0.1:5173/arsenal
   ```

2. **使用 localhost:**
   ```
   http://localhost:5173/arsenal
   ```

3. **使用完整地址:**
   ```
   http://localhost:5173/
   ```
   然后点击导航到 `/arsenal`

### 步骤 4: 检查浏览器控制台错误

1. 按 `F12` 打开开发者工具
2. 查看 **Console** 标签页
3. 查看 **Network** 标签页
   - 检查是否有请求失败（红色）
   - 查看失败的请求状态码和错误信息

### 步骤 5: 检查防火墙和代理

1. **检查防火墙:**
   ```bash
   # macOS
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
   ```

2. **临时禁用代理:**
   - 检查浏览器代理设置
   - 临时关闭 VPN（如有）

3. **检查 hosts 文件:**
   ```bash
   # macOS/Linux
   cat /etc/hosts | grep localhost
   ```
   应该包含:
   ```
   127.0.0.1   localhost
   ::1         localhost
   ```

### 步骤 6: 使用隐身/无痕模式

打开浏览器的隐身模式（Chrome: `Ctrl+Shift+N`, Firefox: `Ctrl+Shift+P`），然后访问:
```
http://localhost:5173/arsenal
```

### 步骤 7: 检查是否有端口冲突

```bash
# 检查是否有其他程序占用端口 5173
lsof -i:5173

# 如果有其他程序，可以考虑使用不同端口
```

### 步骤 8: 检查 Vite 配置

确认 `vite.config.js` 中的配置:
```javascript
server: {
  port: 5173,
  host: '0.0.0.0', // ✅ 应该包含这一行
  open: true,
  cors: true,
}
```

---

## 🐛 常见错误及解决方法

### ERR_CONNECTION_REFUSED
- **原因**: 服务器未运行或端口未监听
- **解决**: 确认服务器正在运行，端口正确监听

### ERR_NAME_NOT_RESOLVED
- **原因**: DNS 解析问题
- **解决**: 使用 `127.0.0.1` 代替 `localhost`

### ERR_BLOCKED_BY_CLIENT
- **原因**: 广告拦截器或浏览器扩展
- **解决**: 临时禁用扩展或添加到白名单

### 页面加载但显示空白
- **原因**: JavaScript 错误或路由问题
- **解决**: 检查浏览器控制台的错误信息

---

## 📞 需要帮助？

如果以上步骤都无法解决问题，请提供以下信息：

1. **浏览器类型和版本** (Chrome 版本、Firefox 版本等)
2. **操作系统** (macOS 版本、Windows 版本等)
3. **浏览器控制台的错误信息** (F12 -> Console)
4. **Network 标签页的请求状态** (F12 -> Network，查看失败的请求)

---

## ✅ 快速测试命令

在终端运行以下命令，确认服务器可访问：

```bash
# 测试基本连接
curl http://localhost:5173

# 测试具体路由
curl http://localhost:5173/arsenal

# 查看服务器日志
tail -f /tmp/tws-dev.log
```

