# Solana钱包连接登录功能实现

## ✅ 实现完成

已将钱包连接从以太坊（MetaMask）改为Solana（Phantom）钱包。

---

## 🎯 主要修改

### 1. 前端钱包工具 (`src/utils/wallet.js`)

**从以太坊改为Solana**：
- ✅ 使用 `window.solana` 替代 `window.ethereum`
- ✅ 使用 `@solana/web3.js` 替代 `ethers.js`
- ✅ 地址格式：从 `0x...` 改为 Solana base58 地址（32-44字符）
- ✅ 签名方式：使用 Solana 的 `signMessage` API

**关键函数**：
```javascript
// 检查钱包是否安装
export const isWalletInstalled = () => {
  return typeof window !== 'undefined' && window.solana && window.solana.isPhantom;
};

// 连接钱包
export const connectWallet = async () => {
  const response = await window.solana.connect();
  return {
    address: response.publicKey.toString(),
    publicKey: response.publicKey,
    connection: new Connection(...)
  };
};

// 签名消息
export const signMessage = async (message) => {
  const messageBytes = new TextEncoder().encode(message);
  const signedMessage = await window.solana.signMessage(messageBytes);
  const signature = btoa(String.fromCharCode(...Array.from(signedMessage.signature)));
  return signature;
};
```

---

### 2. 后端验证逻辑 (`server/routes/auth.js`)

**地址验证**：
```javascript
// Solana地址格式验证（base58编码，32-44字符）
const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
if (!solanaAddressRegex.test(address)) {
  return res.status(400).json({
    success: false,
    error: 'Invalid address',
    message: 'Invalid Solana wallet address format'
  });
}
```

**签名验证**：
```javascript
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';

// 验证Solana签名
const publicKey = new PublicKey(address);
const messageBytes = new TextEncoder().encode(message);
const signatureBytes = Buffer.from(signature, 'base64');

const isValid = nacl.sign.detached.verify(
  messageBytes,
  signatureBytes,
  publicKey.toBytes()
);
```

---

### 3. 用户存储 (`server/utils/userStorage.js`)

**地址比较**：
- ❌ 旧：`u.address.toLowerCase() === address.toLowerCase()`（以太坊地址）
- ✅ 新：`u.address === address`（Solana地址大小写敏感）

---

### 4. UI文本更新

**所有MetaMask引用改为Phantom**：
- ✅ `Navbar.jsx` - 导航栏错误提示
- ✅ `LoginPage.jsx` - 登录页面提示和链接
- ✅ 下载链接：从 `https://metamask.io` 改为 `https://phantom.app`

---

## 📦 依赖包

### 前端
```json
{
  "@solana/web3.js": "^latest",
  "@solana/wallet-adapter-base": "^latest",
  "@solana/wallet-adapter-react": "^latest",
  "@solana/wallet-adapter-react-ui": "^latest",
  "@solana/wallet-adapter-wallets": "^latest"
}
```

### 后端
```json
{
  "@solana/web3.js": "^latest",
  "bs58": "^latest",
  "tweetnacl": "^latest"
}
```

---

## 🔄 完整流程

```
用户访问官网
    ↓
点击"连接钱包"按钮
    ↓
检查Phantom钱包是否安装
    ├─→ 未安装：提示安装Phantom钱包
    └─→ 已安装：继续
    ↓
连接Phantom钱包（请求用户授权）
    ├─→ 用户拒绝：显示错误
    └─→ 用户同意：获取Solana地址
    ↓
生成登录消息并请求签名
    ├─→ 用户拒绝：显示错误
    └─→ 用户同意：获取base64签名
    ↓
发送登录请求到后端
    ├─→ 验证Solana地址格式
    ├─→ 验证签名（使用nacl）
    ├─→ 登录成功：返回token
    ├─→ 需要注册：返回needsRegistration
    └─→ 登录失败：返回错误
```

---

## 🔒 Solana地址格式

**特点**：
- Base58编码
- 长度：32-44字符
- 大小写敏感
- 示例：`7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU`

**验证正则**：
```javascript
/^[1-9A-HJ-NP-Za-km-z]{32,44}$/
```

---

## 🔐 签名验证

**流程**：
1. 前端：将消息转换为 `Uint8Array`
2. 前端：调用 `window.solana.signMessage(messageBytes)`
3. 前端：将签名转换为 base64 字符串
4. 后端：将签名从 base64 解码为 `Uint8Array`
5. 后端：使用 `nacl.sign.detached.verify()` 验证签名

**关键代码**：
```javascript
// 前端签名
const messageBytes = new TextEncoder().encode(message);
const signedMessage = await window.solana.signMessage(messageBytes);
const signature = btoa(String.fromCharCode(...Array.from(signedMessage.signature)));

// 后端验证
const publicKey = new PublicKey(address);
const messageBytes = new TextEncoder().encode(message);
const signatureBytes = Buffer.from(signature, 'base64');
const isValid = nacl.sign.detached.verify(
  messageBytes,
  signatureBytes,
  publicKey.toBytes()
);
```

---

## 📝 使用说明

### 用户操作

1. **安装Phantom钱包**
   - 访问 https://phantom.app 下载安装
   - 创建或导入钱包

2. **连接钱包**
   - 点击导航栏右上角"连接钱包"按钮
   - 在Phantom中授权连接
   - 签名登录消息

3. **登录成功**
   - 自动刷新页面
   - 显示用户信息和"登出"按钮

4. **未注册用户**
   - 自动跳转到登录页面
   - 填写用户名和密码完成注册

---

## ⚠️ 注意事项

1. **地址大小写敏感**：Solana地址是大小写敏感的，不能使用 `toLowerCase()`
2. **签名格式**：Solana签名是 `Uint8Array`，需要转换为 base64 传输
3. **钱包要求**：目前仅支持 Phantom 钱包（`window.solana.isPhantom`）
4. **网络配置**：默认使用 Solana 主网，可通过环境变量 `VITE_SOLANA_RPC_URL` 配置

---

## 🔄 与以太坊的差异

| 特性 | 以太坊 | Solana |
|------|--------|--------|
| 钱包对象 | `window.ethereum` | `window.solana` |
| 地址格式 | `0x...` (42字符) | Base58 (32-44字符) |
| 地址大小写 | 不敏感 | 敏感 |
| 签名库 | `ethers.js` | `@solana/web3.js` + `tweetnacl` |
| 签名格式 | Hex字符串 | Base64字符串 |
| 连接方法 | `eth_requestAccounts` | `solana.connect()` |
| 签名方法 | `signer.signMessage()` | `solana.signMessage()` |

---

## ✅ 总结

**实现状态**：✅ 已完成

**钱包类型**：Solana (Phantom)

**核心功能**：
1. ✅ 连接Phantom钱包
2. ✅ Solana地址格式验证
3. ✅ Solana签名验证
4. ✅ 用户登录/注册流程

**关键文件**：
- `src/utils/wallet.js` - Solana钱包工具函数
- `server/routes/auth.js` - Solana签名验证
- `server/utils/userStorage.js` - Solana地址存储

