# TOT项目测试执行指南

## 📋 前置要求

要成功执行TOT项目的测试，需要安装以下工具：

### 1. Rust 和 Cargo
```bash
# 访问 https://rustup.rs/ 安装Rust
# 或使用以下命令（Windows）:
# 下载并运行 rustup-init.exe
```

### 2. Solana CLI
```bash
# Windows PowerShell
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# 或访问: https://docs.solana.com/cli/install-solana-cli-tools
```

### 3. Anchor CLI
```bash
# 安装Anchor版本管理器
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# 安装最新版本的Anchor
avm install latest
avm use latest

# 验证安装
anchor --version
```

### 4. Node.js 和 npm
```bash
# 确保已安装Node.js (v16+)
node --version
npm --version
```

## 🔧 环境配置

### Windows PowerShell

1. **设置环境变量**（当前会话）:
```powershell
$env:ANCHOR_PROVIDER_URL="https://api.devnet.solana.com"
$env:ANCHOR_WALLET="$env:USERPROFILE\.config\solana\id.json"
```

2. **或使用提供的脚本**:
```powershell
.\setup-env.ps1
```

3. **持久化环境变量**（可选）:
   - 打开"系统属性" > "环境变量"
   - 添加 `ANCHOR_PROVIDER_URL` = `https://api.devnet.solana.com`
   - 添加 `ANCHOR_WALLET` = `%USERPROFILE%\.config\solana\id.json`

### 创建Solana钱包

```bash
# 生成新的密钥对
solana-keygen new

# 或使用现有钱包
# 确保钱包文件位于: ~/.config/solana/id.json (Linux/Mac)
# 或: %USERPROFILE%\.config\solana\id.json (Windows)
```

### 获取测试SOL（Devnet）

```bash
# 切换到devnet
solana config set --url https://api.devnet.solana.com

# 获取空投（用于测试）
solana airdrop 2
```

## 🚀 执行测试

### 方式1: 使用测试执行脚本（推荐）

```powershell
# 设置环境
.\setup-env.ps1

# 执行所有测试
npx ts-node tests/execute-tests.ts
```

### 方式2: 使用Anchor test命令

```bash
# 构建程序
anchor build

# 运行所有测试
anchor test

# 运行特定测试文件
anchor test tests/initialize.test.ts
```

### 方式3: 使用npm test

```bash
npm test
```

### 方式4: 使用ts-mocha直接运行

```bash
# 设置环境变量后
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/tot-token.ts --reporter spec
```

## 📊 测试报告

测试执行完成后，报告将生成在：
- **HTML报告**: `tests/reports/report.html`
- **JSON报告**: `tests/reports/report.json`
- **总结报告**: `tests/reports/test-summary.md`

## 🐛 常见问题

### 1. Anchor CLI未安装
**错误**: `'anchor' 不是内部或外部命令`

**解决方案**:
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

### 2. 环境变量未设置
**错误**: `ANCHOR_PROVIDER_URL is not defined`

**解决方案**:
```powershell
$env:ANCHOR_PROVIDER_URL="https://api.devnet.solana.com"
```

### 3. 钱包文件不存在
**错误**: `ENOENT: no such file or directory, open '~/.config/solana/id.json'`

**解决方案**:
```bash
solana-keygen new
```

### 4. 余额不足
**错误**: `Insufficient funds`

**解决方案**:
```bash
solana config set --url https://api.devnet.solana.com
solana airdrop 2
```

### 5. 程序未构建
**错误**: `Program not found`

**解决方案**:
```bash
anchor build
```

## 📝 测试文件结构

```
tests/
├── helpers/
│   ├── setup.ts          # 测试环境设置
│   ├── accounts.ts       # PDA计算和账户辅助
│   └── assertions.ts     # 自定义断言函数
├── fixtures/
│   ├── pools.ts          # 池子测试数据
│   └── users.ts          # 用户测试数据
├── tot-token.ts          # 基础测试
├── initialize.test.ts    # 初始化测试
├── pools.test.ts         # 池子管理测试
├── mint.test.ts          # 铸造测试
├── holder.test.ts        # 持有者管理测试
├── tax.test.ts           # 税率管理测试
├── transfer.test.ts      # 转账测试
├── tax-calculation.test.ts # 税率计算测试
├── admin.test.ts         # 管理员功能测试
├── errors.test.ts        # 错误场景测试
├── boundary.test.ts      # 边界条件测试
├── execute-tests.ts      # 测试执行脚本
└── reports/              # 测试报告目录
    ├── report.html
    ├── report.json
    └── test-summary.md
```

## ✅ 测试覆盖范围

- ✅ 系统初始化
- ✅ 所有5个池子类型
- ✅ 铸造功能
- ✅ 持有者管理
- ✅ 税率配置和管理
- ✅ 带税转账
- ✅ 税率计算
- ✅ 管理员功能
- ✅ 错误场景
- ✅ 边界条件

## 🔄 下一步

1. 安装所有必需的工具（Rust, Solana CLI, Anchor CLI）
2. 配置环境变量
3. 创建Solana钱包
4. 获取测试SOL
5. 执行测试脚本
6. 查看测试报告

## 📞 需要帮助？

如果遇到问题，请检查：
1. 所有工具是否正确安装
2. 环境变量是否正确设置
3. 钱包文件是否存在
4. 是否有足够的SOL余额
5. 程序是否已构建
