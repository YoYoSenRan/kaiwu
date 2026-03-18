## 1. API 基础设施

- [ ] 1.1 创建 `apps/site/src/lib/api-utils.ts`：apiHandler（Zod 校验 + 错误处理 + JSON 响应封装）、apiError — 验收：可在 route.ts 中使用
- [ ] 1.2 创建 `apps/site/src/lib/event-bus.ts`：内存 EventBus（publish/subscribe/unsubscribe）— 验收：单元测试 publish 后 subscriber 收到事件

## 2. Zod Schema 定义

- [ ] 2.1 创建 `apps/site/src/lib/schemas/scout-report.ts`：采风报告 schema — 验收：与游商 TOOLS.md 输出格式一致
- [ ] 2.2 创建 `apps/site/src/lib/schemas/debate-speech.ts`：辩论发言 schema — 验收：含 round/stance/content/citations/keyPoint
- [ ] 2.3 创建 `apps/site/src/lib/schemas/verdict.ts`：裁决书 schema — 验收：与掌秤 TOOLS.md 输出格式一致
- [ ] 2.4 创建 `apps/site/src/lib/schemas/blueprint.ts`：蓝图 schema — 验收：与画师 TOOLS.md 输出格式一致
- [ ] 2.5 创建 `apps/site/src/lib/schemas/task-complete.ts`：任务完成报告 schema — 验收：含 commits/decisions/note
- [ ] 2.6 创建 `apps/site/src/lib/schemas/deploy-report.ts`：鸣锣报告 schema — 验收：与鸣锣 TOOLS.md 输出格式一致
- [ ] 2.7 创建 `apps/site/src/lib/schemas/agent-log.ts`：Agent 日志 schema — 验收：含 projectId/phaseId/type/content/visibility

## 3. 读取接口

- [ ] 3.1 实现 `GET /api/pipeline/agents/route.ts`：返回所有 Agent 列表 — 验收：curl 返回 8 个 Agent
- [ ] 3.2 实现 `GET /api/pipeline/agents/[agentId]/stats/route.ts`：返回 Agent 属性 — 验收：curl 返回 stats 数组
- [ ] 3.3 实现 `GET /api/pipeline/projects/route.ts`：返回当前 running 造物令 — 验收：curl 返回正确数据
- [ ] 3.4 实现 `GET /api/pipeline/projects/[projectId]/context/route.ts`：返回项目上下文 + 上游产出 — 验收：curl 返回 project + upstreamOutputs + currentPhase
- [ ] 3.5 实现 `GET /api/pipeline/phases/[phaseId]/debates/route.ts`：返回辩论记录 — 验收：curl 返回按轮次排序的 debates
- [ ] 3.6 实现 `GET /api/pipeline/projects/[projectId]/tasks/route.ts`：返回任务列表（支持筛选）— 验收：curl 带 query 参数返回筛选结果

## 4. 写入接口

- [ ] 4.1 实现 `POST /api/pipeline/phases/[phaseId]/output/route.ts`：提交阶段产出（Zod 校验 + 幂等 409）— 验收：curl POST 成功写入，重复提交返回 409
- [ ] 4.2 实现 `POST /api/pipeline/phases/[phaseId]/debates/route.ts`：提交辩论发言 — 验收：curl POST 成功写入 debates 表
- [ ] 4.3 实现 `POST /api/pipeline/tasks/[taskId]/complete/route.ts`：提交任务完成 — 验收：curl POST 后 task status 变为 completed
- [ ] 4.4 实现 `POST /api/pipeline/agents/[agentId]/logs/route.ts`：写入 Agent 日志 — 验收：curl POST 成功写入 agent_logs 表

## 5. SSE 端点

- [ ] 5.1 实现 `GET /api/pipeline/events/stream/route.ts`：SSE 流（EventBus subscribe + seq 作为 event id）— 验收：EventSource 可连接，收到推送
- [ ] 5.2 实现 Last-Event-ID 断线恢复（seq > lastEventId 查询补推）— 验收：断线重连后补推缺失事件
- [ ] 5.3 实现 5 分钟超时判断（超时不补推，客户端全量刷新）— 验收：超时场景不补推

## 6. OpenClaw Tool 封装

- [ ] 6.1 创建 `packages/openclaw/src/tools/getMyStats.ts` — 验收：调用返回 Agent 属性
- [ ] 6.2 创建 `packages/openclaw/src/tools/getProjectContext.ts` — 验收：调用返回项目上下文
- [ ] 6.3 创建 `packages/openclaw/src/tools/getDebateHistory.ts` — 验收：调用返回辩论记录
- [ ] 6.4 创建 `packages/openclaw/src/tools/getMyTasks.ts` — 验收：调用返回任务列表
- [ ] 6.5 创建 `packages/openclaw/src/tools/getMyMemories.ts`（调用 OpenClaw 原生 memory_search）— 验收：调用返回记忆列表
- [ ] 6.6 创建 `packages/openclaw/src/tools/submitOutput.ts`（通用阶段产出）— 验收：调用写入 phases.output
- [ ] 6.7 创建 `packages/openclaw/src/tools/submitDebateSpeech.ts` — 验收：调用写入 debates 表
- [ ] 6.8 创建 `packages/openclaw/src/tools/completeTask.ts` — 验收：调用更新 task status
- [ ] 6.9 创建 `packages/openclaw/src/tools/writeLog.ts` — 验收：调用写入 agent_logs 表
- [ ] 6.10 创建 `packages/openclaw/src/tools/index.ts`：barrel 导出所有 9 个 Tool — 验收：import 可用

## 7. 验证

- [ ] 7.1 所有读取接口 curl 测试通过
- [ ] 7.2 所有写入接口 curl 测试通过（含 Zod 校验拦截）
- [ ] 7.3 SSE 端点连接 + 断线恢复测试通过
- [ ] 7.4 `pnpm typecheck` 通过
