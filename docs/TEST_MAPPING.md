# 测试与功能点映射文档

## 版本信息
- 文档版本: v1.0
- 最后更新: 2026-01-11
- 维护者: TWS Development Team

## 说明

本文档记录每个测试用例与功能点编号的对应关系，确保所有功能点都有对应的测试覆盖。

## 测试文件命名规范

- 单元测试: `[模块名].test.js` (例如: `auth.test.js`)
- 集成测试: `[模块名].integration.test.js`
- E2E测试: `[流程名].e2e.test.js`

## 测试覆盖映射

### 后端API模块测试映射

#### AUTH模块 (F-AUTH-001 到 F-AUTH-009)

| 功能编号 | 功能名称 | 测试文件 | 测试用例 |
|---------|---------|---------|---------|
| F-AUTH-001-v1.0 | 用户注册 | `tests/unit/routes/auth.test.js` | `describe('F-AUTH-001-v1.0: 用户注册')` |
| F-AUTH-002-v1.0 | 用户登录 | `tests/unit/routes/auth.test.js` | `describe('F-AUTH-002-v1.0: 用户登录')` |
| F-AUTH-003-v1.0 | 使用助记符登录 | `tests/unit/routes/auth.test.js` | `describe('F-AUTH-003-v1.0: 使用助记符登录')` |
| F-AUTH-004-v1.0 | 验证助记符 | `tests/unit/routes/auth.test.js` | `describe('F-AUTH-004-v1.0: 验证助记符')` |
| F-AUTH-005-v1.0 | 钱包登录 | `tests/unit/routes/auth.test.js` | `describe('F-AUTH-005-v1.0: 钱包登录')` |
| F-AUTH-006-v1.0 | 钱包注册 | `tests/unit/routes/auth.test.js` | `describe('F-AUTH-006-v1.0: 钱包注册')` |
| F-AUTH-007-v1.0 | 获取当前用户信息 | `tests/unit/routes/auth.test.js` | `describe('F-AUTH-007-v1.0: 获取当前用户信息')` |
| F-AUTH-008-v1.0 | 更新用户资料 | `tests/unit/routes/auth.test.js` | `describe('F-AUTH-008-v1.0: 更新用户资料')` |
| F-AUTH-009-v1.0 | 修改密码 | `tests/unit/routes/auth.test.js` | `describe('F-AUTH-009-v1.0: 修改密码')` |

#### USER模块 (F-USER-001 到 F-USER-006)

| 功能编号 | 功能名称 | 测试文件 | 状态 |
|---------|---------|---------|------|
| F-USER-001-v1.0 | 获取所有用户 | `tests/unit/routes/users.test.js` | 待实现 |
| F-USER-002-v1.0 | 获取所有房地产开发商账户 | `tests/unit/routes/users.test.js` | 待实现 |
| F-USER-003-v1.0 | 创建房地产开发商账户 | `tests/unit/routes/users.test.js` | 待实现 |
| F-USER-004-v1.0 | 更新房地产开发商账户 | `tests/unit/routes/users.test.js` | 待实现 |
| F-USER-005-v1.0 | 删除房地产开发商账户 | `tests/unit/routes/users.test.js` | 待实现 |
| F-USER-006-v1.0 | 获取单个用户信息 | `tests/unit/routes/users.test.js` | 待实现 |

#### ARS模块 (F-ARS-001 到 F-ARS-017)

| 功能编号 | 功能名称 | 测试文件 | 状态 |
|---------|---------|---------|------|
| F-ARS-001-v1.0 | 提交资产数据 | `tests/unit/routes/arsenal.test.js` | 待实现 |
| F-ARS-002-v1.0 | 实时预览脱敏结果 | `tests/unit/routes/arsenal.test.js` | 待实现 |
| ... | ... | ... | ... |

#### 其他模块

[继续列出所有模块的测试映射...]

### 智能合约模块测试映射

#### TOT-ADMIN模块 (F-TOT-ADMIN-001 到 F-TOT-ADMIN-005)

| 功能编号 | 功能名称 | 测试文件 | 状态 |
|---------|---------|---------|------|
| F-TOT-ADMIN-001-v1.0 | update_authority_handler | `tot/tests/admin.test.ts` | 待审查 |
| F-TOT-ADMIN-002-v1.0 | set_paused_handler | `tot/tests/admin.test.ts` | 待审查 |
| F-TOT-ADMIN-003-v1.0 | emergency_withdraw_handler | `tot/tests/admin.test.ts` | 待审查 |
| F-TOT-ADMIN-004-v1.0 | set_tws_treasury_handler | `tot/tests/admin.test.ts` | 待审查 |
| F-TOT-ADMIN-005-v1.0 | set_jackpot_ratio_handler | `tot/tests/admin.test.ts` | 待审查 |

[继续列出所有智能合约模块的测试映射...]

## 测试覆盖率目标

- **语句覆盖率**: 100%
- **分支覆盖率**: 100%
- **函数覆盖率**: 100%
- **行覆盖率**: 100%

## 未覆盖功能点列表

当前所有功能点均标记为"待实现"或"待审查"，需要逐步补充测试用例。

## 测试执行命令

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监视模式运行测试
npm run test:watch
```

## 更新日志

- 2026-01-11: 创建初始测试映射文档
