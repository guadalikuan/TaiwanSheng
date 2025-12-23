# 倒计时系统改造完整文档

## 1. 改造目标
- **真实数据驱动**：倒计时不再是纯虚拟的，而是基于“中国台湾网”的新闻数据进行动态调整。
- **AI 智能分析**：接入科大讯飞 Spark Ultra-32K API，对新闻标题和内容进行深度语义分析，判断其对统一进程的影响（加速或延后）。
- **服务端统一管理**：倒计时状态由服务端统一管理（Single Source of Truth），并通过 `time.json` 持久化保存，确保重启后不丢失。
- **多端实时同步**：通过 Server-Sent Events (SSE) 技术，将倒计时的变更实时推送到所有连接的客户端，保证多客户端显示一致。
- **高可用兜底**：当 AI 接口不可用时，自动降级为本地关键词库匹配模式，确保系统稳定性。

## 2. 核心模块变更

### 2.1 新增模块 `timeManager.js`
- **位置**: `tws/server/utils/timeManager.js`
- **功能**:
  - 负责倒计时目标时间的存储、读取和更新。
  - 数据持久化到 `tws/server/data/time.json`。
  - 提供 `adjustTime` 接口供 Oracle 模块调用。
  - 提供 `getTargetTime` 接口供 API 调用。
  - 记录最近 50 条调整历史。

### 2.2 新增模块 `spark.js`
- **位置**: `tws/server/utils/spark.js`
- **功能**: 封装科大讯飞星火大模型 WebSocket API。
- **特性**: 支持 HMAC-SHA256 鉴权，自动处理 WebSocket 连接与断线重连，流式响应聚合。
- **配置**: 使用 Spark Ultra-32K (v4.0) 接口。

### 2.3 修改模块 `oracle.js` (Oracle 预言机)
- **位置**: `tws/server/utils/oracle.js`
- **变更**:
  - 集成 Spark API 客户端。
  - 实现新闻抓取（Cheerio）和清洗逻辑。
  - 实现 AI 分析与本地关键词兜底的双模分析引擎。
  - 调用 `TimeManager` 进行时间调整。
  - 通过 SSE 推送最新的倒计时和事件信息。
  - **配置**:
    ```javascript
    const CONFIG = {
      sourceUrl: 'http://big5.chinataiwan.cn/gate/big5/www.chinataiwan.cn/xwzx/PoliticsNews/',
      scanInterval: '0 * * * *', // 每小时执行一次
      spark: {
        appId: 'befd8e29',
        apiSecret: '***',
        apiKey: '***',
        domain: '4.0Ultra'
      }
    };
    ```

### 2.4 修改模块 `homepageStorage.js`
- **位置**: `tws/server/utils/homepageStorage.js`
- **变更**:
  - `calculateETUTargetTime` 不再进行复杂的本地计算，而是直接从 `TimeManager` 获取权威时间。
  - 废弃 `updateAiTimeAdjustment`，统一由 `TimeManager` 接管。

### 2.5 修改入口 `server.js`
- **位置**: `tws/server/server.js`
- **变更**:
  - 服务启动时初始化 `TimeManager`。
  - 自动启动 Oracle 定时扫描任务（无需环境变量开关）。

### 2.6 持久化存储修复 (2025-12-23 更新)
- **问题**: AI 分析调整倒计时后，重启服务数据丢失，重置为默认值。
- **原因**: `timeManager.js` 在初始化或保存时未检查并创建 `data` 目录，导致 `time.json` 写入失败（静默失败或未被用户注意）。
- **修复**: 
  - 在 `initTimeManager` 和 `saveTimeData` 中增加 `mkdirSync` 逻辑，确保 `server/data` 目录存在。
  - 增加详细的保存成功/失败日志。
  - 优化 `oracle.js` 日志，明确显示“无调整”的情况（评分 41-59）。

## 2.7 异步数据获取修复 (2025-12-23 更新)
- **问题**: 前端显示的倒计时与服务器 `time.json` 存储的值不一致（显示为 737 天，实际应为 743 天）。
- **原因**: `server/routes/homepage.js` 中的 `/api/homepage/omega` 路由未正确处理 `getOmegaData` 的异步调用（缺少 `await`），导致返回给前端的是一个 Promise 对象而非实际数据，前端因此回退到默认的 2027-12-31。
- **修复**: 
  - 将 `/omega` 和 `/map` 路由处理器修改为 `async` 函数。
  - 添加 `await` 关键字以正确获取异步数据。

## 2.8 风险溢价逻辑增强 (2025-12-23 更新)
- **更新内容**: 首页显示的“Current Risk Premium”（风险溢价）现在不仅受市场波动影响，还直接关联 AI 分析的台海局势紧张程度。
- **逻辑说明**:
  - 系统会检查最近 24 小时内 AI 对倒计时进行的调整。
  - **加速统一**（时间减少）：视为局势紧张，风险溢价上升（每加速1天 +5%）。
  - **推迟统一**（时间增加）：视为局势缓和，风险溢价下降（每推迟1天 -2%）。
  - 这使得首页的百分比数值能真实反映当前的“地缘政治风险”。

## 2.9 新闻去重机制升级 (2025-12-23 更新)
- **目的**: 防止重复抓取同一条新闻导致倒计时被重复计算调整。
- **技术方案 (Strategy B)**:
  - **初筛**: 引入 **Bloom Filter (布隆过滤器)**，利用其极小的内存占用和 O(1) 查询速度进行第一层拦截。
  - **核实**: 引入 `history.json` 作为持久化存储和二级验证库。
  - **流程**: 
    1. 抓取新闻 URL。
    2. 查布隆过滤器 -> 若不存在，确认是新新闻。
    3. 若布隆过滤器认为存在（可能误判），查 `history.json` -> 若确实存在，跳过；若不存在，确认是新新闻（修正误判）。
    4. 新新闻处理完后，同时写入布隆过滤器和 `history.json`。
- **新增文件**:
  - `server/utils/historyManager.js`: 封装布隆过滤器和历史记录管理。
  - `server/data/history.json`: 存储已处理的新闻历史。

## 3. 依赖变更
- 新增 npm 包:
  - `axios`: 用于 HTTP 请求抓取网页。
  - `cheerio`: 用于解析 HTML 提取新闻标题。
  - `ws`: 用于 Node.js 环境下的 WebSocket 通信。
  - `bloom-filters`: 用于高效的新闻去重。

## 4. 数据流向
1. **抓取**: Oracle 每小时从中国台湾网抓取最新时政新闻。
2. **分析**:
   - 优先使用 Spark AI 分析新闻对统一进程的影响评分 (0-100)。
   - 若 AI 失败，使用本地关键词库（如“统一”、“演习” vs “交流”、“和平”）进行匹配。
3. **决策**:
   - 评分 > 60: 加速统一（倒计时减少）。
   - 评分 < 40: 延后统一（倒计时增加）。
   - 评分 40-60: 无影响。
4. **执行**: `TimeManager` 更新内存中的目标时间，并写入 `time.json`。
5. **同步**: 服务器通过 SSE 向所有前端客户端广播新的目标时间。
6. **展示**: 前端接收到 SSE 消息，平滑更新倒计时显示。

## 5. 验证与测试
1. **手动测试**: 可通过 POST `/api/oracle/scan` (需 Admin 权限) 手动触发一次扫描，观察服务器日志中的 AI 评分与时间调整结果。
2. **自动运行**: 服务器启动后，Cron 任务将自动每小时执行一次。
3. **故障恢复**:
   - 包含 `try-catch` 全局捕获，防止爬虫或 API 错误导致服务器崩溃。
   - 数据写入 `time.json`，确保重启后倒计时进度不丢失。

## 6. 常见问题
- **Q: 为什么倒计时会突然变动？**
  - A: 系统检测到了重要新闻事件，AI 判定该事件影响了统一进程。
- **Q: AI 分析失败怎么办？**
  - A: 系统会自动切换到本地关键词模式，日志中会显示 `切换至本地关键词分析`。
- **Q: 重启服务器会重置倒计时吗？**
  - A: 不会。时间存储在 `time.json` 中，重启后会自动加载上次的状态。

## 7. 后续建议
- **多源扩展**: 目前仅支持“红色源头”，未来可复用 `fetchNewsList` 逻辑接入“蓝色源头”（如美国国防部官网）或“绿色源头”。
- **敏感词优化**: 持续观察 Spark API 的返回率，若敏感拦截过高，需扩充本地 `KEYWORDS` 词库。
