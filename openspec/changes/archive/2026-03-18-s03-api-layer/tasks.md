## 1. API 基础设施

- [x] 1.1 创建 `apps/site/src/lib/api-utils.ts`：apiHandler（Zod 校验 + 错误处理 + JSON 响应封装）、apiError — 验收：可在 route.ts 中使用
- [x] 1.2 创建 `packages/domain/src/events/bus.ts` + `emitter.ts`：内存 EventBus（publish/subscribe）+ emitEvent（写 events 表 + publish）— 验收：publish 后 subscriber 收到事件

## 2. Zod Schema 定义

- [x] 2.1 创建 `apps/site/src/lib/schemas/scout-report.ts`：采风报告 schema — 验收：与游商 TOOLS.md 输出格式一致
- [x] 2.2 创建 `apps/site/src/lib/schemas/debate-speech.ts`：辩论发言 schema — 验收：含 round/stance/content/citations/keyPoint
- [x] 2.3 创建 `apps/site/src/lib/schemas/verdict.ts`：裁决书 schema — 验收：与掌秤 TOOLS.md 输出格式一致
- [x] 2.4 创建 `apps/site/src/lib/schemas/blueprint.ts`：蓝图 schema — 验收：与画师 TOOLS.md 输出格式一致
- [x] 2.5 创建 `apps/site/src/lib/schemas/task-complete.ts`：任务完成报告 schema — 验收：含 commits/decisions/note
- [x] 2.6 创建 `apps/site/src/lib/schemas/deploy-report.ts`：鸣锣报告 schema — 验收：与鸣锣 TOOLS.md 输出格式一致
- [x] 2.7 创建 `apps/site/src/lib/schemas/agent-log.ts`：Agent 日志 schema — 验收：含 projectId/phaseId/type/content/visibility

## 3. 读取接口

- [x] 3.1 实现 `GET /api/pipeline/agents/route.ts`：返回所有 Agent 列表 — 验收：curl 返回 8 个 Agent
- [x] 3.2 实现 `GET /api/pipeline/agents/[agentId]/stats/route.ts`：返回 Agent 属性 — 验收：curl 返回 stats 数组
- [x] 3.3 实现 `GET /api/pipeline/projects/route.ts`：返回当前 running 造物令 — 验收：curl 返回正确数据
- [x] 3.4 实现 `GET /api/pipeline/projects/[projectId]/context/route.ts`：返回项目上下文 + 上游产出 — 验收：curl 返回 project + upstreamOutputs + currentPhase
- [x] 3.5 实现 `GET /api/pipeline/phases/[phaseId]/debates/route.ts`：返回辩论记录 — 验收：curl 返回按轮次排序的 debates
- [x] 3.6 实现 `GET /api/pipeline/projects/[projectId]/tasks/route.ts`：返回任务列表（支持筛选）— 验收：curl 带 query 参数返回筛选结果

## 4. 写入接口

- [x] 4.1 实现 `POST /api/pipeline/phases/[phaseId]/output/route.ts`：提交阶段产出（Zod 校验 + 幂等 409）— 验收：curl POST 成功写入，重复提交返回 409
- [x] 4.2 实现 `POST /api/pipeline/phases/[phaseId]/debates/route.ts`：提交辩论发言 — 验收：curl POST 成功写入 debates 表
- [x] 4.3 实现 `POST /api/pipeline/tasks/[taskId]/complete/route.ts`：提交任务完成 — 验收：curl POST 后 task status 变为 completed
- [x] 4.4 实现 `POST /api/pipeline/agents/[agentId]/logs/route.ts`：写入 Agent 日志 — 验收：curl POST 成功写入 agent_logs 表

## 5. SSE 端点

- [x] 5.1 实现 `GET /api/pipeline/events/stream/route.ts`：SSE 流（EventBus subscribe + seq 作为 event id）— 验收：EventSource 可连接，收到推送
- [x] 5.2 实现 Last-Event-ID 断线恢复（seq > lastEventId 查询补推）— 验收：断线重连后补推缺失事件
- [x] 5.3 实现 5 分钟超时判断（超时不补推，客户端全量刷新）— 验收：超时场景不补推

## 6. OpenClaw Tool 封装

- [x] 6.1 创建 `packages/openclaw/src/tools/getMyStats.ts` — 验收：调用返回 Agent 属性
- [x] 6.2 创建 `packages/openclaw/src/tools/getProjectContext.ts` — 验收：调用返回项目上下文
- [x] 6.3 创建 `packages/openclaw/src/tools/getDebateHistory.ts` — 验收：调用返回辩论记录
- [x] 6.4 创建 `packages/openclaw/src/tools/getMyTasks.ts` — 验收：调用返回任务列表
- [x] 6.5 创建 `packages/openclaw/src/tools/getMyMemories.ts`（调用 OpenClaw 原生 memory_search）— 验收：调用返回记忆列表
- [x] 6.6 创建 `packages/openclaw/src/tools/submitOutput.ts`（通用阶段产出）— 验收：调用写入 phases.output
- [x] 6.7 创建 `packages/openclaw/src/tools/submitDebateSpeech.ts` — 验收：调用写入 debates 表
- [x] 6.8 创建 `packages/openclaw/src/tools/completeTask.ts` — 验收：调用更新 task status
- [x] 6.9 创建 `packages/openclaw/src/tools/writeLog.ts` — 验收：调用写入 agent_logs 表
- [x] 6.10 创建 `packages/openclaw/src/tools/index.ts`：barrel 导出所有 9 个 Tool — 验收：import 可用

## 7. 验证

- [x] 7.1 所有读取接口 curl 测试通过
- [x] 7.2 所有写入接口 curl 测试通过（含 Zod 校验拦截）
- [x] 7.3 SSE 端点连接 + 断线恢复测试通过
- [x] 7.4 `pnpm typecheck` 通过

## 8. OpenClaw Plugin 层

- [x] 8.1 安装 @sinclair/typebox — 验收：typecheck 通过
- [x] 8.2 创建 plugin/index.ts 注册入口（export default function register） — 验收：函数签名正确
- [x] 8.3 创建 plugin/tool-defs.ts — get_my_stats 定义（TypeBox Schema + execute） — 验收：参数校验生效
- [x] 8.4 注册 get_project_context — 验收：Gateway 调用返回项目上下文
- [x] 8.5 注册 get_debate_history — 验收：Gateway 调用返回辩论记录
- [x] 8.6 注册 get_my_tasks — 验收：Gateway 调用返回任务列表
- [x] 8.7 注册 5 个 submit 具名工具（scout_report/verdict/blueprint/review/deploy_report） — 验收：各自 Schema 校验生效
- [x] 8.8 注册 submit_debate_speech — 验收：Gateway 调用写入 debates 表
- [x] 8.9 注册 complete_task — 验收：Gateway 调用更新 task status
- [x] 8.10 注册 write_log — 验收：Gateway 调用写入 agent_logs 表
- [x] 8.11 创建 openclaw.plugin.json 插件清单 — 验收：声明 kaiwu-tools 插件 + 所有工具
- [x] 8.12 删除 getMyMemories.ts，更新 tools/index.ts — 验收：typecheck 通过

## 9. Gateway 配置与同步

- [x] 9.1 创建 Gateway 配置模板 — 验收：8 个 Agent 各自 tools.allow 正确
- [x] 9.2 创建 scripts/sync-workspaces.ts — 验收：--dry-run 输出文件差异
- [x] 9.3 注册 pnpm sync:openclaw 命令 — 验收：命令可执行

## 10. 文档对齐（已在本次提案更新中完成）

- [x] 10.1 更新 8 个 TOOLS.md（snake_case + 使用策略 + memory_search）
- [x] 10.2 更新 8 个 SOUL.md（工具名 snake_case）
- [x] 10.3 更新 proposal.md
- [x] 10.4 更新 design.md（D6/D7/D8）
- [x] 10.5 更新 design/ 目录下 25 个文档（snake_case 工具名）

## 11. 勘误修复 — Route Handler（P0，阻塞 s07/s08）

- [x] 11.1 修复 SSE 断线恢复超时判断逻辑（查 lastEventId 本身的时间而非新事件时间） — 验收：断线 >5min 重连不补推，断线 <5min 正确补推
- [x] 11.2 POST /phases/:phaseId/output 按 phase.type 选择对应 Zod Schema 校验 — 验收：非法产出返回 400，合法产出正常写入
- [x] 11.3 新增 reviewSchema（试剑输出格式） — 验收：与试剑 TOOLS.md 输出格式一致
- [x] 11.4 debates POST 补充 projectId 到 emitEvent — 验收：debate_speech 事件含 projectId
- [x] 11.5 completeTask 鉴权：X-Agent-Id 必须匹配 task.assignedAgent — 验收：非 assignee 调用返回 403
- [x] 11.6 debates POST agentId 强制要求 X-Agent-Id header，缺失返回 401 — 验收：无 header 时返回 401

## 12. 勘误修复 — 文档与类型（P1）

- [x] 12.1 更新 specs/openclaw-tools/spec.md（snake_case + 移除 getMyMemories + 新增 Plugin requirement） — 验收：spec 与 TOOLS.md 一致
- [x] 12.2 更新 specs/api-read/spec.md、api-write/spec.md、api-sse/spec.md（如有 camelCase 残留） — 验收：grep 零匹配
- [x] 12.3 .env.example 补充 KAIWU_API_BASE 说明 — 验收：说明端口用途

## 13. 后续提案补丁（P2，记录到对应 design.md）

- [x] 13.1 s04 design.md 追加 Gateway session API 契约 Decision — 验收：endpoint/request/response 明确
- [x] 13.2 s10 或 s11 design.md 追加 OpenClaw 统一目录结构 Decision — 验收：workspace/products/gateway 路径明确
