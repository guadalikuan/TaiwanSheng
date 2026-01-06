# 项目结构分析与整理指南 (Project Structure Analysis & Guide)

当前项目结构较为混乱，主要表现为根目录与 `tws/` 子目录存在大量重复或功能重叠的代码（前端、后端、合约等）。以下是详细分析及整理建议。

## 1. 现状分析 (Current Status)

目前项目中似乎存在两个主要的开发分支：
1. **根目录 (Root)**: 包含 `src/` (React Frontend) 和 `server/` (Express + MongoDB)。
2. **`tws/` 目录**: 包含 `src/` (React Frontend + Solana + Auction) 和 `server/` (Express + RocksDB)。

### 关键差异
| 特性 | 根目录 (`/`) | `tws/` 目录 (`/tws/`) |
| :--- | :--- | :--- |
| **后端数据库** | MongoDB (Mongoose) | RocksDB / LevelDB |
| **后端功能** | 较基础 (Auth, Arsenal, Homepage) | **完整** (含 Auction, Prediction, Bot, Solana) |
| **前端功能** | 基础功能 | **完整** (含 Auction, Telegram App, PredictionMarket) |
| **区块链** | 存在 `contracts/` | 存在 `blockchain/` 和 `solana_contracts/` (更完整) |
| **活跃度** | 似乎是尝试迁移到 MongoDB 的版本 | **当前活跃开发版本** (您正在编辑此处的文件) |

**结论**: `tws/` 目录下的代码似乎是功能最全、业务逻辑最复杂的版本（"真·主项目"）。根目录下的代码可能是重构尝试（试图引入 MongoDB）或是旧版本的残留。

## 2. 推荐的项目结构 (Proposed Monorepo Structure)

建议采用 **Monorepo (单体仓库)** 结构来管理所有组件，清晰分离前端、后端、合约和文档。

### 建议目录树
```text
TaiwanSheng/
├── apps/                    # 应用程序
│   ├── web/                 # 主前端项目 (建议基于 tws/src 迁移)
│   ├── api/                 # 主后端服务 (建议基于 tws/server 迁移)
│   └── extension/           # 浏览器插件 (原 tws-browserExtension)
├── packages/                # 共享包/合约
│   ├── contracts-solana/    # Solana 合约 (原 tws/solana_contracts)
│   ├── contracts-evm/       # EVM 合约 (如果需要)
│   └── shared-utils/        # 前后端共享工具 (可选)
├── docs/                    # 文档 (合并 tws/docs 和 根目录 docs)
├── materials/               # 素材 (原 tws-mm)
├── scripts/                 # 全局脚本
└── package.json             # 工作区配置 (Workspaces)
```

## 3. 整理步骤 (Action Plan)

如果您确认 `tws/` 目录是核心代码，建议按以下步骤进行整理：

### 第一步：备份
在进行任何大改动前，请务必备份整个项目文件夹！

### 第二步：创建新的目录结构
1. 在根目录创建 `apps` 和 `packages` 文件夹。
2. 将 `tws-browserExtension` 移动到 `apps/extension`。

### 第三步：迁移核心代码
1. **后端**: 将 `tws/server` 移动到 `apps/api`。
   - *注意*: 根目录的 `server/` 使用 MongoDB，如果您想保留 MongoDB 的改动，需要手动将 `server/` 中的 Mongoose 逻辑合并到 `apps/api` 中，或者如果 `tws/server` 的 RocksDB 是您想要的，则直接使用它。
2. **前端**: 将 `tws/src` 及其相关配置文件 (`vite.config.js`, `index.html`, `postcss.config.js`, `tailwind.config.js`, `package.json` 等) 移动到 `apps/web`。
   - *注意*: 根目录也有 `src`，如果里面有 `tws/src` 缺失的功能（如 `UserManagement.jsx`），请手动合并。

### 第四步：迁移合约与文档
1. 将 `tws/blockchain` 或 `tws/solana_contracts` 移动到 `packages/contracts-solana`。
2. 将 `tws/docs` 和根目录 `docs` 合并到根目录 `docs/`。

### 第五步：清理
确认所有代码都已移动且能正常运行后，可以删除空的 `tws/` 目录和根目录下的冗余文件。

## 4. 常见问题
- **依赖问题**: 移动文件夹后，`node_modules` 需要重新安装。建议在根目录使用 `pnpm` 或 `npm workspaces` 管理依赖。
- **路径引用**: 代码中如果使用了相对路径（如 `../../utils`），移动后可能需要修复。

---
**我可以为您执行这些操作，或者先帮您创建一个新的 `apps` 目录并开始迁移最明显的部分（如文档和插件）。您希望怎么做？**
