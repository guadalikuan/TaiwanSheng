# 项目功能清单

## 版本信息
- 文档版本: v1.0
- 最后更新: 2026-01-11T05:48:54.633Z
- 维护者: TWS Development Team

## 功能统计
- 总功能数: 203
- 后端API: 175
- 智能合约: 28
- 前端功能: 0
- 已实现: 203
- 待实现: 0
- 已废弃: 0

## 功能分类

### 后端API模块

#### ADMIN模块

- **F-ADMIN-001-v1.0**: GET /assets - GET /api/admin/assets - 获取所有资产（分页、筛选）
  - 文件: `server/routes/admin.js`
  - 版本: v1.0
  - 状态: active

- **F-ADMIN-002-v1.0**: POST /assets - POST /api/admin/assets - 批量创建资产
  - 文件: `server/routes/admin.js`
  - 版本: v1.0
  - 状态: active

- **F-ADMIN-003-v1.0**: PUT /assets/:id - PUT /api/admin/assets/:id - 更新资产
  - 文件: `server/routes/admin.js`
  - 版本: v1.0
  - 状态: active

- **F-ADMIN-004-v1.0**: GET /tech-projects - GET /api/admin/tech-projects - 获取所有项目
  - 文件: `server/routes/admin.js`
  - 版本: v1.0
  - 状态: active

- **F-ADMIN-005-v1.0**: PUT /tech-projects/:id - PUT /api/admin/tech-projects/:id - 更新项目状态
  - 文件: `server/routes/admin.js`
  - 版本: v1.0
  - 状态: active

- **F-ADMIN-006-v1.0**: GET /investments - GET /api/admin/investments - 获取投资记录
  - 文件: `server/routes/admin.js`
  - 版本: v1.0
  - 状态: active

- **F-ADMIN-007-v1.0**: GET /user-actions - GET /api/admin/user-actions - 获取用户行为日志
  - 文件: `server/routes/admin.js`
  - 版本: v1.0
  - 状态: active

#### ANC模块

- **F-ANC-001-v1.0**: POST /consume-token - POST /api/ancestor/consume-token - 消耗100 TaiOneToken并返回交易
  - 文件: `server/routes/ancestor.js`
  - 版本: v1.0
  - 状态: active

- **F-ANC-002-v1.0**: POST /upload - POST /api/ancestor/upload - 上传证明文件
  - 文件: `server/routes/ancestor.js`
  - 版本: v1.0
  - 状态: active

- **F-ANC-003-v1.0**: POST /mark-origin - POST /api/ancestor/mark-origin - 标记祖籍
  - 文件: `server/routes/ancestor.js`
  - 版本: v1.0
  - 状态: active

- **F-ANC-004-v1.0**: POST /mark-property - POST /api/ancestor/mark-property - 标记祖产
  - 文件: `server/routes/ancestor.js`
  - 版本: v1.0
  - 状态: active

- **F-ANC-005-v1.0**: GET /list - GET /api/ancestor/list - 获取用户的标记列表（支持所有类型）
  - 文件: `server/routes/ancestor.js`
  - 版本: v1.0
  - 状态: active

- **F-ANC-006-v1.0**: POST /mark/:type - POST /api/ancestor/mark/:type - 统一标记接口（支持所有类型）
  - 文件: `server/routes/ancestor.js`
  - 版本: v1.0
  - 状态: active

- **F-ANC-007-v1.0**: GET /:id - GET /api/ancestor/:id - 获取单个标记详情
  - 文件: `server/routes/ancestor.js`
  - 版本: v1.0
  - 状态: active

- **F-ANC-008-v1.0**: POST /verify-token - POST /api/ancestor/verify-token - 验证祖籍标记交易
  - 文件: `server/routes/ancestor.js`
  - 版本: v1.0
  - 状态: active

#### APOOL模块

- **F-APOOL-001-v1.0**: GET /stats - GET /api/asset-pool/stats - 获取资产池统计信息
  - 文件: `server/routes/assetPool.js`
  - 版本: v1.0
  - 状态: active

- **F-APOOL-002-v1.0**: GET /assets - GET /api/asset-pool/assets - 获取资产池资产列表
  - 文件: `server/routes/assetPool.js`
  - 版本: v1.0
  - 状态: active

- **F-APOOL-003-v1.0**: GET /by-region - GET /api/asset-pool/by-region - 按地区获取资产
  - 文件: `server/routes/assetPool.js`
  - 版本: v1.0
  - 状态: active

- **F-APOOL-004-v1.0**: GET /health - GET /api/asset-pool/health - 获取资产池健康度
  - 文件: `server/routes/assetPool.js`
  - 版本: v1.0
  - 状态: active

#### ARS模块

- **F-ARS-001-v1.0**: POST /submit - POST /api/arsenal/submit - 提交资产数据（需要认证和SUBMITTER或ADMIN角色）
  - 文件: `server/routes/arsenal.js`
  - 版本: v1.0
  - 状态: active

- **F-ARS-002-v1.0**: GET /preview - GET /api/arsenal/preview - 实时预览脱敏结果
  - 文件: `server/routes/arsenal.js`
  - 版本: v1.0
  - 状态: active

- **F-ARS-003-v1.0**: GET /pending - GET /api/arsenal/pending - 获取所有待审核资产（需要审核员或管理员权限）
  - 文件: `server/routes/arsenal.js`
  - 版本: v1.0
  - 状态: active

- **F-ARS-004-v1.0**: GET /assets - GET /api/arsenal/assets - 获取所有已审核通过的资产（用于前端展示）
  - 文件: `server/routes/arsenal.js`
  - 版本: v1.0
  - 状态: active

- **F-ARS-005-v1.0**: GET /assets/:id - GET /api/arsenal/assets/:id - 根据ID获取单个资产（公开端点，用于资产详情页）
  - 文件: `server/routes/arsenal.js`
  - 版本: v1.0
  - 状态: active

- **F-ARS-006-v1.0**: PUT /approve/:id - PUT /api/arsenal/approve/:id - 批准资产（需要审核员或管理员权限）
  - 文件: `server/routes/arsenal.js`
  - 版本: v1.0
  - 状态: active

- **F-ARS-007-v1.0**: PUT /reject/:id - PUT /api/arsenal/reject/:id - 拒绝资产（需要审核员或管理员权限）
  - 文件: `server/routes/arsenal.js`
  - 版本: v1.0
  - 状态: active

- **F-ARS-008-v1.0**: GET /stats - GET /api/arsenal/stats - 获取统计信息（需要审核员或管理员权限）
  - 文件: `server/routes/arsenal.js`
  - 版本: v1.0
  - 状态: active

- **F-ARS-009-v1.0**: POST /upload - POST /api/arsenal/upload - 文件上传（需要认证和SUBMITTER或ADMIN角色）
  - 文件: `server/routes/arsenal.js`
  - 版本: v1.0
  - 状态: active

- **F-ARS-010-v1.0**: POST /generate-contract/:id - POST /api/arsenal/generate-contract/:id - 生成合同PDF（需要审核员或管理员权限）
  - 文件: `server/routes/arsenal.js`
  - 版本: v1.0
  - 状态: active

- **F-ARS-011-v1.0**: GET /contract/:id - GET /api/arsenal/contract/:id - 获取合同PDF（预览，需要审核员或管理员权限）
  - 文件: `server/routes/arsenal.js`
  - 版本: v1.0
  - 状态: active

- **F-ARS-012-v1.0**: POST /batch-approve - POST /api/arsenal/batch-approve - 批量批准资产（需要审核员或管理员权限）
  - 文件: `server/routes/arsenal.js`
  - 版本: v1.0
  - 状态: active

- **F-ARS-013-v1.0**: PUT /edit/:id - PUT /api/arsenal/edit/:id - 编辑资产（审核前可修改，需要提交者或管理员权限）
  - 文件: `server/routes/arsenal.js`
  - 版本: v1.0
  - 状态: active

- **F-ARS-014-v1.0**: GET /review-history/:id - GET /api/arsenal/review-history/:id - 获取审核历史（需要审核员或管理员权限）
  - 文件: `server/routes/arsenal.js`
  - 版本: v1.0
  - 状态: active

- **F-ARS-015-v1.0**: GET /blockchain-status/:id - GET /api/arsenal/blockchain-status/:id - 获取资产上链状态
  - 文件: `server/routes/arsenal.js`
  - 版本: v1.0
  - 状态: active

- **F-ARS-016-v1.0**: PUT /redeem/:id - PUT /api/arsenal/redeem/:id - 赎回资产（仅开发商，且资产未被购买）
  - 文件: `server/routes/arsenal.js`
  - 版本: v1.0
  - 状态: active

- **F-ARS-017-v1.0**: GET /redeem-history - GET /api/arsenal/redeem-history - 获取赎回历史
  - 文件: `server/routes/arsenal.js`
  - 版本: v1.0
  - 状态: active

#### AUC模块

- **F-AUC-001-v1.0**: GET /:assetId - 获取拍卖信息
  GET /api/auction/:assetId
  - 文件: `server/routes/auction.js`
  - 版本: v1.0
  - 状态: active

- **F-AUC-002-v1.0**: POST /:assetId/seize - 夺取资产（10%溢价机制）
  POST /api/auction/:assetId/seize
  Body: { bidMessage, userAddress }
  使用tot合约的seize_auction指令
  - 文件: `server/routes/auction.js`
  - 版本: v1.0
  - 状态: active

- **F-AUC-003-v1.0**: GET /balance/:userAddress - 获取用户 TaiOneToken 余额
  GET /api/auction/balance/:userAddress
  - 文件: `server/routes/auction.js`
  - 版本: v1.0
  - 状态: active

- **F-AUC-004-v1.0**: POST /create - 创建新拍卖
  POST /api/auction/create
  Body: { assetName, description, startPrice, imageUrl, location, originalOwner, tauntMessage, creatorAddress, txSignature? }
  - 文件: `server/routes/auction.js`
  - 版本: v1.0
  - 状态: active

- **F-AUC-005-v1.0**: GET /list - 获取拍卖列表
  GET /api/auction/list?status=active|pending|completed
  - 文件: `server/routes/auction.js`
  - 版本: v1.0
  - 状态: active

- **F-AUC-006-v1.0**: POST /verify-create - POST /api/auction/verify-create - 验证拍卖创建交易
  - 文件: `server/routes/auction.js`
  - 版本: v1.0
  - 状态: active

- **F-AUC-007-v1.0**: POST /verify-seize - POST /api/auction/verify-seize - 验证拍卖夺取交易
  - 文件: `server/routes/auction.js`
  - 版本: v1.0
  - 状态: active

#### AUTH模块

- **F-AUTH-001-v1.0**: POST /register - POST /api/auth/register - 用户注册
  - 文件: `server/routes/auth.js`
  - 版本: v1.0
  - 状态: active

- **F-AUTH-002-v1.0**: POST /login - POST /api/auth/login - 用户登录（用户名/密码）
  - 文件: `server/routes/auth.js`
  - 版本: v1.0
  - 状态: active

- **F-AUTH-003-v1.0**: POST /login-mnemonic - POST /api/auth/login-mnemonic - 使用助记符登录
  - 文件: `server/routes/auth.js`
  - 版本: v1.0
  - 状态: active

- **F-AUTH-004-v1.0**: POST /verify-mnemonic - POST /api/auth/verify-mnemonic - 验证助记符
  - 文件: `server/routes/auth.js`
  - 版本: v1.0
  - 状态: active

- **F-AUTH-005-v1.0**: POST /login-wallet - POST /api/auth/login-wallet - 钱包登录
  - 文件: `server/routes/auth.js`
  - 版本: v1.0
  - 状态: active

- **F-AUTH-006-v1.0**: POST /register-wallet - POST /api/auth/register-wallet - 钱包注册
  - 文件: `server/routes/auth.js`
  - 版本: v1.0
  - 状态: active

- **F-AUTH-007-v1.0**: GET /me - GET /api/auth/me - 获取当前用户信息（需要认证）
  - 文件: `server/routes/auth.js`
  - 版本: v1.0
  - 状态: active

- **F-AUTH-008-v1.0**: PUT /profile - PUT /api/auth/profile - 更新用户资料（需要认证）
  - 文件: `server/routes/auth.js`
  - 版本: v1.0
  - 状态: active

- **F-AUTH-009-v1.0**: POST /change-password - POST /api/auth/change-password - 修改密码（需要认证）
  - 文件: `server/routes/auth.js`
  - 版本: v1.0
  - 状态: active

#### BUNKER模块

- **F-BUNKER-001-v1.0**: GET /risk - GET /api/bunker/risk - 获取实时风险预警
  - 文件: `server/routes/bunker.js`
  - 版本: v1.0
  - 状态: active

- **F-BUNKER-002-v1.0**: GET /stats - GET /api/bunker/stats - 获取社区统计
  - 文件: `server/routes/bunker.js`
  - 版本: v1.0
  - 状态: active

- **F-BUNKER-003-v1.0**: GET /refuge-capacity - GET /api/bunker/refuge-capacity - 获取用户避险能力详情
  - 文件: `server/routes/bunker.js`
  - 版本: v1.0
  - 状态: active

- **F-BUNKER-004-v1.0**: GET /scenario/:assetId - GET /api/bunker/scenario/:assetId - 获取资产的真实避难场景
  - 文件: `server/routes/bunker.js`
  - 版本: v1.0
  - 状态: active

#### HOME模块

- **F-HOME-001-v1.0**: GET /omega - GET /api/homepage/omega - 获取Omega屏数据
  - 文件: `server/routes/homepage.js`
  - 版本: v1.0
  - 状态: active

- **F-HOME-002-v1.0**: POST /omega/event - POST /api/homepage/omega/event - 添加Omega事件（用于模拟）
  - 文件: `server/routes/homepage.js`
  - 版本: v1.0
  - 状态: active

- **F-HOME-003-v1.0**: GET /market - GET /api/homepage/market - 获取Market屏数据
  - 文件: `server/routes/homepage.js`
  - 版本: v1.0
  - 状态: active

- **F-HOME-004-v1.0**: POST /market/trade - POST /api/homepage/market/trade - 添加交易记录（用于模拟）
  - 文件: `server/routes/homepage.js`
  - 版本: v1.0
  - 状态: active

- **F-HOME-005-v1.0**: GET /map - GET /api/homepage/map - 获取Map屏数据
  - 文件: `server/routes/homepage.js`
  - 版本: v1.0
  - 状态: active

- **F-HOME-006-v1.0**: POST /map/node - POST /api/homepage/map/node - 添加台湾节点连接（用于模拟）
  - 文件: `server/routes/homepage.js`
  - 版本: v1.0
  - 状态: active

- **F-HOME-007-v1.0**: POST /map/asset - POST /api/homepage/map/asset - 添加资产确认
  - 文件: `server/routes/homepage.js`
  - 版本: v1.0
  - 状态: active

- **F-HOME-008-v1.0**: GET /assets - GET /api/homepage/assets - 获取Assets屏数据（复用arsenal API）
  - 文件: `server/routes/homepage.js`
  - 版本: v1.0
  - 状态: active

- **F-HOME-009-v1.0**: GET /assets/all - GET /api/homepage/assets/all - 获取所有资产（支持搜索、筛选、排序、分页）
  - 文件: `server/routes/homepage.js`
  - 版本: v1.0
  - 状态: active

- **F-HOME-010-v1.0**: GET /all - GET /api/homepage/all - 一次性获取所有屏数据（可选优化）
  - 文件: `server/routes/homepage.js`
  - 版本: v1.0
  - 状态: active

- **F-HOME-011-v1.0**: GET /stats - GET /api/homepage/stats - 获取首页统计信息（在线用户数等）
  - 文件: `server/routes/homepage.js`
  - 版本: v1.0
  - 状态: active

- **F-HOME-012-v1.0**: GET /node/:id - GET /api/homepage/node/:id - 获取节点详情（基于日志数据）
  - 文件: `server/routes/homepage.js`
  - 版本: v1.0
  - 状态: active

- **F-HOME-013-v1.0**: GET /visit-logs - GET /api/homepage/visit-logs - 获取访问记录
  - 文件: `server/routes/homepage.js`
  - 版本: v1.0
  - 状态: active

- **F-HOME-014-v1.0**: GET /visit-stats - GET /api/homepage/visit-stats - 获取访问统计
  - 文件: `server/routes/homepage.js`
  - 版本: v1.0
  - 状态: active

- **F-HOME-015-v1.0**: POST /map/missile-launch - POST /api/homepage/map/missile-launch - 记录导弹发射
  - 文件: `server/routes/homepage.js`
  - 版本: v1.0
  - 状态: active

- **F-HOME-016-v1.0**: GET /map/missile-launch-history - GET /api/homepage/map/missile-launch-history - 获取导弹发射历史
  - 文件: `server/routes/homepage.js`
  - 版本: v1.0
  - 状态: active

#### INV模块

- **F-INV-001-v1.0**: GET /my - GET /api/investments/my - 获取我的投资记录
  - 文件: `server/routes/investments.js`
  - 版本: v1.0
  - 状态: active

#### LB模块

- **F-LB-001-v1.0**: GET /balance - 获取持币数排行榜
  GET /api/leaderboard/balance
  Query: limit (可选，默认100), period (可选，默认all)
  - 文件: `server/routes/leaderboard.js`
  - 版本: v1.0
  - 状态: active

- **F-LB-002-v1.0**: GET /transactions - 获取交易数排行榜
  GET /api/leaderboard/transactions
  Query: limit (可选，默认100), period (可选，默认all)
  - 文件: `server/routes/leaderboard.js`
  - 版本: v1.0
  - 状态: active

- **F-LB-003-v1.0**: GET /jackpot-wins - 获取获奖数排行榜
  GET /api/leaderboard/jackpot-wins
  Query: limit (可选，默认100), period (可选，默认all)
  - 文件: `server/routes/leaderboard.js`
  - 版本: v1.0
  - 状态: active

- **F-LB-004-v1.0**: GET /asset-value - 获取资产持有量排行榜
  GET /api/leaderboard/asset-value
  Query: limit (可选，默认100), period (可选，默认all)
  - 文件: `server/routes/leaderboard.js`
  - 版本: v1.0
  - 状态: active

- **F-LB-005-v1.0**: GET /tax-paid - 获取累计缴税排行榜
  GET /api/leaderboard/tax-paid
  Query: limit (可选，默认100), period (可选，默认all)
  - 文件: `server/routes/leaderboard.js`
  - 版本: v1.0
  - 状态: active

- **F-LB-006-v1.0**: GET /consumption - 获取累计消费排行榜
  GET /api/leaderboard/consumption
  Query: limit (可选，默认100), period (可选，默认all)
  - 文件: `server/routes/leaderboard.js`
  - 版本: v1.0
  - 状态: active

- **F-LB-007-v1.0**: GET /referral-earnings - 获取推荐收益排行榜
  GET /api/leaderboard/referral-earnings
  Query: limit (可选，默认100), period (可选，默认all)
  - 文件: `server/routes/leaderboard.js`
  - 版本: v1.0
  - 状态: active

- **F-LB-008-v1.0**: GET /holding-time - 获取持币时间排行榜
  GET /api/leaderboard/holding-time
  Query: limit (可选，默认100), period (可选，默认all，日/周/月排行不适用)
  - 文件: `server/routes/leaderboard.js`
  - 版本: v1.0
  - 状态: active

- **F-LB-009-v1.0**: GET /user/:address - 获取指定用户的排名信息
  GET /api/leaderboard/user/:address
  Query: type (可选，默认balance), period (可选，默认all)
  - 文件: `server/routes/leaderboard.js`
  - 版本: v1.0
  - 状态: active

- **F-LB-010-v1.0**: GET /jackpot-history - 获取奖池历史数据（用于K线图）
  GET /api/leaderboard/jackpot-history
  Query: limit (可选，默认100)
  - 文件: `server/routes/leaderboard.js`
  - 版本: v1.0
  - 状态: active

#### MAP模块

- **F-MAP-001-v1.0**: POST /consume - POST /api/tot/consume - 消耗TOT用于地图功能操作
  返回交易供用户签名
  - 文件: `server/routes/mapActions.js`
  - 版本: v1.0
  - 状态: active

- **F-MAP-002-v1.0**: POST /record - POST /api/map-actions/record - 记录地图功能操作
  - 文件: `server/routes/mapActions.js`
  - 版本: v1.0
  - 状态: active

- **F-MAP-003-v1.0**: GET /history - GET /api/map-actions/history - 获取用户的操作历史
  - 文件: `server/routes/mapActions.js`
  - 版本: v1.0
  - 状态: active

- **F-MAP-004-v1.0**: POST /verify - POST /api/map-actions/verify - 验证地图操作交易
  - 文件: `server/routes/mapActions.js`
  - 版本: v1.0
  - 状态: active

#### MKT模块

- **F-MKT-001-v1.0**: GET /price - 获取实时价格
  GET /api/market/price
  - 文件: `server/routes/market.js`
  - 版本: v1.0
  - 状态: active

- **F-MKT-002-v1.0**: GET /kline - 获取 K 线数据
  GET /api/market/kline?interval=1H&from=xxx&to=xxx
  - 文件: `server/routes/market.js`
  - 版本: v1.0
  - 状态: active

- **F-MKT-003-v1.0**: GET /stats - 获取市场统计信息
  GET /api/market/stats
  - 文件: `server/routes/market.js`
  - 版本: v1.0
  - 状态: active

- **F-MKT-004-v1.0**: GET /sync - 手动触发数据同步
  GET /api/market/sync
  注意：应该添加管理员认证
  - 文件: `server/routes/market.js`
  - 版本: v1.0
  - 状态: active

#### MYASSET模块

- **F-MYASSET-001-v1.0**: GET /all - 获取用户的所有资产数据（聚合）
  GET /api/my-assets/all
  - 文件: `server/routes/myAssets.js`
  - 版本: v1.0
  - 状态: active

- **F-MYASSET-002-v1.0**: GET /purchased - 获取用户购买的资产
  GET /api/my-assets/purchased
  - 文件: `server/routes/myAssets.js`
  - 版本: v1.0
  - 状态: active

- **F-MYASSET-003-v1.0**: GET /auctions - 获取用户参与的拍卖
  GET /api/my-assets/auctions
  - 文件: `server/routes/myAssets.js`
  - 版本: v1.0
  - 状态: active

- **F-MYASSET-004-v1.0**: GET /bets - 获取用户的预测下注记录
  GET /api/my-assets/bets
  - 文件: `server/routes/myAssets.js`
  - 版本: v1.0
  - 状态: active

- **F-MYASSET-005-v1.0**: GET /investments - 获取用户的投资记录（复用investments路由的逻辑）
  GET /api/my-assets/investments
  - 文件: `server/routes/myAssets.js`
  - 版本: v1.0
  - 状态: active

#### OPEN模块

- **F-OPEN-001-v1.0**: GET /countdown - @api {get} /api/open/countdown 获取当前倒计时
  @apiName GetCountdown
  @apiGroup OpenAPI
  @apiDescription 获取全人类命运共同体倒计时（The Final Countdown）
  @apiVersion 1.0.0
  
  @apiSuccess {String} targetTime 目标时间 (ISO 8601)
  @apiSuccess {Number} targetTimeMs 目标时间戳 (毫秒)
  @apiSuccess {String} serverTime 服务器当前时间 (ISO 8601)
  @apiSuccess {Number} serverTimeMs 服务器当前时间戳 (毫秒)
  @apiSuccess {Number} remainingMs 剩余时间 (毫秒)
  @apiSuccess {Number} remainingSeconds 剩余时间 (秒)
  @apiSuccess {Boolean} isExpired 是否已结束
  - 文件: `server/routes/open.js`
  - 版本: v1.0
  - 状态: active

#### ORACLE模块

- **F-ORACLE-001-v1.0**: GET /status - GET /api/oracle/status - 获取Oracle状态（需要管理员权限）
  - 文件: `server/routes/oracle.js`
  - 版本: v1.0
  - 状态: active

- **F-ORACLE-002-v1.0**: POST /scan - POST /api/oracle/scan - 手动触发扫描（需要管理员权限）
  - 文件: `server/routes/oracle.js`
  - 版本: v1.0
  - 状态: active

- **F-ORACLE-003-v1.0**: POST /trigger - POST /api/oracle/trigger - 手动触发统一事件（需要管理员权限）
  - 文件: `server/routes/oracle.js`
  - 版本: v1.0
  - 状态: active

- **F-ORACLE-004-v1.0**: POST /check-keywords - POST /api/oracle/check-keywords - 检查文本中的关键词（公开接口）
  - 文件: `server/routes/oracle.js`
  - 版本: v1.0
  - 状态: active

#### PAY模块

- **F-PAY-001-v1.0**: POST /create-order - POST /api/payment/create-order - 创建支付订单（需要认证）
  - 文件: `server/routes/payment.js`
  - 版本: v1.0
  - 状态: active

- **F-PAY-002-v1.0**: POST /verify - POST /api/payment/verify - 验证支付（需要认证）
  - 文件: `server/routes/payment.js`
  - 版本: v1.0
  - 状态: active

- **F-PAY-003-v1.0**: GET /balance/:address - GET /api/payment/balance/:address - 查询USDT余额
  - 文件: `server/routes/payment.js`
  - 版本: v1.0
  - 状态: active

- **F-PAY-004-v1.0**: GET /order/:orderId - GET /api/payment/order/:orderId - 查询订单状态（需要认证）
  - 文件: `server/routes/payment.js`
  - 版本: v1.0
  - 状态: active

#### PRED模块

- **F-PRED-001-v1.0**: GET /markets - GET /api/prediction/markets - Get all markets
  - 文件: `server/routes/prediction.js`
  - 版本: v1.0
  - 状态: active

- **F-PRED-002-v1.0**: POST /markets - POST /api/prediction/markets - Update markets (Admin only)
  - 文件: `server/routes/prediction.js`
  - 版本: v1.0
  - 状态: active

- **F-PRED-003-v1.0**: POST /bet - POST /api/prediction/bet - Record a new bet
  - 文件: `server/routes/prediction.js`
  - 版本: v1.0
  - 状态: active

- **F-PRED-004-v1.0**: POST /verify-bet - POST /api/prediction/verify-bet - 验证预测下注交易
  - 文件: `server/routes/prediction.js`
  - 版本: v1.0
  - 状态: active

- **F-PRED-005-v1.0**: POST /distribute - POST /api/prediction/distribute - Distribute prizes for a market
  - 文件: `server/routes/prediction.js`
  - 版本: v1.0
  - 状态: active

#### REF模块

- **F-REF-001-v1.0**: GET /info - GET /api/referral/info - 获取我的推荐信息（需要认证）
  - 文件: `server/routes/referral.js`
  - 版本: v1.0
  - 状态: active

- **F-REF-002-v1.0**: POST /register - POST /api/referral/register - 注册推荐关系（需要认证）
  - 文件: `server/routes/referral.js`
  - 版本: v1.0
  - 状态: active

- **F-REF-003-v1.0**: GET /leaderboard - GET /api/referral/leaderboard - 获取推荐排行榜
  - 文件: `server/routes/referral.js`
  - 版本: v1.0
  - 状态: active

- **F-REF-004-v1.0**: POST /commission - POST /api/referral/commission - 记录推荐佣金（内部调用）
  - 文件: `server/routes/referral.js`
  - 版本: v1.0
  - 状态: active

- **F-REF-005-v1.0**: POST /process-pending - POST /api/referral/process-pending - 批量处理待处理佣金（管理员或定时任务）
  - 文件: `server/routes/referral.js`
  - 版本: v1.0
  - 状态: active

- **F-REF-006-v1.0**: GET /pending-stats - GET /api/referral/pending-stats - 获取待处理佣金统计
  - 文件: `server/routes/referral.js`
  - 版本: v1.0
  - 状态: active

#### RWA模块

- **F-RWA-001-v1.0**: POST /buy-request - POST /api/rwa-trade/buy-request - 创建购买需求
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-002-v1.0**: GET /buy-requests - GET /api/rwa-trade/buy-requests - 获取我的购买需求列表
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-003-v1.0**: GET /buy-request/:id - GET /api/rwa-trade/buy-request/:id - 获取购买需求详情
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-004-v1.0**: PUT /buy-request/:id - PUT /api/rwa-trade/buy-request/:id - 更新购买需求
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-005-v1.0**: DELETE /buy-request/:id - DELETE /api/rwa-trade/buy-request/:id - 取消购买需求
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-006-v1.0**: POST /recommend - POST /api/rwa-trade/recommend - 获取推荐房源
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-007-v1.0**: GET /recommendations/:requestId - GET /api/rwa-trade/recommendations/:requestId - 获取特定需求的推荐
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-008-v1.0**: POST /lock/:assetId - POST /api/rwa-trade/lock/:assetId - 锁定资产
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-009-v1.0**: POST /confirm/:assetId - POST /api/rwa-trade/confirm/:assetId - 确认购买（支付全款）
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-010-v1.0**: POST /release/:assetId - POST /api/rwa-trade/release/:assetId - 释放锁定
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-011-v1.0**: GET /locks - GET /api/rwa-trade/locks - 获取我的锁定列表
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-012-v1.0**: POST /sell-order - POST /api/rwa-trade/sell-order - 创建卖单
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-013-v1.0**: POST /buy-order - POST /api/rwa-trade/buy-order - 创建买单
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-014-v1.0**: GET /order-book - GET /api/rwa-trade/order-book - 获取订单簿
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-015-v1.0**: GET /orders - GET /api/rwa-trade/orders - 获取我的订单
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-016-v1.0**: DELETE /order/:id - DELETE /api/rwa-trade/order/:id - 取消订单
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-017-v1.0**: POST /match - POST /api/rwa-trade/match - 手动触发撮合
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-018-v1.0**: GET /trades - GET /api/rwa-trade/trades - 获取交易历史
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-019-v1.0**: GET /stats - GET /api/rwa-trade/stats - 获取交易统计
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-020-v1.0**: POST /buy-shares - POST /api/rwa-trade/buy-shares - 直接购买指定资产的份额
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-021-v1.0**: POST /etf/buy - POST /api/rwa-trade/etf/buy - 购买ETF
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-022-v1.0**: POST /etf/create - POST /api/rwa-trade/etf/create - 创建ETF（管理员）
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-023-v1.0**: GET /etf/list - GET /api/rwa-trade/etf/list - 获取ETF列表
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-024-v1.0**: GET /etf/:id - GET /api/rwa-trade/etf/:id - 获取ETF详情
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-025-v1.0**: POST /etf/auto-generate - POST /api/rwa-trade/etf/auto-generate - 自动生成ETF（根据城市）
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-026-v1.0**: GET /holdings - GET /api/rwa-trade/holdings - 获取我的持有份额
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-027-v1.0**: GET /holdings/:assetId - GET /api/rwa-trade/holdings/:assetId - 获取特定资产的持有份额
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-028-v1.0**: GET /asset/:assetId/holders - GET /api/rwa-trade/asset/:assetId/holders - 获取资产的所有持有者
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-029-v1.0**: POST /buy-strategic/:assetId - POST /api/rwa-trade/buy-strategic/:assetId - 购买战略资产（使用TOT支付，Solana链上交易）
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-030-v1.0**: POST /verify-purchase/:assetId - POST /api/rwa-trade/verify-purchase/:assetId - 验证购买交易并更新状态
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-031-v1.0**: POST /verify-shares - POST /api/rwa-trade/verify-shares - 验证份额购买交易并更新状态
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-032-v1.0**: POST /verify-etf - POST /api/rwa-trade/verify-etf - 验证ETF购买交易并更新状态
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

- **F-RWA-033-v1.0**: POST /verify-lock/:assetId - POST /api/rwa-trade/verify-lock/:assetId - 验证锁定交易并创建锁定记录
  - 文件: `server/routes/rwaTrade.js`
  - 版本: v1.0
  - 状态: active

#### SSE模块

- **F-SSE-001-v1.0**: GET /test - 测试路由，用于验证路由是否正常工作
  - 文件: `server/routes/sse.js`
  - 版本: v1.0
  - 状态: active

- **F-SSE-002-v1.0**: GET /homepage - SSE 连接端点
  GET /api/sse/homepage
  建立 Server-Sent Events 连接，推送首页实时数据
  - 文件: `server/routes/sse.js`
  - 版本: v1.0
  - 状态: active

#### TECH模块

- **F-TECH-001-v1.0**: POST /create - POST /api/tech-project/create - 创建科技项目（需认证）
  - 文件: `server/routes/techProject.js`
  - 版本: v1.0
  - 状态: active

- **F-TECH-002-v1.0**: GET /:id - GET /api/tech-project/:id - 获取项目详情
  - 文件: `server/routes/techProject.js`
  - 版本: v1.0
  - 状态: active

- **F-TECH-003-v1.0**: GET / - GET /api/tech-project - 获取项目列表（支持筛选）
  - 文件: `server/routes/techProject.js`
  - 版本: v1.0
  - 状态: active

- **F-TECH-004-v1.0**: POST /:id/build-transaction - POST /api/tech-project/:id/build-transaction - 构建投资交易（前端调用）
  - 文件: `server/routes/techProject.js`
  - 版本: v1.0
  - 状态: active

- **F-TECH-005-v1.0**: POST /:id/invest - POST /api/tech-project/:id/invest - 投资项目（链上验证）
  - 文件: `server/routes/techProject.js`
  - 版本: v1.0
  - 状态: active

- **F-TECH-006-v1.0**: POST /:id/tokenize - POST /api/tech-project/:id/tokenize - 知识产权证券化
  - 文件: `server/routes/techProject.js`
  - 版本: v1.0
  - 状态: active

- **F-TECH-007-v1.0**: GET /:id/investors - GET /api/tech-project/:id/investors - 获取投资者列表
  - 文件: `server/routes/techProject.js`
  - 版本: v1.0
  - 状态: active

- **F-TECH-008-v1.0**: PUT /:id - PUT /api/tech-project/:id - 更新项目信息（仅项目创建者）
  - 文件: `server/routes/techProject.js`
  - 版本: v1.0
  - 状态: active

#### TOKEN模块

- **F-TOKEN-001-v1.0**: POST /purchase - POST /api/token/purchase - 创建TWS代币购买订单
  - 文件: `server/routes/token.js`
  - 版本: v1.0
  - 状态: active

- **F-TOKEN-002-v1.0**: POST /verify-purchase - POST /api/token/verify-purchase - 验证TWS代币购买（支付完成后）
  - 文件: `server/routes/token.js`
  - 版本: v1.0
  - 状态: active

- **F-TOKEN-003-v1.0**: GET /balance/:address - GET /api/token/balance/:address - 获取用户TWS代币余额
  - 文件: `server/routes/token.js`
  - 版本: v1.0
  - 状态: active

- **F-TOKEN-004-v1.0**: GET /price - GET /api/token/price - 获取当前TWS代币价格
  - 文件: `server/routes/token.js`
  - 版本: v1.0
  - 状态: active

#### TOTP模块

- **F-TOTP-001-v1.0**: POST /create-order - 创建购买订单
  POST /api/tot-purchase/create-order
  - 文件: `server/routes/totPurchase.js`
  - 版本: v1.0
  - 状态: active

- **F-TOTP-002-v1.0**: POST /callback - ECPay支付回调
  POST /api/tot-purchase/callback
  注意：ECPay使用form-urlencoded格式发送回调
  - 文件: `server/routes/totPurchase.js`
  - 版本: v1.0
  - 状态: active

- **F-TOTP-003-v1.0**: POST /callback/wechat - 微信支付回调
  POST /api/tot-purchase/callback/wechat
  注意：微信支付使用XML格式发送回调
  - 文件: `server/routes/totPurchase.js`
  - 版本: v1.0
  - 状态: active

- **F-TOTP-004-v1.0**: POST /callback/alipay - 支付宝支付回调
  POST /api/tot-purchase/callback/alipay
  注意：支付宝使用form-urlencoded格式发送回调
  - 文件: `server/routes/totPurchase.js`
  - 版本: v1.0
  - 状态: active

- **F-TOTP-005-v1.0**: GET /order/:orderId - 查询订单状态
  GET /api/tot-purchase/order/:orderId
  - 文件: `server/routes/totPurchase.js`
  - 版本: v1.0
  - 状态: active

- **F-TOTP-006-v1.0**: GET /exchange-rate - 获取当前汇率
  GET /api/tot-purchase/exchange-rate
  - 文件: `server/routes/totPurchase.js`
  - 版本: v1.0
  - 状态: active

#### USER模块

- **F-USER-001-v1.0**: GET / - GET /api/users - 获取所有用户（仅管理员）
  - 文件: `server/routes/users.js`
  - 版本: v1.0
  - 状态: active

- **F-USER-002-v1.0**: GET /developers - GET /api/users/developers - 获取所有房地产开发商账户
  - 文件: `server/routes/users.js`
  - 版本: v1.0
  - 状态: active

- **F-USER-003-v1.0**: POST /developers - POST /api/users/developers - 创建房地产开发商账户（仅管理员）
  - 文件: `server/routes/users.js`
  - 版本: v1.0
  - 状态: active

- **F-USER-004-v1.0**: PUT /developers/:address - PUT /api/users/developers/:address - 更新房地产开发商账户（仅管理员）
  - 文件: `server/routes/users.js`
  - 版本: v1.0
  - 状态: active

- **F-USER-005-v1.0**: DELETE /developers/:address - DELETE /api/users/developers/:address - 删除房地产开发商账户（仅管理员）
  - 文件: `server/routes/users.js`
  - 版本: v1.0
  - 状态: active

- **F-USER-006-v1.0**: GET /:address - GET /api/users/:address - 获取单个用户信息（仅管理员）
  - 文件: `server/routes/users.js`
  - 版本: v1.0
  - 状态: active

### 智能合约模块

#### ADMIN模块

- **F-TOT-ADMIN-001-v1.0**: update_authority_handler - update_authority_handler
  - 文件: `tot/src/instructions/admin.rs`
  - 版本: v1.0
  - 状态: active

- **F-TOT-ADMIN-002-v1.0**: set_paused_handler - set_paused_handler
  - 文件: `tot/src/instructions/admin.rs`
  - 版本: v1.0
  - 状态: active

- **F-TOT-ADMIN-003-v1.0**: emergency_withdraw_handler - emergency_withdraw_handler
  - 文件: `tot/src/instructions/admin.rs`
  - 版本: v1.0
  - 状态: active

- **F-TOT-ADMIN-004-v1.0**: set_tws_treasury_handler - set_tws_treasury_handler
  - 文件: `tot/src/instructions/admin.rs`
  - 版本: v1.0
  - 状态: active

- **F-TOT-ADMIN-005-v1.0**: set_jackpot_ratio_handler - set_jackpot_ratio_handler
  - 文件: `tot/src/instructions/admin.rs`
  - 版本: v1.0
  - 状态: active

#### ASSET_MINT模块

- **F-TOT-ASSET_MINT-001-v1.0**: mint_asset_handler - mint_asset_handler
  - 文件: `tot/src/instructions/asset_mint.rs`
  - 版本: v1.0
  - 状态: active

#### AUCTION_CREATE模块

- **F-TOT-AUCTION_CREATE-001-v1.0**: create_auction_handler - create_auction_handler
  - 文件: `tot/src/instructions/auction_create.rs`
  - 版本: v1.0
  - 状态: active

#### AUCTION_SEIZE模块

- **F-TOT-AUCTION_SEIZE-001-v1.0**: seize_auction_handler - seize_auction_handler
  - 文件: `tot/src/instructions/auction_seize.rs`
  - 版本: v1.0
  - 状态: active

#### CONSUME模块

- **F-TOT-CONSUME-001-v1.0**: consume_to_treasury_handler - consume_to_treasury_handler
  - 文件: `tot/src/instructions/consume.rs`
  - 版本: v1.0
  - 状态: active

#### HOLDER模块

- **F-TOT-HOLDER-001-v1.0**: initialize_holder_handler - initialize_holder_handler
  - 文件: `tot/src/instructions/holder.rs`
  - 版本: v1.0
  - 状态: active

- **F-TOT-HOLDER-002-v1.0**: freeze_holder_handler - freeze_holder_handler
  - 文件: `tot/src/instructions/holder.rs`
  - 版本: v1.0
  - 状态: active

- **F-TOT-HOLDER-003-v1.0**: unfreeze_holder_handler - unfreeze_holder_handler
  - 文件: `tot/src/instructions/holder.rs`
  - 版本: v1.0
  - 状态: active

#### HOOK模块

- **F-TOT-HOOK-001-v1.0**: initialize_transfer_hook - initialize_transfer_hook
  - 文件: `tot/src/instructions/hook.rs`
  - 版本: v1.0
  - 状态: active

- **F-TOT-HOOK-002-v1.0**: execute_internal - execute_internal
  - 文件: `tot/src/instructions/hook.rs`
  - 版本: v1.0
  - 状态: active

- **F-TOT-HOOK-003-v1.0**: set_transfer_hook_paused - set_transfer_hook_paused
  - 文件: `tot/src/instructions/hook.rs`
  - 版本: v1.0
  - 状态: active

#### INITIALIZE模块

- **F-TOT-INITIALIZE-001-v1.0**: handler - handler
  - 文件: `tot/src/instructions/initialize.rs`
  - 版本: v1.0
  - 状态: active

#### INIT_POOL模块

- **F-TOT-INIT_POOL-001-v1.0**: handler - handler
  - 文件: `tot/src/instructions/init_pool.rs`
  - 版本: v1.0
  - 状态: active

#### JACKPOT模块

- **F-TOT-JACKPOT-001-v1.0**: initialize_jackpot_handler - initialize_jackpot_handler
  - 文件: `tot/src/instructions/jackpot.rs`
  - 版本: v1.0
  - 状态: active

#### MINT_TO_POOLS模块

- **F-TOT-MINT_TO_POOLS-001-v1.0**: handler - handler
  - 文件: `tot/src/instructions/mint_to_pools.rs`
  - 版本: v1.0
  - 状态: active

#### MOD模块

- **F-TOT-MOD-001-v1.0**: initialize - initialize
  - 文件: `tot/src/instructions/mod.rs`
  - 版本: v1.0
  - 状态: active

#### PLATFORM_TRANSFER模块

- **F-TOT-PLATFORM_TRANSFER-001-v1.0**: platform_transfer_handler - platform_transfer_handler
  - 文件: `tot/src/instructions/platform_transfer.rs`
  - 版本: v1.0
  - 状态: active

#### QUERY模块

- **F-TOT-QUERY-001-v1.0**: calculate_tax_handler - calculate_tax_handler
  - 文件: `tot/src/instructions/query.rs`
  - 版本: v1.0
  - 状态: active

- **F-TOT-QUERY-002-v1.0**: get_holder_stats_handler - get_holder_stats_handler
  - 文件: `tot/src/instructions/query.rs`
  - 版本: v1.0
  - 状态: active

#### TAX模块

- **F-TOT-TAX-001-v1.0**: initialize_tax_config_handler - initialize_tax_config_handler
  - 文件: `tot/src/instructions/tax.rs`
  - 版本: v1.0
  - 状态: active

- **F-TOT-TAX-002-v1.0**: update_tax_config_handler - update_tax_config_handler
  - 文件: `tot/src/instructions/tax.rs`
  - 版本: v1.0
  - 状态: active

- **F-TOT-TAX-003-v1.0**: add_tax_exempt_handler - add_tax_exempt_handler
  - 文件: `tot/src/instructions/tax.rs`
  - 版本: v1.0
  - 状态: active

- **F-TOT-TAX-004-v1.0**: remove_tax_exempt_handler - remove_tax_exempt_handler
  - 文件: `tot/src/instructions/tax.rs`
  - 版本: v1.0
  - 状态: active

#### TRANSFER模块

- **F-TOT-TRANSFER-001-v1.0**: transfer_with_tax_handler - transfer_with_tax_handler
  - 文件: `tot/src/instructions/transfer.rs`
  - 版本: v1.0
  - 状态: active

## 详细功能描述

### F-ADMIN-001-v1.0

- **功能名称**: GET /api/admin/assets - 获取所有资产（分页、筛选）
- **所属模块**: ADMIN
- **版本号**: v1.0
- **文件路径**: `server/routes/admin.js`
- **HTTP方法**: GET
- **API路径**: /assets
- **状态**: active

### F-ADMIN-002-v1.0

- **功能名称**: POST /api/admin/assets - 批量创建资产
- **所属模块**: ADMIN
- **版本号**: v1.0
- **文件路径**: `server/routes/admin.js`
- **HTTP方法**: POST
- **API路径**: /assets
- **状态**: active

### F-ADMIN-003-v1.0

- **功能名称**: PUT /api/admin/assets/:id - 更新资产
- **所属模块**: ADMIN
- **版本号**: v1.0
- **文件路径**: `server/routes/admin.js`
- **HTTP方法**: PUT
- **API路径**: /assets/:id
- **状态**: active

### F-ADMIN-004-v1.0

- **功能名称**: GET /api/admin/tech-projects - 获取所有项目
- **所属模块**: ADMIN
- **版本号**: v1.0
- **文件路径**: `server/routes/admin.js`
- **HTTP方法**: GET
- **API路径**: /tech-projects
- **状态**: active

### F-ADMIN-005-v1.0

- **功能名称**: PUT /api/admin/tech-projects/:id - 更新项目状态
- **所属模块**: ADMIN
- **版本号**: v1.0
- **文件路径**: `server/routes/admin.js`
- **HTTP方法**: PUT
- **API路径**: /tech-projects/:id
- **状态**: active

### F-ADMIN-006-v1.0

- **功能名称**: GET /api/admin/investments - 获取投资记录
- **所属模块**: ADMIN
- **版本号**: v1.0
- **文件路径**: `server/routes/admin.js`
- **HTTP方法**: GET
- **API路径**: /investments
- **状态**: active

### F-ADMIN-007-v1.0

- **功能名称**: GET /api/admin/user-actions - 获取用户行为日志
- **所属模块**: ADMIN
- **版本号**: v1.0
- **文件路径**: `server/routes/admin.js`
- **HTTP方法**: GET
- **API路径**: /user-actions
- **状态**: active

### F-ANC-001-v1.0

- **功能名称**: POST /api/ancestor/consume-token - 消耗100 TaiOneToken并返回交易
- **所属模块**: ANC
- **版本号**: v1.0
- **文件路径**: `server/routes/ancestor.js`
- **HTTP方法**: POST
- **API路径**: /consume-token
- **状态**: active

### F-ANC-002-v1.0

- **功能名称**: POST /api/ancestor/upload - 上传证明文件
- **所属模块**: ANC
- **版本号**: v1.0
- **文件路径**: `server/routes/ancestor.js`
- **HTTP方法**: POST
- **API路径**: /upload
- **状态**: active

### F-ANC-003-v1.0

- **功能名称**: POST /api/ancestor/mark-origin - 标记祖籍
- **所属模块**: ANC
- **版本号**: v1.0
- **文件路径**: `server/routes/ancestor.js`
- **HTTP方法**: POST
- **API路径**: /mark-origin
- **状态**: active

### F-ANC-004-v1.0

- **功能名称**: POST /api/ancestor/mark-property - 标记祖产
- **所属模块**: ANC
- **版本号**: v1.0
- **文件路径**: `server/routes/ancestor.js`
- **HTTP方法**: POST
- **API路径**: /mark-property
- **状态**: active

### F-ANC-005-v1.0

- **功能名称**: GET /api/ancestor/list - 获取用户的标记列表（支持所有类型）
- **所属模块**: ANC
- **版本号**: v1.0
- **文件路径**: `server/routes/ancestor.js`
- **HTTP方法**: GET
- **API路径**: /list
- **状态**: active

### F-ANC-006-v1.0

- **功能名称**: POST /api/ancestor/mark/:type - 统一标记接口（支持所有类型）
- **所属模块**: ANC
- **版本号**: v1.0
- **文件路径**: `server/routes/ancestor.js`
- **HTTP方法**: POST
- **API路径**: /mark/:type
- **状态**: active

### F-ANC-007-v1.0

- **功能名称**: GET /api/ancestor/:id - 获取单个标记详情
- **所属模块**: ANC
- **版本号**: v1.0
- **文件路径**: `server/routes/ancestor.js`
- **HTTP方法**: GET
- **API路径**: /:id
- **状态**: active

### F-ANC-008-v1.0

- **功能名称**: POST /api/ancestor/verify-token - 验证祖籍标记交易
- **所属模块**: ANC
- **版本号**: v1.0
- **文件路径**: `server/routes/ancestor.js`
- **HTTP方法**: POST
- **API路径**: /verify-token
- **状态**: active

### F-ARS-001-v1.0

- **功能名称**: POST /api/arsenal/submit - 提交资产数据（需要认证和SUBMITTER或ADMIN角色）
- **所属模块**: ARS
- **版本号**: v1.0
- **文件路径**: `server/routes/arsenal.js`
- **HTTP方法**: POST
- **API路径**: /submit
- **状态**: active

### F-ARS-002-v1.0

- **功能名称**: GET /api/arsenal/preview - 实时预览脱敏结果
- **所属模块**: ARS
- **版本号**: v1.0
- **文件路径**: `server/routes/arsenal.js`
- **HTTP方法**: GET
- **API路径**: /preview
- **状态**: active

### F-ARS-003-v1.0

- **功能名称**: GET /api/arsenal/pending - 获取所有待审核资产（需要审核员或管理员权限）
- **所属模块**: ARS
- **版本号**: v1.0
- **文件路径**: `server/routes/arsenal.js`
- **HTTP方法**: GET
- **API路径**: /pending
- **状态**: active

### F-ARS-004-v1.0

- **功能名称**: GET /api/arsenal/assets - 获取所有已审核通过的资产（用于前端展示）
- **所属模块**: ARS
- **版本号**: v1.0
- **文件路径**: `server/routes/arsenal.js`
- **HTTP方法**: GET
- **API路径**: /assets
- **状态**: active

### F-ARS-005-v1.0

- **功能名称**: GET /api/arsenal/assets/:id - 根据ID获取单个资产（公开端点，用于资产详情页）
- **所属模块**: ARS
- **版本号**: v1.0
- **文件路径**: `server/routes/arsenal.js`
- **HTTP方法**: GET
- **API路径**: /assets/:id
- **状态**: active

### F-ARS-006-v1.0

- **功能名称**: PUT /api/arsenal/approve/:id - 批准资产（需要审核员或管理员权限）
- **所属模块**: ARS
- **版本号**: v1.0
- **文件路径**: `server/routes/arsenal.js`
- **HTTP方法**: PUT
- **API路径**: /approve/:id
- **状态**: active

### F-ARS-007-v1.0

- **功能名称**: PUT /api/arsenal/reject/:id - 拒绝资产（需要审核员或管理员权限）
- **所属模块**: ARS
- **版本号**: v1.0
- **文件路径**: `server/routes/arsenal.js`
- **HTTP方法**: PUT
- **API路径**: /reject/:id
- **状态**: active

### F-ARS-008-v1.0

- **功能名称**: GET /api/arsenal/stats - 获取统计信息（需要审核员或管理员权限）
- **所属模块**: ARS
- **版本号**: v1.0
- **文件路径**: `server/routes/arsenal.js`
- **HTTP方法**: GET
- **API路径**: /stats
- **状态**: active

### F-ARS-009-v1.0

- **功能名称**: POST /api/arsenal/upload - 文件上传（需要认证和SUBMITTER或ADMIN角色）
- **所属模块**: ARS
- **版本号**: v1.0
- **文件路径**: `server/routes/arsenal.js`
- **HTTP方法**: POST
- **API路径**: /upload
- **状态**: active

### F-ARS-010-v1.0

- **功能名称**: POST /api/arsenal/generate-contract/:id - 生成合同PDF（需要审核员或管理员权限）
- **所属模块**: ARS
- **版本号**: v1.0
- **文件路径**: `server/routes/arsenal.js`
- **HTTP方法**: POST
- **API路径**: /generate-contract/:id
- **状态**: active

### F-ARS-011-v1.0

- **功能名称**: GET /api/arsenal/contract/:id - 获取合同PDF（预览，需要审核员或管理员权限）
- **所属模块**: ARS
- **版本号**: v1.0
- **文件路径**: `server/routes/arsenal.js`
- **HTTP方法**: GET
- **API路径**: /contract/:id
- **状态**: active

### F-ARS-012-v1.0

- **功能名称**: POST /api/arsenal/batch-approve - 批量批准资产（需要审核员或管理员权限）
- **所属模块**: ARS
- **版本号**: v1.0
- **文件路径**: `server/routes/arsenal.js`
- **HTTP方法**: POST
- **API路径**: /batch-approve
- **状态**: active

### F-ARS-013-v1.0

- **功能名称**: PUT /api/arsenal/edit/:id - 编辑资产（审核前可修改，需要提交者或管理员权限）
- **所属模块**: ARS
- **版本号**: v1.0
- **文件路径**: `server/routes/arsenal.js`
- **HTTP方法**: PUT
- **API路径**: /edit/:id
- **状态**: active

### F-ARS-014-v1.0

- **功能名称**: GET /api/arsenal/review-history/:id - 获取审核历史（需要审核员或管理员权限）
- **所属模块**: ARS
- **版本号**: v1.0
- **文件路径**: `server/routes/arsenal.js`
- **HTTP方法**: GET
- **API路径**: /review-history/:id
- **状态**: active

### F-ARS-015-v1.0

- **功能名称**: GET /api/arsenal/blockchain-status/:id - 获取资产上链状态
- **所属模块**: ARS
- **版本号**: v1.0
- **文件路径**: `server/routes/arsenal.js`
- **HTTP方法**: GET
- **API路径**: /blockchain-status/:id
- **状态**: active

### F-ARS-016-v1.0

- **功能名称**: PUT /api/arsenal/redeem/:id - 赎回资产（仅开发商，且资产未被购买）
- **所属模块**: ARS
- **版本号**: v1.0
- **文件路径**: `server/routes/arsenal.js`
- **HTTP方法**: PUT
- **API路径**: /redeem/:id
- **状态**: active

### F-ARS-017-v1.0

- **功能名称**: GET /api/arsenal/redeem-history - 获取赎回历史
- **所属模块**: ARS
- **版本号**: v1.0
- **文件路径**: `server/routes/arsenal.js`
- **HTTP方法**: GET
- **API路径**: /redeem-history
- **状态**: active

### F-APOOL-001-v1.0

- **功能名称**: GET /api/asset-pool/stats - 获取资产池统计信息
- **所属模块**: APOOL
- **版本号**: v1.0
- **文件路径**: `server/routes/assetPool.js`
- **HTTP方法**: GET
- **API路径**: /stats
- **状态**: active

### F-APOOL-002-v1.0

- **功能名称**: GET /api/asset-pool/assets - 获取资产池资产列表
- **所属模块**: APOOL
- **版本号**: v1.0
- **文件路径**: `server/routes/assetPool.js`
- **HTTP方法**: GET
- **API路径**: /assets
- **状态**: active

### F-APOOL-003-v1.0

- **功能名称**: GET /api/asset-pool/by-region - 按地区获取资产
- **所属模块**: APOOL
- **版本号**: v1.0
- **文件路径**: `server/routes/assetPool.js`
- **HTTP方法**: GET
- **API路径**: /by-region
- **状态**: active

### F-APOOL-004-v1.0

- **功能名称**: GET /api/asset-pool/health - 获取资产池健康度
- **所属模块**: APOOL
- **版本号**: v1.0
- **文件路径**: `server/routes/assetPool.js`
- **HTTP方法**: GET
- **API路径**: /health
- **状态**: active

### F-AUC-001-v1.0

- **功能名称**: 获取拍卖信息
  GET /api/auction/:assetId
- **所属模块**: AUC
- **版本号**: v1.0
- **文件路径**: `server/routes/auction.js`
- **HTTP方法**: GET
- **API路径**: /:assetId
- **状态**: active

### F-AUC-002-v1.0

- **功能名称**: 夺取资产（10%溢价机制）
  POST /api/auction/:assetId/seize
  Body: { bidMessage, userAddress }
  使用tot合约的seize_auction指令
- **所属模块**: AUC
- **版本号**: v1.0
- **文件路径**: `server/routes/auction.js`
- **HTTP方法**: POST
- **API路径**: /:assetId/seize
- **状态**: active

### F-AUC-003-v1.0

- **功能名称**: 获取用户 TaiOneToken 余额
  GET /api/auction/balance/:userAddress
- **所属模块**: AUC
- **版本号**: v1.0
- **文件路径**: `server/routes/auction.js`
- **HTTP方法**: GET
- **API路径**: /balance/:userAddress
- **状态**: active

### F-AUC-004-v1.0

- **功能名称**: 创建新拍卖
  POST /api/auction/create
  Body: { assetName, description, startPrice, imageUrl, location, originalOwner, tauntMessage, creatorAddress, txSignature? }
- **所属模块**: AUC
- **版本号**: v1.0
- **文件路径**: `server/routes/auction.js`
- **HTTP方法**: POST
- **API路径**: /create
- **状态**: active

### F-AUC-005-v1.0

- **功能名称**: 获取拍卖列表
  GET /api/auction/list?status=active|pending|completed
- **所属模块**: AUC
- **版本号**: v1.0
- **文件路径**: `server/routes/auction.js`
- **HTTP方法**: GET
- **API路径**: /list
- **状态**: active

### F-AUC-006-v1.0

- **功能名称**: POST /api/auction/verify-create - 验证拍卖创建交易
- **所属模块**: AUC
- **版本号**: v1.0
- **文件路径**: `server/routes/auction.js`
- **HTTP方法**: POST
- **API路径**: /verify-create
- **状态**: active

### F-AUC-007-v1.0

- **功能名称**: POST /api/auction/verify-seize - 验证拍卖夺取交易
- **所属模块**: AUC
- **版本号**: v1.0
- **文件路径**: `server/routes/auction.js`
- **HTTP方法**: POST
- **API路径**: /verify-seize
- **状态**: active

### F-AUTH-001-v1.0

- **功能名称**: POST /api/auth/register - 用户注册
- **所属模块**: AUTH
- **版本号**: v1.0
- **文件路径**: `server/routes/auth.js`
- **HTTP方法**: POST
- **API路径**: /register
- **状态**: active

### F-AUTH-002-v1.0

- **功能名称**: POST /api/auth/login - 用户登录（用户名/密码）
- **所属模块**: AUTH
- **版本号**: v1.0
- **文件路径**: `server/routes/auth.js`
- **HTTP方法**: POST
- **API路径**: /login
- **状态**: active

### F-AUTH-003-v1.0

- **功能名称**: POST /api/auth/login-mnemonic - 使用助记符登录
- **所属模块**: AUTH
- **版本号**: v1.0
- **文件路径**: `server/routes/auth.js`
- **HTTP方法**: POST
- **API路径**: /login-mnemonic
- **状态**: active

### F-AUTH-004-v1.0

- **功能名称**: POST /api/auth/verify-mnemonic - 验证助记符
- **所属模块**: AUTH
- **版本号**: v1.0
- **文件路径**: `server/routes/auth.js`
- **HTTP方法**: POST
- **API路径**: /verify-mnemonic
- **状态**: active

### F-AUTH-005-v1.0

- **功能名称**: POST /api/auth/login-wallet - 钱包登录
- **所属模块**: AUTH
- **版本号**: v1.0
- **文件路径**: `server/routes/auth.js`
- **HTTP方法**: POST
- **API路径**: /login-wallet
- **状态**: active

### F-AUTH-006-v1.0

- **功能名称**: POST /api/auth/register-wallet - 钱包注册
- **所属模块**: AUTH
- **版本号**: v1.0
- **文件路径**: `server/routes/auth.js`
- **HTTP方法**: POST
- **API路径**: /register-wallet
- **状态**: active

### F-AUTH-007-v1.0

- **功能名称**: GET /api/auth/me - 获取当前用户信息（需要认证）
- **所属模块**: AUTH
- **版本号**: v1.0
- **文件路径**: `server/routes/auth.js`
- **HTTP方法**: GET
- **API路径**: /me
- **状态**: active

### F-AUTH-008-v1.0

- **功能名称**: PUT /api/auth/profile - 更新用户资料（需要认证）
- **所属模块**: AUTH
- **版本号**: v1.0
- **文件路径**: `server/routes/auth.js`
- **HTTP方法**: PUT
- **API路径**: /profile
- **状态**: active

### F-AUTH-009-v1.0

- **功能名称**: POST /api/auth/change-password - 修改密码（需要认证）
- **所属模块**: AUTH
- **版本号**: v1.0
- **文件路径**: `server/routes/auth.js`
- **HTTP方法**: POST
- **API路径**: /change-password
- **状态**: active

### F-BUNKER-001-v1.0

- **功能名称**: GET /api/bunker/risk - 获取实时风险预警
- **所属模块**: BUNKER
- **版本号**: v1.0
- **文件路径**: `server/routes/bunker.js`
- **HTTP方法**: GET
- **API路径**: /risk
- **状态**: active

### F-BUNKER-002-v1.0

- **功能名称**: GET /api/bunker/stats - 获取社区统计
- **所属模块**: BUNKER
- **版本号**: v1.0
- **文件路径**: `server/routes/bunker.js`
- **HTTP方法**: GET
- **API路径**: /stats
- **状态**: active

### F-BUNKER-003-v1.0

- **功能名称**: GET /api/bunker/refuge-capacity - 获取用户避险能力详情
- **所属模块**: BUNKER
- **版本号**: v1.0
- **文件路径**: `server/routes/bunker.js`
- **HTTP方法**: GET
- **API路径**: /refuge-capacity
- **状态**: active

### F-BUNKER-004-v1.0

- **功能名称**: GET /api/bunker/scenario/:assetId - 获取资产的真实避难场景
- **所属模块**: BUNKER
- **版本号**: v1.0
- **文件路径**: `server/routes/bunker.js`
- **HTTP方法**: GET
- **API路径**: /scenario/:assetId
- **状态**: active

### F-HOME-001-v1.0

- **功能名称**: GET /api/homepage/omega - 获取Omega屏数据
- **所属模块**: HOME
- **版本号**: v1.0
- **文件路径**: `server/routes/homepage.js`
- **HTTP方法**: GET
- **API路径**: /omega
- **状态**: active

### F-HOME-002-v1.0

- **功能名称**: POST /api/homepage/omega/event - 添加Omega事件（用于模拟）
- **所属模块**: HOME
- **版本号**: v1.0
- **文件路径**: `server/routes/homepage.js`
- **HTTP方法**: POST
- **API路径**: /omega/event
- **状态**: active

### F-HOME-003-v1.0

- **功能名称**: GET /api/homepage/market - 获取Market屏数据
- **所属模块**: HOME
- **版本号**: v1.0
- **文件路径**: `server/routes/homepage.js`
- **HTTP方法**: GET
- **API路径**: /market
- **状态**: active

### F-HOME-004-v1.0

- **功能名称**: POST /api/homepage/market/trade - 添加交易记录（用于模拟）
- **所属模块**: HOME
- **版本号**: v1.0
- **文件路径**: `server/routes/homepage.js`
- **HTTP方法**: POST
- **API路径**: /market/trade
- **状态**: active

### F-HOME-005-v1.0

- **功能名称**: GET /api/homepage/map - 获取Map屏数据
- **所属模块**: HOME
- **版本号**: v1.0
- **文件路径**: `server/routes/homepage.js`
- **HTTP方法**: GET
- **API路径**: /map
- **状态**: active

### F-HOME-006-v1.0

- **功能名称**: POST /api/homepage/map/node - 添加台湾节点连接（用于模拟）
- **所属模块**: HOME
- **版本号**: v1.0
- **文件路径**: `server/routes/homepage.js`
- **HTTP方法**: POST
- **API路径**: /map/node
- **状态**: active

### F-HOME-007-v1.0

- **功能名称**: POST /api/homepage/map/asset - 添加资产确认
- **所属模块**: HOME
- **版本号**: v1.0
- **文件路径**: `server/routes/homepage.js`
- **HTTP方法**: POST
- **API路径**: /map/asset
- **状态**: active

### F-HOME-008-v1.0

- **功能名称**: GET /api/homepage/assets - 获取Assets屏数据（复用arsenal API）
- **所属模块**: HOME
- **版本号**: v1.0
- **文件路径**: `server/routes/homepage.js`
- **HTTP方法**: GET
- **API路径**: /assets
- **状态**: active

### F-HOME-009-v1.0

- **功能名称**: GET /api/homepage/assets/all - 获取所有资产（支持搜索、筛选、排序、分页）
- **所属模块**: HOME
- **版本号**: v1.0
- **文件路径**: `server/routes/homepage.js`
- **HTTP方法**: GET
- **API路径**: /assets/all
- **状态**: active

### F-HOME-010-v1.0

- **功能名称**: GET /api/homepage/all - 一次性获取所有屏数据（可选优化）
- **所属模块**: HOME
- **版本号**: v1.0
- **文件路径**: `server/routes/homepage.js`
- **HTTP方法**: GET
- **API路径**: /all
- **状态**: active

### F-HOME-011-v1.0

- **功能名称**: GET /api/homepage/stats - 获取首页统计信息（在线用户数等）
- **所属模块**: HOME
- **版本号**: v1.0
- **文件路径**: `server/routes/homepage.js`
- **HTTP方法**: GET
- **API路径**: /stats
- **状态**: active

### F-HOME-012-v1.0

- **功能名称**: GET /api/homepage/node/:id - 获取节点详情（基于日志数据）
- **所属模块**: HOME
- **版本号**: v1.0
- **文件路径**: `server/routes/homepage.js`
- **HTTP方法**: GET
- **API路径**: /node/:id
- **状态**: active

### F-HOME-013-v1.0

- **功能名称**: GET /api/homepage/visit-logs - 获取访问记录
- **所属模块**: HOME
- **版本号**: v1.0
- **文件路径**: `server/routes/homepage.js`
- **HTTP方法**: GET
- **API路径**: /visit-logs
- **状态**: active

### F-HOME-014-v1.0

- **功能名称**: GET /api/homepage/visit-stats - 获取访问统计
- **所属模块**: HOME
- **版本号**: v1.0
- **文件路径**: `server/routes/homepage.js`
- **HTTP方法**: GET
- **API路径**: /visit-stats
- **状态**: active

### F-HOME-015-v1.0

- **功能名称**: POST /api/homepage/map/missile-launch - 记录导弹发射
- **所属模块**: HOME
- **版本号**: v1.0
- **文件路径**: `server/routes/homepage.js`
- **HTTP方法**: POST
- **API路径**: /map/missile-launch
- **状态**: active

### F-HOME-016-v1.0

- **功能名称**: GET /api/homepage/map/missile-launch-history - 获取导弹发射历史
- **所属模块**: HOME
- **版本号**: v1.0
- **文件路径**: `server/routes/homepage.js`
- **HTTP方法**: GET
- **API路径**: /map/missile-launch-history
- **状态**: active

### F-INV-001-v1.0

- **功能名称**: GET /api/investments/my - 获取我的投资记录
- **所属模块**: INV
- **版本号**: v1.0
- **文件路径**: `server/routes/investments.js`
- **HTTP方法**: GET
- **API路径**: /my
- **状态**: active

### F-LB-001-v1.0

- **功能名称**: 获取持币数排行榜
  GET /api/leaderboard/balance
  Query: limit (可选，默认100), period (可选，默认all)
- **所属模块**: LB
- **版本号**: v1.0
- **文件路径**: `server/routes/leaderboard.js`
- **HTTP方法**: GET
- **API路径**: /balance
- **状态**: active

### F-LB-002-v1.0

- **功能名称**: 获取交易数排行榜
  GET /api/leaderboard/transactions
  Query: limit (可选，默认100), period (可选，默认all)
- **所属模块**: LB
- **版本号**: v1.0
- **文件路径**: `server/routes/leaderboard.js`
- **HTTP方法**: GET
- **API路径**: /transactions
- **状态**: active

### F-LB-003-v1.0

- **功能名称**: 获取获奖数排行榜
  GET /api/leaderboard/jackpot-wins
  Query: limit (可选，默认100), period (可选，默认all)
- **所属模块**: LB
- **版本号**: v1.0
- **文件路径**: `server/routes/leaderboard.js`
- **HTTP方法**: GET
- **API路径**: /jackpot-wins
- **状态**: active

### F-LB-004-v1.0

- **功能名称**: 获取资产持有量排行榜
  GET /api/leaderboard/asset-value
  Query: limit (可选，默认100), period (可选，默认all)
- **所属模块**: LB
- **版本号**: v1.0
- **文件路径**: `server/routes/leaderboard.js`
- **HTTP方法**: GET
- **API路径**: /asset-value
- **状态**: active

### F-LB-005-v1.0

- **功能名称**: 获取累计缴税排行榜
  GET /api/leaderboard/tax-paid
  Query: limit (可选，默认100), period (可选，默认all)
- **所属模块**: LB
- **版本号**: v1.0
- **文件路径**: `server/routes/leaderboard.js`
- **HTTP方法**: GET
- **API路径**: /tax-paid
- **状态**: active

### F-LB-006-v1.0

- **功能名称**: 获取累计消费排行榜
  GET /api/leaderboard/consumption
  Query: limit (可选，默认100), period (可选，默认all)
- **所属模块**: LB
- **版本号**: v1.0
- **文件路径**: `server/routes/leaderboard.js`
- **HTTP方法**: GET
- **API路径**: /consumption
- **状态**: active

### F-LB-007-v1.0

- **功能名称**: 获取推荐收益排行榜
  GET /api/leaderboard/referral-earnings
  Query: limit (可选，默认100), period (可选，默认all)
- **所属模块**: LB
- **版本号**: v1.0
- **文件路径**: `server/routes/leaderboard.js`
- **HTTP方法**: GET
- **API路径**: /referral-earnings
- **状态**: active

### F-LB-008-v1.0

- **功能名称**: 获取持币时间排行榜
  GET /api/leaderboard/holding-time
  Query: limit (可选，默认100), period (可选，默认all，日/周/月排行不适用)
- **所属模块**: LB
- **版本号**: v1.0
- **文件路径**: `server/routes/leaderboard.js`
- **HTTP方法**: GET
- **API路径**: /holding-time
- **状态**: active

### F-LB-009-v1.0

- **功能名称**: 获取指定用户的排名信息
  GET /api/leaderboard/user/:address
  Query: type (可选，默认balance), period (可选，默认all)
- **所属模块**: LB
- **版本号**: v1.0
- **文件路径**: `server/routes/leaderboard.js`
- **HTTP方法**: GET
- **API路径**: /user/:address
- **状态**: active

### F-LB-010-v1.0

- **功能名称**: 获取奖池历史数据（用于K线图）
  GET /api/leaderboard/jackpot-history
  Query: limit (可选，默认100)
- **所属模块**: LB
- **版本号**: v1.0
- **文件路径**: `server/routes/leaderboard.js`
- **HTTP方法**: GET
- **API路径**: /jackpot-history
- **状态**: active

### F-MAP-001-v1.0

- **功能名称**: POST /api/tot/consume - 消耗TOT用于地图功能操作
  返回交易供用户签名
- **所属模块**: MAP
- **版本号**: v1.0
- **文件路径**: `server/routes/mapActions.js`
- **HTTP方法**: POST
- **API路径**: /consume
- **状态**: active

### F-MAP-002-v1.0

- **功能名称**: POST /api/map-actions/record - 记录地图功能操作
- **所属模块**: MAP
- **版本号**: v1.0
- **文件路径**: `server/routes/mapActions.js`
- **HTTP方法**: POST
- **API路径**: /record
- **状态**: active

### F-MAP-003-v1.0

- **功能名称**: GET /api/map-actions/history - 获取用户的操作历史
- **所属模块**: MAP
- **版本号**: v1.0
- **文件路径**: `server/routes/mapActions.js`
- **HTTP方法**: GET
- **API路径**: /history
- **状态**: active

### F-MAP-004-v1.0

- **功能名称**: POST /api/map-actions/verify - 验证地图操作交易
- **所属模块**: MAP
- **版本号**: v1.0
- **文件路径**: `server/routes/mapActions.js`
- **HTTP方法**: POST
- **API路径**: /verify
- **状态**: active

### F-MKT-001-v1.0

- **功能名称**: 获取实时价格
  GET /api/market/price
- **所属模块**: MKT
- **版本号**: v1.0
- **文件路径**: `server/routes/market.js`
- **HTTP方法**: GET
- **API路径**: /price
- **状态**: active

### F-MKT-002-v1.0

- **功能名称**: 获取 K 线数据
  GET /api/market/kline?interval=1H&from=xxx&to=xxx
- **所属模块**: MKT
- **版本号**: v1.0
- **文件路径**: `server/routes/market.js`
- **HTTP方法**: GET
- **API路径**: /kline
- **状态**: active

### F-MKT-003-v1.0

- **功能名称**: 获取市场统计信息
  GET /api/market/stats
- **所属模块**: MKT
- **版本号**: v1.0
- **文件路径**: `server/routes/market.js`
- **HTTP方法**: GET
- **API路径**: /stats
- **状态**: active

### F-MKT-004-v1.0

- **功能名称**: 手动触发数据同步
  GET /api/market/sync
  注意：应该添加管理员认证
- **所属模块**: MKT
- **版本号**: v1.0
- **文件路径**: `server/routes/market.js`
- **HTTP方法**: GET
- **API路径**: /sync
- **状态**: active

### F-MYASSET-001-v1.0

- **功能名称**: 获取用户的所有资产数据（聚合）
  GET /api/my-assets/all
- **所属模块**: MYASSET
- **版本号**: v1.0
- **文件路径**: `server/routes/myAssets.js`
- **HTTP方法**: GET
- **API路径**: /all
- **状态**: active

### F-MYASSET-002-v1.0

- **功能名称**: 获取用户购买的资产
  GET /api/my-assets/purchased
- **所属模块**: MYASSET
- **版本号**: v1.0
- **文件路径**: `server/routes/myAssets.js`
- **HTTP方法**: GET
- **API路径**: /purchased
- **状态**: active

### F-MYASSET-003-v1.0

- **功能名称**: 获取用户参与的拍卖
  GET /api/my-assets/auctions
- **所属模块**: MYASSET
- **版本号**: v1.0
- **文件路径**: `server/routes/myAssets.js`
- **HTTP方法**: GET
- **API路径**: /auctions
- **状态**: active

### F-MYASSET-004-v1.0

- **功能名称**: 获取用户的预测下注记录
  GET /api/my-assets/bets
- **所属模块**: MYASSET
- **版本号**: v1.0
- **文件路径**: `server/routes/myAssets.js`
- **HTTP方法**: GET
- **API路径**: /bets
- **状态**: active

### F-MYASSET-005-v1.0

- **功能名称**: 获取用户的投资记录（复用investments路由的逻辑）
  GET /api/my-assets/investments
- **所属模块**: MYASSET
- **版本号**: v1.0
- **文件路径**: `server/routes/myAssets.js`
- **HTTP方法**: GET
- **API路径**: /investments
- **状态**: active

### F-OPEN-001-v1.0

- **功能名称**: @api {get} /api/open/countdown 获取当前倒计时
  @apiName GetCountdown
  @apiGroup OpenAPI
  @apiDescription 获取全人类命运共同体倒计时（The Final Countdown）
  @apiVersion 1.0.0
  
  @apiSuccess {String} targetTime 目标时间 (ISO 8601)
  @apiSuccess {Number} targetTimeMs 目标时间戳 (毫秒)
  @apiSuccess {String} serverTime 服务器当前时间 (ISO 8601)
  @apiSuccess {Number} serverTimeMs 服务器当前时间戳 (毫秒)
  @apiSuccess {Number} remainingMs 剩余时间 (毫秒)
  @apiSuccess {Number} remainingSeconds 剩余时间 (秒)
  @apiSuccess {Boolean} isExpired 是否已结束
- **所属模块**: OPEN
- **版本号**: v1.0
- **文件路径**: `server/routes/open.js`
- **HTTP方法**: GET
- **API路径**: /countdown
- **状态**: active

### F-ORACLE-001-v1.0

- **功能名称**: GET /api/oracle/status - 获取Oracle状态（需要管理员权限）
- **所属模块**: ORACLE
- **版本号**: v1.0
- **文件路径**: `server/routes/oracle.js`
- **HTTP方法**: GET
- **API路径**: /status
- **状态**: active

### F-ORACLE-002-v1.0

- **功能名称**: POST /api/oracle/scan - 手动触发扫描（需要管理员权限）
- **所属模块**: ORACLE
- **版本号**: v1.0
- **文件路径**: `server/routes/oracle.js`
- **HTTP方法**: POST
- **API路径**: /scan
- **状态**: active

### F-ORACLE-003-v1.0

- **功能名称**: POST /api/oracle/trigger - 手动触发统一事件（需要管理员权限）
- **所属模块**: ORACLE
- **版本号**: v1.0
- **文件路径**: `server/routes/oracle.js`
- **HTTP方法**: POST
- **API路径**: /trigger
- **状态**: active

### F-ORACLE-004-v1.0

- **功能名称**: POST /api/oracle/check-keywords - 检查文本中的关键词（公开接口）
- **所属模块**: ORACLE
- **版本号**: v1.0
- **文件路径**: `server/routes/oracle.js`
- **HTTP方法**: POST
- **API路径**: /check-keywords
- **状态**: active

### F-PAY-001-v1.0

- **功能名称**: POST /api/payment/create-order - 创建支付订单（需要认证）
- **所属模块**: PAY
- **版本号**: v1.0
- **文件路径**: `server/routes/payment.js`
- **HTTP方法**: POST
- **API路径**: /create-order
- **状态**: active

### F-PAY-002-v1.0

- **功能名称**: POST /api/payment/verify - 验证支付（需要认证）
- **所属模块**: PAY
- **版本号**: v1.0
- **文件路径**: `server/routes/payment.js`
- **HTTP方法**: POST
- **API路径**: /verify
- **状态**: active

### F-PAY-003-v1.0

- **功能名称**: GET /api/payment/balance/:address - 查询USDT余额
- **所属模块**: PAY
- **版本号**: v1.0
- **文件路径**: `server/routes/payment.js`
- **HTTP方法**: GET
- **API路径**: /balance/:address
- **状态**: active

### F-PAY-004-v1.0

- **功能名称**: GET /api/payment/order/:orderId - 查询订单状态（需要认证）
- **所属模块**: PAY
- **版本号**: v1.0
- **文件路径**: `server/routes/payment.js`
- **HTTP方法**: GET
- **API路径**: /order/:orderId
- **状态**: active

### F-PRED-001-v1.0

- **功能名称**: GET /api/prediction/markets - Get all markets
- **所属模块**: PRED
- **版本号**: v1.0
- **文件路径**: `server/routes/prediction.js`
- **HTTP方法**: GET
- **API路径**: /markets
- **状态**: active

### F-PRED-002-v1.0

- **功能名称**: POST /api/prediction/markets - Update markets (Admin only)
- **所属模块**: PRED
- **版本号**: v1.0
- **文件路径**: `server/routes/prediction.js`
- **HTTP方法**: POST
- **API路径**: /markets
- **状态**: active

### F-PRED-003-v1.0

- **功能名称**: POST /api/prediction/bet - Record a new bet
- **所属模块**: PRED
- **版本号**: v1.0
- **文件路径**: `server/routes/prediction.js`
- **HTTP方法**: POST
- **API路径**: /bet
- **状态**: active

### F-PRED-004-v1.0

- **功能名称**: POST /api/prediction/verify-bet - 验证预测下注交易
- **所属模块**: PRED
- **版本号**: v1.0
- **文件路径**: `server/routes/prediction.js`
- **HTTP方法**: POST
- **API路径**: /verify-bet
- **状态**: active

### F-PRED-005-v1.0

- **功能名称**: POST /api/prediction/distribute - Distribute prizes for a market
- **所属模块**: PRED
- **版本号**: v1.0
- **文件路径**: `server/routes/prediction.js`
- **HTTP方法**: POST
- **API路径**: /distribute
- **状态**: active

### F-REF-001-v1.0

- **功能名称**: GET /api/referral/info - 获取我的推荐信息（需要认证）
- **所属模块**: REF
- **版本号**: v1.0
- **文件路径**: `server/routes/referral.js`
- **HTTP方法**: GET
- **API路径**: /info
- **状态**: active

### F-REF-002-v1.0

- **功能名称**: POST /api/referral/register - 注册推荐关系（需要认证）
- **所属模块**: REF
- **版本号**: v1.0
- **文件路径**: `server/routes/referral.js`
- **HTTP方法**: POST
- **API路径**: /register
- **状态**: active

### F-REF-003-v1.0

- **功能名称**: GET /api/referral/leaderboard - 获取推荐排行榜
- **所属模块**: REF
- **版本号**: v1.0
- **文件路径**: `server/routes/referral.js`
- **HTTP方法**: GET
- **API路径**: /leaderboard
- **状态**: active

### F-REF-004-v1.0

- **功能名称**: POST /api/referral/commission - 记录推荐佣金（内部调用）
- **所属模块**: REF
- **版本号**: v1.0
- **文件路径**: `server/routes/referral.js`
- **HTTP方法**: POST
- **API路径**: /commission
- **状态**: active

### F-REF-005-v1.0

- **功能名称**: POST /api/referral/process-pending - 批量处理待处理佣金（管理员或定时任务）
- **所属模块**: REF
- **版本号**: v1.0
- **文件路径**: `server/routes/referral.js`
- **HTTP方法**: POST
- **API路径**: /process-pending
- **状态**: active

### F-REF-006-v1.0

- **功能名称**: GET /api/referral/pending-stats - 获取待处理佣金统计
- **所属模块**: REF
- **版本号**: v1.0
- **文件路径**: `server/routes/referral.js`
- **HTTP方法**: GET
- **API路径**: /pending-stats
- **状态**: active

### F-RWA-001-v1.0

- **功能名称**: POST /api/rwa-trade/buy-request - 创建购买需求
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: POST
- **API路径**: /buy-request
- **状态**: active

### F-RWA-002-v1.0

- **功能名称**: GET /api/rwa-trade/buy-requests - 获取我的购买需求列表
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: GET
- **API路径**: /buy-requests
- **状态**: active

### F-RWA-003-v1.0

- **功能名称**: GET /api/rwa-trade/buy-request/:id - 获取购买需求详情
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: GET
- **API路径**: /buy-request/:id
- **状态**: active

### F-RWA-004-v1.0

- **功能名称**: PUT /api/rwa-trade/buy-request/:id - 更新购买需求
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: PUT
- **API路径**: /buy-request/:id
- **状态**: active

### F-RWA-005-v1.0

- **功能名称**: DELETE /api/rwa-trade/buy-request/:id - 取消购买需求
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: DELETE
- **API路径**: /buy-request/:id
- **状态**: active

### F-RWA-006-v1.0

- **功能名称**: POST /api/rwa-trade/recommend - 获取推荐房源
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: POST
- **API路径**: /recommend
- **状态**: active

### F-RWA-007-v1.0

- **功能名称**: GET /api/rwa-trade/recommendations/:requestId - 获取特定需求的推荐
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: GET
- **API路径**: /recommendations/:requestId
- **状态**: active

### F-RWA-008-v1.0

- **功能名称**: POST /api/rwa-trade/lock/:assetId - 锁定资产
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: POST
- **API路径**: /lock/:assetId
- **状态**: active

### F-RWA-009-v1.0

- **功能名称**: POST /api/rwa-trade/confirm/:assetId - 确认购买（支付全款）
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: POST
- **API路径**: /confirm/:assetId
- **状态**: active

### F-RWA-010-v1.0

- **功能名称**: POST /api/rwa-trade/release/:assetId - 释放锁定
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: POST
- **API路径**: /release/:assetId
- **状态**: active

### F-RWA-011-v1.0

- **功能名称**: GET /api/rwa-trade/locks - 获取我的锁定列表
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: GET
- **API路径**: /locks
- **状态**: active

### F-RWA-012-v1.0

- **功能名称**: POST /api/rwa-trade/sell-order - 创建卖单
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: POST
- **API路径**: /sell-order
- **状态**: active

### F-RWA-013-v1.0

- **功能名称**: POST /api/rwa-trade/buy-order - 创建买单
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: POST
- **API路径**: /buy-order
- **状态**: active

### F-RWA-014-v1.0

- **功能名称**: GET /api/rwa-trade/order-book - 获取订单簿
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: GET
- **API路径**: /order-book
- **状态**: active

### F-RWA-015-v1.0

- **功能名称**: GET /api/rwa-trade/orders - 获取我的订单
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: GET
- **API路径**: /orders
- **状态**: active

### F-RWA-016-v1.0

- **功能名称**: DELETE /api/rwa-trade/order/:id - 取消订单
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: DELETE
- **API路径**: /order/:id
- **状态**: active

### F-RWA-017-v1.0

- **功能名称**: POST /api/rwa-trade/match - 手动触发撮合
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: POST
- **API路径**: /match
- **状态**: active

### F-RWA-018-v1.0

- **功能名称**: GET /api/rwa-trade/trades - 获取交易历史
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: GET
- **API路径**: /trades
- **状态**: active

### F-RWA-019-v1.0

- **功能名称**: GET /api/rwa-trade/stats - 获取交易统计
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: GET
- **API路径**: /stats
- **状态**: active

### F-RWA-020-v1.0

- **功能名称**: POST /api/rwa-trade/buy-shares - 直接购买指定资产的份额
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: POST
- **API路径**: /buy-shares
- **状态**: active

### F-RWA-021-v1.0

- **功能名称**: POST /api/rwa-trade/etf/buy - 购买ETF
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: POST
- **API路径**: /etf/buy
- **状态**: active

### F-RWA-022-v1.0

- **功能名称**: POST /api/rwa-trade/etf/create - 创建ETF（管理员）
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: POST
- **API路径**: /etf/create
- **状态**: active

### F-RWA-023-v1.0

- **功能名称**: GET /api/rwa-trade/etf/list - 获取ETF列表
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: GET
- **API路径**: /etf/list
- **状态**: active

### F-RWA-024-v1.0

- **功能名称**: GET /api/rwa-trade/etf/:id - 获取ETF详情
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: GET
- **API路径**: /etf/:id
- **状态**: active

### F-RWA-025-v1.0

- **功能名称**: POST /api/rwa-trade/etf/auto-generate - 自动生成ETF（根据城市）
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: POST
- **API路径**: /etf/auto-generate
- **状态**: active

### F-RWA-026-v1.0

- **功能名称**: GET /api/rwa-trade/holdings - 获取我的持有份额
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: GET
- **API路径**: /holdings
- **状态**: active

### F-RWA-027-v1.0

- **功能名称**: GET /api/rwa-trade/holdings/:assetId - 获取特定资产的持有份额
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: GET
- **API路径**: /holdings/:assetId
- **状态**: active

### F-RWA-028-v1.0

- **功能名称**: GET /api/rwa-trade/asset/:assetId/holders - 获取资产的所有持有者
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: GET
- **API路径**: /asset/:assetId/holders
- **状态**: active

### F-RWA-029-v1.0

- **功能名称**: POST /api/rwa-trade/buy-strategic/:assetId - 购买战略资产（使用TOT支付，Solana链上交易）
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: POST
- **API路径**: /buy-strategic/:assetId
- **状态**: active

### F-RWA-030-v1.0

- **功能名称**: POST /api/rwa-trade/verify-purchase/:assetId - 验证购买交易并更新状态
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: POST
- **API路径**: /verify-purchase/:assetId
- **状态**: active

### F-RWA-031-v1.0

- **功能名称**: POST /api/rwa-trade/verify-shares - 验证份额购买交易并更新状态
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: POST
- **API路径**: /verify-shares
- **状态**: active

### F-RWA-032-v1.0

- **功能名称**: POST /api/rwa-trade/verify-etf - 验证ETF购买交易并更新状态
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: POST
- **API路径**: /verify-etf
- **状态**: active

### F-RWA-033-v1.0

- **功能名称**: POST /api/rwa-trade/verify-lock/:assetId - 验证锁定交易并创建锁定记录
- **所属模块**: RWA
- **版本号**: v1.0
- **文件路径**: `server/routes/rwaTrade.js`
- **HTTP方法**: POST
- **API路径**: /verify-lock/:assetId
- **状态**: active

### F-SSE-001-v1.0

- **功能名称**: 测试路由，用于验证路由是否正常工作
- **所属模块**: SSE
- **版本号**: v1.0
- **文件路径**: `server/routes/sse.js`
- **HTTP方法**: GET
- **API路径**: /test
- **状态**: active

### F-SSE-002-v1.0

- **功能名称**: SSE 连接端点
  GET /api/sse/homepage
  建立 Server-Sent Events 连接，推送首页实时数据
- **所属模块**: SSE
- **版本号**: v1.0
- **文件路径**: `server/routes/sse.js`
- **HTTP方法**: GET
- **API路径**: /homepage
- **状态**: active

### F-TECH-001-v1.0

- **功能名称**: POST /api/tech-project/create - 创建科技项目（需认证）
- **所属模块**: TECH
- **版本号**: v1.0
- **文件路径**: `server/routes/techProject.js`
- **HTTP方法**: POST
- **API路径**: /create
- **状态**: active

### F-TECH-002-v1.0

- **功能名称**: GET /api/tech-project/:id - 获取项目详情
- **所属模块**: TECH
- **版本号**: v1.0
- **文件路径**: `server/routes/techProject.js`
- **HTTP方法**: GET
- **API路径**: /:id
- **状态**: active

### F-TECH-003-v1.0

- **功能名称**: GET /api/tech-project - 获取项目列表（支持筛选）
- **所属模块**: TECH
- **版本号**: v1.0
- **文件路径**: `server/routes/techProject.js`
- **HTTP方法**: GET
- **API路径**: /
- **状态**: active

### F-TECH-004-v1.0

- **功能名称**: POST /api/tech-project/:id/build-transaction - 构建投资交易（前端调用）
- **所属模块**: TECH
- **版本号**: v1.0
- **文件路径**: `server/routes/techProject.js`
- **HTTP方法**: POST
- **API路径**: /:id/build-transaction
- **状态**: active

### F-TECH-005-v1.0

- **功能名称**: POST /api/tech-project/:id/invest - 投资项目（链上验证）
- **所属模块**: TECH
- **版本号**: v1.0
- **文件路径**: `server/routes/techProject.js`
- **HTTP方法**: POST
- **API路径**: /:id/invest
- **状态**: active

### F-TECH-006-v1.0

- **功能名称**: POST /api/tech-project/:id/tokenize - 知识产权证券化
- **所属模块**: TECH
- **版本号**: v1.0
- **文件路径**: `server/routes/techProject.js`
- **HTTP方法**: POST
- **API路径**: /:id/tokenize
- **状态**: active

### F-TECH-007-v1.0

- **功能名称**: GET /api/tech-project/:id/investors - 获取投资者列表
- **所属模块**: TECH
- **版本号**: v1.0
- **文件路径**: `server/routes/techProject.js`
- **HTTP方法**: GET
- **API路径**: /:id/investors
- **状态**: active

### F-TECH-008-v1.0

- **功能名称**: PUT /api/tech-project/:id - 更新项目信息（仅项目创建者）
- **所属模块**: TECH
- **版本号**: v1.0
- **文件路径**: `server/routes/techProject.js`
- **HTTP方法**: PUT
- **API路径**: /:id
- **状态**: active

### F-TOKEN-001-v1.0

- **功能名称**: POST /api/token/purchase - 创建TWS代币购买订单
- **所属模块**: TOKEN
- **版本号**: v1.0
- **文件路径**: `server/routes/token.js`
- **HTTP方法**: POST
- **API路径**: /purchase
- **状态**: active

### F-TOKEN-002-v1.0

- **功能名称**: POST /api/token/verify-purchase - 验证TWS代币购买（支付完成后）
- **所属模块**: TOKEN
- **版本号**: v1.0
- **文件路径**: `server/routes/token.js`
- **HTTP方法**: POST
- **API路径**: /verify-purchase
- **状态**: active

### F-TOKEN-003-v1.0

- **功能名称**: GET /api/token/balance/:address - 获取用户TWS代币余额
- **所属模块**: TOKEN
- **版本号**: v1.0
- **文件路径**: `server/routes/token.js`
- **HTTP方法**: GET
- **API路径**: /balance/:address
- **状态**: active

### F-TOKEN-004-v1.0

- **功能名称**: GET /api/token/price - 获取当前TWS代币价格
- **所属模块**: TOKEN
- **版本号**: v1.0
- **文件路径**: `server/routes/token.js`
- **HTTP方法**: GET
- **API路径**: /price
- **状态**: active

### F-TOTP-001-v1.0

- **功能名称**: 创建购买订单
  POST /api/tot-purchase/create-order
- **所属模块**: TOTP
- **版本号**: v1.0
- **文件路径**: `server/routes/totPurchase.js`
- **HTTP方法**: POST
- **API路径**: /create-order
- **状态**: active

### F-TOTP-002-v1.0

- **功能名称**: ECPay支付回调
  POST /api/tot-purchase/callback
  注意：ECPay使用form-urlencoded格式发送回调
- **所属模块**: TOTP
- **版本号**: v1.0
- **文件路径**: `server/routes/totPurchase.js`
- **HTTP方法**: POST
- **API路径**: /callback
- **状态**: active

### F-TOTP-003-v1.0

- **功能名称**: 微信支付回调
  POST /api/tot-purchase/callback/wechat
  注意：微信支付使用XML格式发送回调
- **所属模块**: TOTP
- **版本号**: v1.0
- **文件路径**: `server/routes/totPurchase.js`
- **HTTP方法**: POST
- **API路径**: /callback/wechat
- **状态**: active

### F-TOTP-004-v1.0

- **功能名称**: 支付宝支付回调
  POST /api/tot-purchase/callback/alipay
  注意：支付宝使用form-urlencoded格式发送回调
- **所属模块**: TOTP
- **版本号**: v1.0
- **文件路径**: `server/routes/totPurchase.js`
- **HTTP方法**: POST
- **API路径**: /callback/alipay
- **状态**: active

### F-TOTP-005-v1.0

- **功能名称**: 查询订单状态
  GET /api/tot-purchase/order/:orderId
- **所属模块**: TOTP
- **版本号**: v1.0
- **文件路径**: `server/routes/totPurchase.js`
- **HTTP方法**: GET
- **API路径**: /order/:orderId
- **状态**: active

### F-TOTP-006-v1.0

- **功能名称**: 获取当前汇率
  GET /api/tot-purchase/exchange-rate
- **所属模块**: TOTP
- **版本号**: v1.0
- **文件路径**: `server/routes/totPurchase.js`
- **HTTP方法**: GET
- **API路径**: /exchange-rate
- **状态**: active

### F-USER-001-v1.0

- **功能名称**: GET /api/users - 获取所有用户（仅管理员）
- **所属模块**: USER
- **版本号**: v1.0
- **文件路径**: `server/routes/users.js`
- **HTTP方法**: GET
- **API路径**: /
- **状态**: active

### F-USER-002-v1.0

- **功能名称**: GET /api/users/developers - 获取所有房地产开发商账户
- **所属模块**: USER
- **版本号**: v1.0
- **文件路径**: `server/routes/users.js`
- **HTTP方法**: GET
- **API路径**: /developers
- **状态**: active

### F-USER-003-v1.0

- **功能名称**: POST /api/users/developers - 创建房地产开发商账户（仅管理员）
- **所属模块**: USER
- **版本号**: v1.0
- **文件路径**: `server/routes/users.js`
- **HTTP方法**: POST
- **API路径**: /developers
- **状态**: active

### F-USER-004-v1.0

- **功能名称**: PUT /api/users/developers/:address - 更新房地产开发商账户（仅管理员）
- **所属模块**: USER
- **版本号**: v1.0
- **文件路径**: `server/routes/users.js`
- **HTTP方法**: PUT
- **API路径**: /developers/:address
- **状态**: active

### F-USER-005-v1.0

- **功能名称**: DELETE /api/users/developers/:address - 删除房地产开发商账户（仅管理员）
- **所属模块**: USER
- **版本号**: v1.0
- **文件路径**: `server/routes/users.js`
- **HTTP方法**: DELETE
- **API路径**: /developers/:address
- **状态**: active

### F-USER-006-v1.0

- **功能名称**: GET /api/users/:address - 获取单个用户信息（仅管理员）
- **所属模块**: USER
- **版本号**: v1.0
- **文件路径**: `server/routes/users.js`
- **HTTP方法**: GET
- **API路径**: /:address
- **状态**: active

### F-TOT-ADMIN-001-v1.0

- **功能名称**: update_authority_handler
- **所属模块**: TOT-ADMIN
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/admin.rs`
- **函数名**: update_authority_handler
- **状态**: active

### F-TOT-ADMIN-002-v1.0

- **功能名称**: set_paused_handler
- **所属模块**: TOT-ADMIN
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/admin.rs`
- **函数名**: set_paused_handler
- **状态**: active

### F-TOT-ADMIN-003-v1.0

- **功能名称**: emergency_withdraw_handler
- **所属模块**: TOT-ADMIN
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/admin.rs`
- **函数名**: emergency_withdraw_handler
- **状态**: active

### F-TOT-ADMIN-004-v1.0

- **功能名称**: set_tws_treasury_handler
- **所属模块**: TOT-ADMIN
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/admin.rs`
- **函数名**: set_tws_treasury_handler
- **状态**: active

### F-TOT-ADMIN-005-v1.0

- **功能名称**: set_jackpot_ratio_handler
- **所属模块**: TOT-ADMIN
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/admin.rs`
- **函数名**: set_jackpot_ratio_handler
- **状态**: active

### F-TOT-ASSET_MINT-001-v1.0

- **功能名称**: mint_asset_handler
- **所属模块**: TOT-ASSET_MINT
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/asset_mint.rs`
- **函数名**: mint_asset_handler
- **状态**: active

### F-TOT-AUCTION_CREATE-001-v1.0

- **功能名称**: create_auction_handler
- **所属模块**: TOT-AUCTION_CREATE
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/auction_create.rs`
- **函数名**: create_auction_handler
- **状态**: active

### F-TOT-AUCTION_SEIZE-001-v1.0

- **功能名称**: seize_auction_handler
- **所属模块**: TOT-AUCTION_SEIZE
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/auction_seize.rs`
- **函数名**: seize_auction_handler
- **状态**: active

### F-TOT-CONSUME-001-v1.0

- **功能名称**: consume_to_treasury_handler
- **所属模块**: TOT-CONSUME
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/consume.rs`
- **函数名**: consume_to_treasury_handler
- **状态**: active

### F-TOT-HOLDER-001-v1.0

- **功能名称**: initialize_holder_handler
- **所属模块**: TOT-HOLDER
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/holder.rs`
- **函数名**: initialize_holder_handler
- **状态**: active

### F-TOT-HOLDER-002-v1.0

- **功能名称**: freeze_holder_handler
- **所属模块**: TOT-HOLDER
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/holder.rs`
- **函数名**: freeze_holder_handler
- **状态**: active

### F-TOT-HOLDER-003-v1.0

- **功能名称**: unfreeze_holder_handler
- **所属模块**: TOT-HOLDER
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/holder.rs`
- **函数名**: unfreeze_holder_handler
- **状态**: active

### F-TOT-HOOK-001-v1.0

- **功能名称**: initialize_transfer_hook
- **所属模块**: TOT-HOOK
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/hook.rs`
- **函数名**: initialize_transfer_hook
- **状态**: active

### F-TOT-HOOK-002-v1.0

- **功能名称**: execute_internal
- **所属模块**: TOT-HOOK
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/hook.rs`
- **函数名**: execute_internal
- **状态**: active

### F-TOT-HOOK-003-v1.0

- **功能名称**: set_transfer_hook_paused
- **所属模块**: TOT-HOOK
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/hook.rs`
- **函数名**: set_transfer_hook_paused
- **状态**: active

### F-TOT-INITIALIZE-001-v1.0

- **功能名称**: handler
- **所属模块**: TOT-INITIALIZE
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/initialize.rs`
- **函数名**: handler
- **状态**: active

### F-TOT-INIT_POOL-001-v1.0

- **功能名称**: handler
- **所属模块**: TOT-INIT_POOL
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/init_pool.rs`
- **函数名**: handler
- **状态**: active

### F-TOT-JACKPOT-001-v1.0

- **功能名称**: initialize_jackpot_handler
- **所属模块**: TOT-JACKPOT
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/jackpot.rs`
- **函数名**: initialize_jackpot_handler
- **状态**: active

### F-TOT-MINT_TO_POOLS-001-v1.0

- **功能名称**: handler
- **所属模块**: TOT-MINT_TO_POOLS
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/mint_to_pools.rs`
- **函数名**: handler
- **状态**: active

### F-TOT-MOD-001-v1.0

- **功能名称**: initialize
- **所属模块**: TOT-MOD
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/mod.rs`
- **函数名**: initialize
- **状态**: active

### F-TOT-PLATFORM_TRANSFER-001-v1.0

- **功能名称**: platform_transfer_handler
- **所属模块**: TOT-PLATFORM_TRANSFER
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/platform_transfer.rs`
- **函数名**: platform_transfer_handler
- **状态**: active

### F-TOT-QUERY-001-v1.0

- **功能名称**: calculate_tax_handler
- **所属模块**: TOT-QUERY
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/query.rs`
- **函数名**: calculate_tax_handler
- **状态**: active

### F-TOT-QUERY-002-v1.0

- **功能名称**: get_holder_stats_handler
- **所属模块**: TOT-QUERY
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/query.rs`
- **函数名**: get_holder_stats_handler
- **状态**: active

### F-TOT-TAX-001-v1.0

- **功能名称**: initialize_tax_config_handler
- **所属模块**: TOT-TAX
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/tax.rs`
- **函数名**: initialize_tax_config_handler
- **状态**: active

### F-TOT-TAX-002-v1.0

- **功能名称**: update_tax_config_handler
- **所属模块**: TOT-TAX
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/tax.rs`
- **函数名**: update_tax_config_handler
- **状态**: active

### F-TOT-TAX-003-v1.0

- **功能名称**: add_tax_exempt_handler
- **所属模块**: TOT-TAX
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/tax.rs`
- **函数名**: add_tax_exempt_handler
- **状态**: active

### F-TOT-TAX-004-v1.0

- **功能名称**: remove_tax_exempt_handler
- **所属模块**: TOT-TAX
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/tax.rs`
- **函数名**: remove_tax_exempt_handler
- **状态**: active

### F-TOT-TRANSFER-001-v1.0

- **功能名称**: transfer_with_tax_handler
- **所属模块**: TOT-TRANSFER
- **版本号**: v1.0
- **文件路径**: `tot/src/instructions/transfer.rs`
- **函数名**: transfer_with_tax_handler
- **状态**: active

