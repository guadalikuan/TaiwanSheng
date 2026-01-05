# 快速配置高德地图 API Key

## 🚀 快速开始

### 如果您还没有 API Key

**步骤 1**: 获取 API Key
1. 访问: https://console.amap.com/
2. 注册/登录账号
3. 创建应用（类型：Web服务）
4. 添加 Key（类型：Web服务）
5. 复制生成的 Key

**详细步骤**: 查看 `docs/GET_AMAP_API_KEY.md`

---

### 如果您已有 API Key

#### 方法 1: 使用配置脚本（推荐）

```bash
./configure-amap-key.sh
```

然后按提示输入您的 API Key。

#### 方法 2: 手动配置

1. **打开 `.env` 文件**

2. **找到这一行**:
   ```bash
   VITE_AMAP_API_KEY=
   ```

3. **在等号后面添加您的 API Key**:
   ```bash
   VITE_AMAP_API_KEY=你的实际API_Key
   ```

4. **保存文件**

---

## ✅ 配置后验证

1. **重启开发服务器**:
   ```bash
   # 在运行 npm run dev 的终端按 Ctrl+C 停止
   # 然后重新启动
   npm run dev
   ```

2. **访问测试页面**:
   ```
   http://localhost:5174/test-amap
   ```

3. **应该看到**:
   - ✅ "已检测到高德地图 API Key 配置"
   - ✅ 可以点击测试按钮

---

## 🐛 如果遇到问题

- 检查 API Key 是否正确复制（没有多余空格）
- 确认 Key 类型是"Web服务"
- 确认已重启开发服务器
- 查看 `docs/GET_AMAP_API_KEY.md` 获取详细帮助

