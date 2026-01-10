# 🛡️ 兵易·TOT (TaiOneToken) 部署安全检查清单 (Security Checklist)

## 🚨 绝密级 - 部署前必读

在执行 `deploy_tot.ts` 启动 "铸剑" 计划之前，部署钱包（Deployer Wallet）持有者必须完成以下安全防护措施。此账户将掌握 TOT 经济体的最高权限（永久代理权、冻结权、税收配置权）。

### 1. 物理环境安全
- [ ] **专用设备**: 建议使用一台从未连接过公共 WiFi、且仅用于签名的“净网”笔记本电脑。
- [ ] **断网操作**: 如果可能，密钥生成的环节应当完全断网进行。

### 2. 钱包安全 (The Sovereign Key)
- [ ] **硬件钱包强制**: 强烈建议使用 Ledger 或 Trezor 硬件钱包作为 Deployer。
    - *脚本调整*: 如果使用硬件钱包，需修改脚本以支持 USB 连接签名（`deploy_tot.ts` 默认支持文件系统钱包，需改为 `solana-wallet-adapter` 或 CLI 交互模式）。
- [ ] **多重签名 (Multisig)**: 
    - **现状**: 初始部署使用单私钥以便快速启动。
    - **升级计划**: 部署完成后 24 小时内，必须将 `Authority` (Permanent Delegate, Freeze Authority, Transfer Fee Config Authority) 转移至 **Squads V4 多签钱包**。
    - **建议架构**: 3/5 多签（至少需要 3 人同意才能执行冻结或税率变更）。

### 3. 权限管理验证
- [ ] **Mint Authority 销毁**: 确认脚本中的 `createSetAuthorityInstruction` (Set to NULL) 能够成功执行。这是防止通胀的关键。
- [ ] **Freeze Authority 保留**: 确认冻结权限仅用于合规和防御，不可滥用。
- [ ] **Permanent Delegate 监控**: 该权限极其强大（可划转任何人资产），必须对该账户的所有操作进行 24/7 链上监控报警。

### 4. 灾备预案
- [ ] **私钥分片**: 如果必须使用软钱包，请使用 Shamir Secret Sharing (SSS) 将助记词分片存储在不同地理位置的安全屋。
- [ ] **紧急熔断**: 熟练掌握 `emergency_ops.ts` 中的 `freezeTarget` 操作，以便在遭受大规模黑客攻击时立即冻结黑客账户。

### 5. 部署演习
- [ ] **Devnet 验证**: 必须先在 Devnet 执行 `deploy_tot.ts` 至少 3 次，确认 Metadata 显示正确、转账税扣除正确、冻结功能可用。
- [ ] **小额测试**: 主网部署后，先进行小额转账测试，确认 Transfer Hook (如已启用) 不会卡住交易。

---
**"铸剑非为杀戮，而为止戈。" - 2027 绝密计划总指挥**
