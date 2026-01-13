我先快速查看这个 `tot` 工程的入口与模块结构，然后按 Solana Playground 的限制整理一份可照抄的部署与测试步骤。
下面是一份基于 `d:\三大赛\李宽TWS\TaiwanSheng\tot` 这个工程的 **Solana Playground（solpg）部署+测试**详细操作指南（不需要再新建任何本地文档文件，照做即可）。

**准备工作（Solana Playground）**
- 打开 https://beta.solpg.io/
- 左下角创建/导入钱包，Settings 把 Endpoint 设为 Devnet
- Airdrop 领够 SOL（建议 5–10 SOL，Token-2022 初始化比较贵）

**1）在 Solpg 创建 Anchor 项目**
- 点击 “Create Project” → 选择 “Anchor (Rust)”
- 项目名建议：`tot-token`（名字随意，但后面路径会跟着变）

**2）把本地 Rust 程序代码完整搬到 Solpg**
你的本地程序入口是 [lib.rs](file:///d:/三大赛/李宽TWS/TaiwanSheng/tot/src/lib.rs)，并且它用 `pub mod constants/errors/state/instructions/utils` 这种“多文件模块”结构，所以 Solpg 里必须把这些文件也都建出来。

在 Solpg 的 `programs/<你的项目名>/src/` 下，按本地目录结构创建并粘贴内容（同名覆盖即可）：
- 根文件：
  - `lib.rs` ← 本地 [lib.rs](file:///d:/三大赛/李宽TWS/TaiwanSheng/tot/src/lib.rs)
  - `constants.rs` ← 本地 [constants.rs](file:///d:/三大赛/李宽TWS/TaiwanSheng/tot/src/constants.rs)
  - `errors.rs` ← 本地 [errors.rs](file:///d:/三大赛/李宽TWS/TaiwanSheng/tot/src/errors.rs)
- 目录（整目录复制内容）：
  - `instructions/` ← 本地 [src/instructions](file:///d:/三大赛/李宽TWS/TaiwanSheng/tot/src/instructions/)
  - `state/` ← 本地 [src/state](file:///d:/三大赛/李宽TWS/TaiwanSheng/tot/src/state/)
  - `utils/` ← 本地 [src/utils](file:///d:/三大赛/李宽TWS/TaiwanSheng/tot/src/utils/)

**重要说明**
- 你这个工程 **Transfer Hook 已合并到主程序**（见本地 [Cargo.toml](file:///d:/三大赛/李宽TWS/TaiwanSheng/tot/src/Cargo.toml) 注释），所以 **Solpg 只需要部署这一个 Anchor 程序**，不需要再建第二个 hook 项目。

**3）配置 Solpg 的 Cargo.toml 依赖（关键）**
Solpg 默认生成的 `programs/<项目名>/Cargo.toml` 不一定包含 Token-2022 与 Transfer Hook 相关依赖，你必须把依赖补齐到与你本地一致（参考本地 [Cargo.toml](file:///d:/三大赛/李宽TWS/TaiwanSheng/tot/src/Cargo.toml)）：

在 Solpg 的 `programs/<项目名>/Cargo.toml` 里确保包含（版本按你本地）：
- `anchor-lang = { version = "0.29.0", features = ["init-if-needed"] }`
- `anchor-spl = { version = "0.29.0", features = ["token-2022"] }`
- `spl-token-2022 = "0.6"`
- `spl-transfer-hook-interface = "0.6"`
- `spl-tlv-account-resolution = "0.6"`

**4）部署（必须做 Program ID 回填）**
因为你本地 [lib.rs](file:///d:/三大赛/李宽TWS/TaiwanSheng/tot/src/lib.rs) 里 `declare_id!("ToT1111...")` 是占位符，Solpg 每次 Deploy 会给一个真实 Program ID，你必须回填：
- 第一次点击 Build → Deploy
- Solpg 会显示 Program ID
- 把这个 Program ID 复制回 `programs/<项目名>/src/lib.rs` 的 `declare_id!("...")`
- 再次 Build → Deploy（确保链上 programId 与代码一致）

**5）在 Solpg 跑“全指令演习”测试**
- 打开 Solpg 的 `tests/anchor.test.ts`（或 `client.ts`，看 Solpg 模板）
- 直接粘贴并运行你已经在仓库里维护好的演习脚本： [solana测试.md](file:///d:/三大赛/李宽TWS/TaiwanSheng/solana测试.md) 里 “B. tot-token 项目测试脚本” 那段
  - 这段脚本已经做了：可重复执行、自动复用 config/mint、池子初始化幂等、并加了更高 ComputeBudget（避免 `Program failed to complete`）

**常见坑（按你这个项目最容易踩的）**
- `Program failed to complete`：基本就是计算预算不够；演习脚本里已经加了 `ComputeBudgetProgram.setComputeUnitLimit(...)`。
- `AccountNotInitialized / InvalidMint / authority 不匹配`：通常是你切了钱包，链上 config 的 authority 不是当前 pg.wallet；要么用原钱包，要么换新的 Program ID 重新部署。
- `declare_id` 没回填：会导致各种“看起来很怪”的错误，必须按第 4 步做两次部署。

如果你希望我把演习脚本再“内嵌”成一段更短、更适合直接贴 Solpg 的版本（只保留 initialize/initPool/mintToPools 三步），我也可以直接给你一份精简版代码块。