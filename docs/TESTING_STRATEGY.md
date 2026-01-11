# 测试策略文档

## 版本信息
- 文档版本: v1.0
- 最后更新: 2026-01-11
- 维护者: TWS Development Team

## 测试框架

### 后端测试 (tws/server)
- **框架**: Jest
- **HTTP测试**: Supertest
- **Mock工具**: Jest内置Mock + nock (HTTP)
- **覆盖率工具**: Jest内置覆盖率报告

### 智能合约测试 (tot)
- **框架**: Mocha + Chai (现有)
- **Anchor测试工具**: @coral-xyz/anchor
- **Solana测试**: @solana/web3.js

## 测试类型

### 1. 单元测试 (Unit Tests)

**位置**: `tws/server/tests/unit/`

**覆盖范围**:
- 路由处理函数
- 工具函数
- 中间件
- 业务逻辑函数

**要求**:
- 每个函数至少一个测试用例
- 覆盖所有代码路径（100%分支覆盖率）
- 测试正常流程和错误流程
- 使用Mock隔离外部依赖

### 2. 集成测试 (Integration Tests)

**位置**: `tws/server/tests/integration/`

**覆盖范围**:
- API端到端流程
- 数据库操作
- 区块链交互
- 跨模块协作

**要求**:
- 测试完整的业务流程
- 使用测试数据库或Mock数据库
- 验证数据一致性

### 3. E2E测试 (End-to-End Tests)

**位置**: `tws/server/tests/e2e/`

**覆盖范围**:
- 完整的用户场景
- 跨系统交互
- 性能测试

**要求**:
- 模拟真实用户行为
- 测试关键业务流程
- 验证系统整体功能

## 测试数据管理

### Fixtures
- **位置**: `tws/server/tests/fixtures/`
- **文件**:
  - `testUsers.js`: 测试用户数据
  - `testAssets.js`: 测试资产数据
  - `testTransactions.js`: 测试交易数据

### Mock策略
- **数据库**: 使用内存数据库或Mock函数
- **区块链**: 使用Solana本地验证器或Mock连接
- **外部API**: 使用nock进行HTTP Mock
- **文件系统**: 使用临时目录

## 测试覆盖率要求

### 目标覆盖率
- **语句覆盖率**: 100%
- **分支覆盖率**: 100%
- **函数覆盖率**: 100%
- **行覆盖率**: 100%

### 覆盖率排除
以下代码可以排除在覆盖率要求之外：
- 错误处理中的fallback代码（如果无法触发）
- 已废弃的功能
- 开发工具脚本
- 配置文件

## 测试执行

### 本地执行
```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监视模式运行测试
npm run test:watch

# 验证测试映射
npm run test:verify-mapping
```

### CI/CD集成
- 在每次提交时自动运行测试
- 在合并前检查覆盖率
- 生成测试报告

## 测试维护

### 更新测试
- 功能变更时同步更新测试
- 删除过时的测试用例
- 优化慢速测试用例

### 测试审查
- 定期审查测试覆盖率
- 检查测试质量
- 确保测试独立可重复

## 最佳实践

1. **测试命名**: 使用描述性的测试名称
2. **测试组织**: 按功能模块组织测试文件
3. **Mock使用**: 合理使用Mock，避免过度Mock
4. **测试数据**: 使用Fixtures管理测试数据
5. **错误测试**: 确保测试所有错误情况
6. **边界测试**: 测试边界条件和极端情况

## 测试文件结构

```
tws/server/tests/
├── unit/
│   ├── routes/          # 路由测试
│   ├── utils/           # 工具函数测试
│   └── middleware/      # 中间件测试
├── integration/
│   ├── api/             # API集成测试
│   └── blockchain/      # 区块链集成测试
├── e2e/
│   └── flows/            # E2E测试
├── fixtures/             # 测试数据
└── helpers/              # 测试辅助函数
```

## 更新日志

- 2026-01-11: 创建初始测试策略文档
