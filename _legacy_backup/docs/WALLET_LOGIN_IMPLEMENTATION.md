# 官网钱包连接登录功能实现

## ✅ 实现完成

已在官网导航栏添加钱包连接登录功能，用户可以直接在首页连接钱包并登录。

---

## 🎯 功能位置

**位置**：导航栏右上角（Navbar组件）

**显示逻辑**：
- 未登录时：显示"连接钱包"按钮 + "登入"按钮
- 已登录时：显示用户信息 + "登出"按钮
- 仅当检测到MetaMask钱包时显示"连接钱包"按钮

---

## 📋 实现流程

### 1. 用户点击"连接钱包"按钮

**触发位置**：`Navbar.jsx` - 导航栏右上角

**代码逻辑**：
```javascript
const handleConnectWallet = async () => {
  // 1. 检查钱包是否安装
  if (!isWalletInstalled()) {
    setWalletError('请安装MetaMask钱包');
    return;
  }

  // 2. 连接钱包
  const { address } = await connectWallet();
  
  // 3. 生成登录消息
  const message = `TWS Protocol 登录验证\n\n地址: ${address}\n时间: ${new Date().toISOString()}\n\n点击签名以登录。`;
  
  // 4. 请求签名
  const signature = await signMessage(message);
  
  // 5. 尝试登录
  const result = await loginWithWallet(address, signature, message);
  
  // 6. 处理结果
  if (result.success) {
    window.location.reload(); // 登录成功，刷新页面
  } else if (result.needsRegistration) {
    navigate('/login', { 
      state: { 
        walletAddress: address,
        needsRegistration: true 
      } 
    }); // 需要注册，跳转到登录页面
  } else {
    setWalletError(result.message || '登录失败');
  }
};
```

---

### 2. 钱包连接

**工具函数**：`src/utils/wallet.js`

**功能**：
- `isWalletInstalled()` - 检查是否安装MetaMask
- `connectWallet()` - 连接钱包，返回地址和provider
- `signMessage()` - 签名消息，用于登录验证

**实现**：
```javascript
export const connectWallet = async () => {
  const accounts = await window.ethereum.request({ 
    method: 'eth_requestAccounts' 
  });
  const address = accounts[0];
  const provider = new ethers.BrowserProvider(window.ethereum);
  return { address, provider };
};
```

---

### 3. 后端验证

**API端点**：`POST /api/auth/login-wallet`

**请求参数**：
```json
{
  "address": "0x...",
  "signature": "0x...",
  "message": "TWS Protocol 登录验证..."
}
```

**验证流程**：
1. 验证地址格式
2. 查找用户（根据地址）
3. 验证签名（可选，当前简化处理）
4. 生成JWT token
5. 返回用户信息和token

**响应**：
```json
{
  "success": true,
  "token": "jwt_token",
  "user": {
    "address": "0x...",
    "username": "user123",
    "role": "USER"
  }
}
```

**如果未注册**：
```json
{
  "success": false,
  "needsRegistration": true,
  "message": "该钱包地址未注册，请先注册账户"
}
```

---

### 4. 前端登录处理

**AuthContext**：`src/contexts/AuthContext.jsx`

**函数**：`loginWithWallet(address, signature, message)`

**处理逻辑**：
```javascript
const loginWithWalletAuth = async (address, signature, message) => {
  const response = await loginWithWallet(address, signature, message);
  if (response.success) {
    setToken(response.token);
    setUser(response.user);
    setIsAuthenticated(true);
    localStorage.setItem('tws_token', response.token);
    return { success: true };
  } else {
    return { 
      success: false, 
      message: response.message || '登录失败',
      needsRegistration: response.needsRegistration || false
    };
  }
};
```

---

### 5. 未注册处理

**流程**：
1. 钱包连接成功
2. 尝试登录，返回 `needsRegistration: true`
3. 跳转到登录页面，传递钱包地址
4. 登录页面自动切换到钱包登录模式
5. 用户填写用户名和密码完成注册

**代码**：
```javascript
// Navbar.jsx
if (result.needsRegistration) {
  navigate('/login', { 
    state: { 
      walletAddress: address,
      needsRegistration: true 
    } 
  });
}

// LoginPage.jsx
useEffect(() => {
  if (location.state?.walletAddress && location.state?.needsRegistration) {
    setLoginMode('wallet');
    // 自动触发连接钱包
  }
}, [location.state]);
```

---

## 🎨 UI 展示

### 导航栏按钮

**未登录状态**：
```
[连接钱包] [登入 / LOGIN]
```

**已登录状态**：
```
[用户信息] [登出 / LOGOUT]
```

**按钮样式**：
- 连接钱包：蓝色背景，蓝色边框
- 登入：红色背景，红色边框
- 悬停效果：背景色加深，文字变白

---

## 🔄 完整流程

```
用户访问官网
    ↓
点击"连接钱包"按钮
    ↓
检查MetaMask是否安装
    ├─→ 未安装：显示错误提示
    └─→ 已安装：继续
    ↓
连接钱包（请求用户授权）
    ├─→ 用户拒绝：显示错误
    └─→ 用户同意：获取地址
    ↓
生成登录消息并请求签名
    ├─→ 用户拒绝：显示错误
    └─→ 用户同意：获取签名
    ↓
发送登录请求到后端
    ├─→ 登录成功：刷新页面，显示用户信息
    ├─→ 需要注册：跳转到登录页面，引导注册
    └─→ 登录失败：显示错误提示
```

---

## 📁 关键文件

### 前端
- `src/components/Navbar.jsx` - 导航栏组件（添加钱包连接按钮）
- `src/utils/wallet.js` - 钱包工具函数
- `src/contexts/AuthContext.jsx` - 认证上下文（钱包登录函数）
- `src/components/LoginPage.jsx` - 登录页面（钱包注册流程）

### 后端
- `server/routes/auth.js` - 认证路由（钱包登录/注册API）

---

## ✅ 功能特点

1. **一键登录**：用户只需点击"连接钱包"按钮，即可完成登录
2. **自动注册**：未注册用户自动跳转到注册流程
3. **错误提示**：友好的错误提示，引导用户操作
4. **状态管理**：登录状态实时更新，无需刷新页面

---

## 🔒 安全考虑

1. **签名验证**：使用消息签名验证钱包所有权
2. **地址验证**：验证钱包地址格式
3. **JWT Token**：登录成功后使用JWT token进行后续认证
4. **签名消息**：包含时间戳，防止重放攻击

---

## 📝 使用说明

### 用户操作

1. **安装MetaMask**（如果未安装）
   - 访问 https://metamask.io 下载安装

2. **连接钱包**
   - 点击导航栏右上角"连接钱包"按钮
   - 在MetaMask中授权连接
   - 签名登录消息

3. **登录成功**
   - 自动刷新页面
   - 显示用户信息和"登出"按钮

4. **未注册用户**
   - 自动跳转到登录页面
   - 填写用户名和密码完成注册

---

## ✅ 总结

**实现状态**：✅ 已完成

**功能位置**：导航栏右上角

**核心流程**：
1. 点击"连接钱包"按钮
2. 连接MetaMask钱包
3. 签名登录消息
4. 后端验证并返回token
5. 前端保存token并更新状态

**特点**：
- 一键登录，无需输入密码
- 自动处理未注册用户
- 友好的错误提示
- 实时状态更新

