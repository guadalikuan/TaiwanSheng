# 资产提交失败故障排除指南

## 🔍 常见失败原因

### 1. 认证问题

**症状**: 
- 错误信息：`未登录，请先登录资产入库系统`
- HTTP 401 或 403

**检查**:
```javascript
// 在浏览器控制台运行
console.log('arsenal_token:', localStorage.getItem('arsenal_token'));
console.log('tws_token:', localStorage.getItem('tws_token'));
```

**解决**:
- 确保已登录资产入库系统
- 检查 token 是否存在
- 如果 token 过期，重新登录

---

### 2. 必填字段缺失

**症状**:
- 错误信息：`Missing required fields`
- HTTP 400

**必填字段**:
- ✅ 债权人姓名 (`ownerName`)
- ✅ 联系电话 (`phone`)
- ✅ 项目名称 (`projectName`)
- ✅ 省份 (`province`)
- ✅ 城市 (`city`)
- ✅ 建筑面积 (`area`)
- ✅ 期望回款金额 (`debtPrice`)

**检查**:
- 确保所有必填字段都已填写
- 检查是否有字段为空字符串

---

### 3. 网络连接问题

**症状**:
- 错误信息：`Failed to fetch` 或 `网络错误`
- 无法连接到服务器

**检查**:
```bash
# 检查后端服务器
curl http://localhost:10000/api/arsenal/submit
```

**解决**:
- 确认后端服务器正在运行
- 检查 API 地址配置：`VITE_API_BASE_URL=http://localhost:10000`

---

### 4. API 地址配置错误

**症状**:
- 请求发送到错误的地址
- CORS 错误

**检查**:
```javascript
// 在浏览器控制台运行
console.log('API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
```

**应该显示**: `http://localhost:10000`

---

### 5. 权限问题

**症状**:
- 错误信息：`Access Denied` 或 `Forbidden`
- HTTP 403

**检查**:
- 确认用户角色是 `SUBMITTER` 或 `DEVELOPER`
- 检查 token 中的角色信息

---

## 🔧 诊断步骤

### 步骤 1: 检查浏览器控制台

1. 打开浏览器开发者工具 (F12)
2. 查看 **Console** 标签的错误信息
3. 查看 **Network** 标签：
   - 找到 `/api/arsenal/submit` 请求
   - 查看请求状态码
   - 查看响应内容

### 步骤 2: 检查认证状态

在浏览器控制台运行：
```javascript
// 检查 token
const arsenalToken = localStorage.getItem('arsenal_token');
const twsToken = localStorage.getItem('tws_token');
console.log('arsenal_token:', arsenalToken ? '存在' : '不存在');
console.log('tws_token:', twsToken ? '存在' : '不存在');

// 检查用户信息
// 需要查看当前登录的用户信息
```

### 步骤 3: 检查表单数据

在提交前，在浏览器控制台运行：
```javascript
// 检查表单数据（需要在 ArsenalEntry 组件中）
// 或者查看 Network 标签中的请求体
```

### 步骤 4: 测试后端 API

```bash
# 测试后端是否可访问
curl http://localhost:10000/api/arsenal/submit

# 应该返回 401（未认证），说明 API 存在
```

---

## 🐛 常见错误信息及解决方案

### 错误 1: "未登录，请先登录资产入库系统"

**原因**: 没有 `arsenal_token`

**解决**:
1. 访问 `/arsenal` 页面
2. 使用资产入库账号登录
3. 重新提交

---

### 错误 2: "Missing required fields"

**原因**: 必填字段未填写

**解决**:
- 检查所有必填字段是否已填写
- 特别注意：省份和城市必须选择

---

### 错误 3: "Failed to fetch"

**原因**: 无法连接到后端服务器

**解决**:
1. 检查后端服务器是否运行
2. 检查 API 地址配置
3. 检查网络连接

---

### 错误 4: "HTTP 403: Forbidden"

**原因**: 权限不足

**解决**:
- 确认用户角色是 `SUBMITTER` 或 `DEVELOPER`
- 联系管理员检查账户权限

---

### 错误 5: "HTTP 500: Internal Server Error"

**原因**: 服务器内部错误

**解决**:
1. 查看后端日志
2. 检查数据文件权限
3. 检查磁盘空间

---

## 📋 快速检查清单

- [ ] 后端服务器正在运行
- [ ] 已登录资产入库系统
- [ ] `arsenal_token` 存在于 localStorage
- [ ] 所有必填字段已填写
- [ ] API 地址配置正确 (`http://localhost:10000`)
- [ ] 网络连接正常
- [ ] 用户角色正确 (`SUBMITTER` 或 `DEVELOPER`)

---

## 🔍 详细诊断命令

### 检查后端服务器
```bash
# 检查进程
ps aux | grep "node.*server.mjs"

# 检查端口
lsof -i:10000

# 测试 API
curl http://localhost:10000/api/arsenal/submit
```

### 检查前端配置
```bash
# 检查环境变量
cat .env | grep VITE_API

# 应该显示
# VITE_API_BASE_URL=http://localhost:10000
```

---

## 💡 如果仍然失败

请提供以下信息：

1. **浏览器控制台错误信息** (F12 → Console)
2. **网络请求详情** (F12 → Network → 找到失败的请求)
3. **错误消息** (alert 弹窗显示的具体错误)
4. **提交的数据** (可以截图表单内容，隐藏敏感信息)

---

**最后更新**: 2026-01-03

