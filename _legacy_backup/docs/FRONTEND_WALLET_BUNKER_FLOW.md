# 前端钱包连接和地堡避险操作流程

## 📋 概述

本文档详细说明前端如何实现钱包连接和地堡避险功能的完整操作流程。

---

## 🔐 第一部分：钱包连接流程

### 1.1 钱包连接入口

**位置**：导航栏右上角（`Navbar.jsx`）

**显示逻辑**：
- 未登录时：显示"连接钱包"按钮 + "登入"按钮
- 已登录时：显示用户信息 + "登出"按钮
- 仅当检测到 Phantom 钱包时显示"连接钱包"按钮

### 1.2 钱包连接步骤

#### 步骤 1: 检查钱包安装

**代码位置**：`src/utils/wallet.js`

```javascript
export const isWalletInstalled = () => {
  return typeof window !== 'undefined' && window.solana && window.solana.isPhantom;
};
```

**用户操作**：
- 如果未安装 Phantom 钱包，显示提示："请安装Phantom钱包"
- 提供下载链接：https://phantom.app

#### 步骤 2: 连接钱包

**代码位置**：`src/components/Navbar.jsx` - `handleConnectWallet()`

**流程**：
```javascript
// 1. 检查钱包是否安装
if (!isWalletInstalled()) {
  setWalletError('请安装Phantom钱包');
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
```

**用户操作**：
1. 点击"连接钱包"按钮
2. Phantom 钱包弹出授权窗口
3. 用户点击"连接"授权
4. 钱包返回 Solana 地址

#### 步骤 3: 签名登录消息

**代码位置**：`src/utils/wallet.js` - `signMessage()`

**流程**：
```javascript
// 1. 确保钱包已连接
if (!window.solana.isConnected) {
  await window.solana.connect();
}

// 2. 将消息转换为 Uint8Array
const messageBytes = new TextEncoder().encode(message);

// 3. 请求签名
const signedMessage = await window.solana.signMessage(messageBytes);

// 4. 转换为 base64 字符串
const signature = btoa(String.fromCharCode(...Array.from(signedMessage.signature)));
```

**用户操作**：
1. Phantom 钱包弹出签名请求
2. 用户查看消息内容
3. 用户点击"签名"确认
4. 钱包返回签名

#### 步骤 4: 后端验证并登录

**代码位置**：`src/contexts/AuthContext.jsx` - `loginWithWalletAuth()`

**流程**：
```javascript
// 1. 发送登录请求
const response = await loginWithWallet(address, signature, message);

// 2. 处理结果
if (response.success) {
  // 登录成功
  setToken(response.token);
  setUser(response.user);
  setIsAuthenticated(true);
  localStorage.setItem('tws_token', response.token);
  window.location.reload(); // 刷新页面
} else if (response.needsRegistration) {
  // 需要注册，跳转到登录页面
  navigate('/login', { 
    state: { 
      walletAddress: address,
      needsRegistration: true 
    } 
  });
}
```

**用户操作**：
- **已注册用户**：自动登录，页面刷新，显示用户信息
- **未注册用户**：跳转到登录页面，引导完成注册

---

## 🏰 第二部分：地堡避险流程

### 2.1 进入地堡

**入口**：首页点击"进入地堡"按钮

**代码位置**：`src/components/OmegaSection.jsx`

**流程**：
```javascript
const handleEnterBunker = () => {
  if (!isAuthenticated) {
    // 未登录，跳转到登录页面
    navigate('/login', { state: { from: { pathname: '/bunker' } } });
  } else {
    // 已登录，直接进入地堡
    navigate('/bunker');
  }
};
```

### 2.2 地堡数据加载

**代码位置**：`src/components/BunkerApp.jsx` - `loadUserData()`

**并行加载的数据**：
```javascript
const [assetsResponse, riskResponse, statsResponse, capacityResponse] = await Promise.all([
  getHomepageAssets(),        // 资产列表
  getRiskData(),              // 风险数据
  getBunkerStats(),           // 社区统计
  getRefugeCapacity(user?.address)  // 避险能力详情
]);
```

**加载的数据包括**：
1. **用户资产**：用户拥有的房产列表
2. **风险数据**：当前风险等级、风险分数、倒计时信息
3. **社区统计**：总用户数、总资产数、平均生存率
4. **避险能力**：完整的生存率计算详情

### 2.3 生存率计算

**代码位置**：`src/components/BunkerApp.jsx` - `calculateSurvivalRate()`

**计算公式**：
```javascript
生存率 = 基础生存率 + 代币避险加成 + 房产避险加成 + 组合加成 - 风险惩罚

其中：
- 基础生存率 = 34%（初始低值，诱导行动）
- 代币避险加成 = min(代币余额 / 10,000, 30) * 1%
- 房产避险加成 = sum(每个房产的加成)
  - 基础加成：15%
  - 位置加成：位置系数 * 5%
  - 面积加成：面积系数 * 3%
- 组合加成 = (代币加成 + 房产加成) * 10%（如果同时持有）
- 风险惩罚 = 根据风险等级：CRITICAL(-20%), HIGH(-10%), MEDIUM(0), LOW(+5%)
```

**优先使用后端计算**：
```javascript
// 优先使用后端API返回的完整计算结果
if (capacityResponse && capacityResponse.success && capacityResponse.data) {
  setSurvivalRate(capacityResponse.data.survivalRate);
} else {
  // 备用：使用前端计算
  const calculatedRate = calculateSurvivalRate(twsBalance, assets, riskLevel);
  setSurvivalRate(calculatedRate);
}
```

### 2.4 避险能力展示

**UI 组件**：`src/components/BunkerApp.jsx`

**显示内容**：

#### 1. 生存率大卡片
- 显示当前生存率（大号数字）
- 风险等级标识（颜色编码）
- 风险预警信息

#### 2. TWS 代币卡片
- 代币余额
- 代币避险加成（每 10,000 TWS = +1%）
- 购买代币按钮

#### 3. 房产资产卡片
- 用户拥有的房产列表
- 每个房产的避险加成详情
- 房产位置和面积信息

#### 4. 避险能力详情（可展开）
- 基础生存率：34%
- 代币避险加成：X%
- 房产避险加成：X%
- 组合加成：X%
- 风险惩罚：-X%
- 总生存率：X%

### 2.5 实时更新

**代码位置**：`src/components/BunkerApp.jsx` - `useEffect()`

**更新机制**：
```javascript
// 每30秒刷新风险数据
const riskInterval = setInterval(() => {
  getRiskData().then(response => {
    if (response && response.success && response.data) {
      setRiskData(response.data);
      // 动态调整生存率
      const calculatedRate = calculateSurvivalRate(twsBalance, assets, response.data.riskLevel);
      setSurvivalRate(calculatedRate);
    }
  });
}, 30000);
```

**更新内容**：
- 风险等级变化
- 风险分数变化
- 倒计时更新
- 生存率自动调整

---

## 🎯 第三部分：完整用户操作流程

### 场景 1: 新用户首次使用

#### 步骤 1: 访问首页
- 用户打开网站
- 看到首页倒计时和风险预警

#### 步骤 2: 点击"进入地堡"
- 系统检测到未登录
- 自动跳转到登录页面

#### 步骤 3: 连接钱包
- 点击导航栏"连接钱包"按钮
- 如果未安装 Phantom，提示安装
- 如果已安装，弹出连接授权
- 用户点击"连接"

#### 步骤 4: 签名登录
- Phantom 弹出签名请求
- 用户查看消息内容
- 用户点击"签名"

#### 步骤 5: 注册账户（如果未注册）
- 系统检测到钱包地址未注册
- 跳转到注册页面
- 用户填写用户名和密码
- 再次签名完成注册

#### 步骤 6: 进入地堡
- 登录成功后，自动跳转到地堡
- 显示初始生存率：34%
- 显示风险预警

#### 步骤 7: 查看避险能力
- 查看当前生存率
- 查看代币避险加成（初始为 0%）
- 查看房产避险加成（初始为 0%）
- 查看风险等级和倒计时

#### 步骤 8: 提升生存率
- **购买 TWS 代币**：
  - 点击"购买代币"按钮
  - 选择购买数量
  - 使用 Solana 钱包支付
  - 购买后生存率立即提升（每 10,000 TWS = +1%）
  
- **购买房产**：
  - 浏览资产市场
  - 选择心仪的房产
  - 查看房产的避险加成详情
  - 购买房产
  - 购买后生存率提升（基础 +15%，位置和面积额外加成）

#### 步骤 9: 查看组合加成
- 如果同时持有代币和房产
- 自动获得组合加成（总加成的 10%）
- 生存率进一步提升

### 场景 2: 已登录用户

#### 步骤 1: 直接进入地堡
- 用户已登录
- 点击"进入地堡"直接进入

#### 步骤 2: 查看当前状态
- 查看当前生存率
- 查看代币余额和加成
- 查看拥有的房产
- 查看风险等级

#### 步骤 3: 继续提升
- 购买更多代币
- 购买更多房产
- 生存率实时更新

---

## 🔄 第四部分：数据流和状态管理

### 4.1 认证状态

**Context**：`src/contexts/AuthContext.jsx`

**状态**：
```javascript
{
  user: {
    address: "Solana地址",
    username: "用户名",
    role: "USER"
  },
  isAuthenticated: true,
  token: "JWT token"
}
```

**更新时机**：
- 钱包连接并登录成功后
- 用户登出时

### 4.2 地堡数据状态

**组件状态**：`src/components/BunkerApp.jsx`

**状态变量**：
```javascript
const [survivalRate, setSurvivalRate] = useState(34);        // 生存率
const [twsBalance, setTwsBalance] = useState(0);            // TWS代币余额
const [userAssets, setUserAssets] = useState([]);            // 用户资产
const [riskData, setRiskData] = useState(null);              // 风险数据
const [bunkerStats, setBunkerStats] = useState(null);        // 社区统计
const [refugeCapacity, setRefugeCapacity] = useState(null);  // 避险能力详情
```

**更新时机**：
- 组件加载时（并行加载所有数据）
- 每 30 秒刷新风险数据
- 用户购买代币或房产后

### 4.3 API 调用

**API 函数**：`src/utils/api.js`

**主要 API**：
```javascript
// 获取风险数据
getRiskData() → {
  riskLevel: 'HIGH',
  riskScore: 75,
  riskPremium: 142.5,
  events: [...],
  countdown: {...}
}

// 获取避险能力详情
getRefugeCapacity(userAddress) → {
  survivalRate: 45.5,
  breakdown: {
    base: 34,
    token: 5.0,
    assets: 12.5,
    combination: 1.75,
    risk: -10
  },
  tokenBalance: 50000,
  assetCount: 2,
  assetDetails: [...]
}

// 获取资产列表
getHomepageAssets() → {
  assets: [...],
  total: 100
}

// 获取社区统计
getBunkerStats() → {
  totalUsers: 12405,
  totalAssets: 500,
  averageSurvivalRate: 52.3
}
```

---

## 🎨 第五部分：UI 交互流程

### 5.1 钱包连接 UI

**位置**：导航栏右上角

**状态显示**：
- **未连接**：显示"连接钱包"按钮（蓝色）
- **连接中**：显示"连接中..."（带加载动画）
- **已连接**：显示用户信息（用户名 + 钱包地址）

**错误处理**：
- 未安装钱包：显示提示和下载链接
- 连接失败：显示错误消息（5秒后自动消失）
- 签名失败：显示错误消息

### 5.2 地堡主界面 UI

**布局结构**：
```
┌─────────────────────────────────────┐
│  紧急通知栏（高风险时显示）          │
├─────────────────────────────────────┤
│  风险预警卡片                        │
├─────────────────────────────────────┤
│  生存率大卡片                        │
│  ┌──────────┐  ┌──────────┐         │
│  │ TWS代币  │  │ 房产资产 │         │
│  └──────────┘  └──────────┘         │
├─────────────────────────────────────┤
│  避险能力详情（可展开/收起）         │
├─────────────────────────────────────┤
│  社区统计                            │
└─────────────────────────────────────┘
```

**交互元素**：
- **生存率卡片**：点击可展开详情
- **代币卡片**：点击"购买"按钮跳转到购买页面
- **房产卡片**：点击查看详情，点击"购买"购买房产
- **风险预警**：实时更新，高风险时显示紧急通知

### 5.3 实时更新动画

**更新效果**：
- 生存率变化：数字动画过渡
- 风险等级变化：颜色渐变
- 数据加载：加载动画
- 紧急警报：脉冲动画

---

## 🔧 第六部分：技术实现细节

### 6.1 钱包连接实现

**工具函数**：`src/utils/wallet.js`

**核心函数**：
```javascript
// 检查钱包是否安装
isWalletInstalled() → boolean

// 连接钱包
connectWallet() → { address, publicKey, connection }

// 签名消息
signMessage(message) → signature (base64)

// 验证地址格式
isValidSolanaAddress(address) → boolean

// 监听账户变化
onAccountsChanged(callback) → cleanup function

// 断开连接
disconnectWallet() → void
```

### 6.2 避险计算实现

**前端计算**：`src/components/BunkerApp.jsx` - `calculateSurvivalRate()`

**后端计算**：`server/routes/bunker.js` - `calculateRefugeCapacity()`

**优先级**：
1. 优先使用后端 API 返回的完整计算结果
2. 如果后端失败，使用前端简化计算作为备用

### 6.3 数据同步

**同步机制**：
- 初始加载：并行请求所有数据
- 定时刷新：每 30 秒刷新风险数据
- 事件驱动：用户操作后立即刷新相关数据

**缓存策略**：
- API 请求去重（500ms 内的重复请求会被合并）
- 错误重试（最多 3 次，指数退避）

---

## 📊 第七部分：数据流程图

### 钱包连接流程

```
用户点击"连接钱包"
    ↓
检查 Phantom 是否安装
    ├─→ 未安装：显示提示
    └─→ 已安装：继续
    ↓
调用 window.solana.connect()
    ├─→ 用户拒绝：显示错误
    └─→ 用户同意：获取地址
    ↓
生成登录消息
    ↓
调用 window.solana.signMessage()
    ├─→ 用户拒绝：显示错误
    └─→ 用户同意：获取签名
    ↓
发送登录请求到后端
    ├─→ 登录成功：保存 token，刷新页面
    ├─→ 需要注册：跳转到注册页面
    └─→ 登录失败：显示错误
```

### 地堡避险流程

```
用户进入地堡
    ↓
检查登录状态
    ├─→ 未登录：跳转到登录页面
    └─→ 已登录：继续
    ↓
并行加载数据
    ├─→ 资产列表
    ├─→ 风险数据
    ├─→ 社区统计
    └─→ 避险能力详情
    ↓
计算生存率
    ├─→ 优先使用后端计算结果
    └─→ 备用前端计算
    ↓
显示地堡界面
    ├─→ 生存率大卡片
    ├─→ TWS代币卡片
    ├─→ 房产资产卡片
    └─→ 避险能力详情
    ↓
定时刷新（每30秒）
    ├─→ 更新风险数据
    └─→ 重新计算生存率
```

---

## ✅ 第八部分：检查清单

### 钱包连接检查

- [ ] Phantom 钱包已安装
- [ ] 钱包连接功能正常
- [ ] 签名功能正常
- [ ] 登录流程完整
- [ ] 注册流程完整
- [ ] 错误处理完善

### 地堡避险检查

- [ ] 数据加载正常
- [ ] 生存率计算准确
- [ ] 实时更新正常
- [ ] UI 显示正确
- [ ] 交互流畅
- [ ] 错误处理完善

---

## 🎉 总结

前端钱包连接和地堡避险功能的完整流程包括：

1. **钱包连接**：检查安装 → 连接授权 → 签名验证 → 登录/注册
2. **进入地堡**：检查登录 → 加载数据 → 计算生存率 → 显示界面
3. **避险提升**：购买代币 → 购买房产 → 获得组合加成 → 生存率提升
4. **实时更新**：定时刷新 → 动态调整 → 风险预警

所有功能已完整实现，用户可以通过连接钱包、购买代币和房产来提升生存率，实现避险目的。

