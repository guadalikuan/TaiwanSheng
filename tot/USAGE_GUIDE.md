# 🛡️ 兵易·TOT (TaiOneToken) 战术操作指南

本指南详细说明了如何部署、管理和控制 TOT 代币系统。该系统基于 Solana Token-2022 标准，具备“动态税收”和“主权级管制”能力。

## 📂 文件结构

- **`scripts/deploy_tot.ts`**: **[铸剑]** 初始部署脚本。负责创建代币、设置税率、元数据和永久代理权。
- **`scripts/emergency_ops.ts`**: **[管制]** 战时操作终端。提供冻结账户、强制划转资产等高级权限功能。
- **`assets/metadata.json`**: **[弹头]** 代币元数据文件，定义了代币名称、符号和战略属性。
- **`SECURITY_CHECKLIST.md`**: **[安防]** 部署前必须执行的安全检查清单。

---

## 🚀 第一阶段：铸剑 (部署)

### 1. 准备工作
确保已安装 Node.js 依赖：
```bash
cd tot
npm install
```

### 2. 装填弹头 (设置元数据)
1. 打开 `assets/metadata.json`，确认文案和属性符合战略要求。
2. 将此 JSON 文件上传至去中心化存储 (Arweave/IPFS)。
3. 获取 JSON 文件的 URL (例如 `https://arweave.net/...`)。
4. 打开 `scripts/deploy_tot.ts`，修改第 51 行：
   ```typescript
   metaUri: "您的_METADATA_URL",
   ```

### 3. 点火发射
执行部署脚本：
```bash
npx ts-node scripts/deploy_tot.ts
```
**脚本执行流程：**
1. 连接 Solana 网络 (默认 Devnet)。
2. 加载部署钱包 (`~/.config/solana/id.json`)。
3. 创建 TOT Mint 账户。
4. **注入灵魂**：初始化 Transfer Fee (交易税)、Permanent Delegate (管制权)、Metadata Pointer。
5. **铸造供应**：一次性铸造 2,027 亿枚 TOT。
6. **封印**：**销毁 Mint Authority**，确保总量永不增加。

**输出记录：**
脚本运行成功后，会输出 `Mint Address`。**请务必记录此地址！**

---

## 🎮 第二阶段：演习 (测试管制能力)

### 1. 配置终端
打开 `scripts/emergency_ops.ts`，将第 32 行替换为刚才部署的 Mint 地址：
```typescript
const MINT_ADDRESS = new PublicKey("您的_TOT_MINT_ADDRESS");
```

### 2. 启用功能
为了防止误操作，功能调用代码默认被注释。
在 `main()` 函数底部，取消注释您需要执行的操作：

**冻结敌对账户：**
```typescript
const ops = new EmergencyOps(connection, authority);
await ops.freezeTarget(new PublicKey("敌对账户地址"));
```

**强制划转资金 (资产没收)：**
```typescript
const ops = new EmergencyOps(connection, authority);
// 从 敌对账户 划转 1000 TOT 到 国库账户
await ops.seizeAssets(new PublicKey("敌对账户"), new PublicKey("国库账户"), 1000);
```

### 3. 执行指令
```bash
npx ts-node scripts/emergency_ops.ts
```

---

## ⚠️ 绝密提示

1. **私钥安全**：拥有 `deploy_tot.ts` 运行权限的钱包是整个 TOT 经济体的“上帝”。请务必阅读 `SECURITY_CHECKLIST.md` 并考虑迁移至多签钱包。
2. **不可逆操作**：Mint Authority 已被销毁，**无法增发**。请珍惜手中的 2027 亿枚筹码。
3. **网络环境**：默认配置为 `devnet`。正式发射前，请在脚本中将 `clusterApiUrl("devnet")` 改为 `clusterApiUrl("mainnet-beta")`。

---
**"铸剑非为杀戮，而为止戈。"**
