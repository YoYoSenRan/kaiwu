# s03-api-layer 勘误

> 代码审查发现的技术性问题，按严重程度分组。

## A 组：Route Handler 缺陷（必须在 s04 前修复）

### A1. SSE 断线恢复超时判断逻辑反了

**文件**：`apps/site/src/app/api/pipeline/events/stream/route.ts`

**问题**：当前查询 `seq > lastEventId` 的第一条新事件的时间戳来判断是否过期。但设计意图是"客户端断线超过 5 分钟就不补推"——应判断 lastEventId 对应事件本身的时间距今是否超过 5 分钟。

如果客户端断线 3 天，恰好最近 4 分钟前有新事件，当前逻辑会错误地补推全部历史。

**修复**：查 `WHERE seq = lastEventId` 的那条事件的 `created_at`；若不存在（已清理），视为过期。

```typescript
// before（错）
const [latest] = await db.select(...).where(gt(events.seq, seq)).limit(1)
const isStale = latest?.createdAt && Date.now() - latest.createdAt.getTime() > RECONNECT_TIMEOUT_MS

// after（对）
const [disconnectedAt] = await db.select({ createdAt: events.createdAt }).from(events).where(eq(events.seq, seq))
const isStale = !disconnectedAt || Date.now() - disconnectedAt.createdAt.getTime() > RECONNECT_TIMEOUT_MS
```

---

### A2. `POST /phases/:phaseId/output` 未按阶段类型校验产出

**文件**：`apps/site/src/app/api/pipeline/phases/[phaseId]/output/route.ts`

**问题**：用 `z.record(z.string(), z.unknown())` 接收所有阶段产出，等于完全不校验。7 个 Zod Schema 定义了但没有用上，任何垃圾 JSON 都能写入 `phases.output`。

**修复**：先查 `phase.type`，再用 type→schema 映射表选择对应 Schema 校验。

```typescript
import { scoutReportSchema } from "@/lib/schemas/scout-report"
import { verdictSchema } from "@/lib/schemas/verdict"
import { blueprintSchema } from "@/lib/schemas/blueprint"
import { deployReportSchema } from "@/lib/schemas/deploy-report"

const PHASE_OUTPUT_SCHEMAS: Record<string, ZodSchema> = {
  scout: scoutReportSchema,
  verdict: verdictSchema,
  blueprint: blueprintSchema,
  review: reviewSchema,       // 待 A6 新增
  deploy: deployReportSchema,
}
```

注意：debate 和 build 阶段的产出走独立端点（debates/route.ts、tasks/:id/complete），不经过此端点。

---

### A3. debates POST 事件缺 projectId

**文件**：`apps/site/src/app/api/pipeline/phases/[phaseId]/debates/route.ts`

**问题**：`emitEvent` 只传了 `phaseId` 和 `agentId`，没有 `projectId`。后续事件消费者（SSE 过滤、编排层）需要按 projectId 过滤。

**修复**：在 handler 开头查 phase 记录，取 `phase.projectId` 传给 emitEvent。

---

### A4. `completeTask` 无调用者鉴权

**文件**：`apps/site/src/app/api/pipeline/tasks/[taskId]/complete/route.ts`

**问题**：不检查 `X-Agent-Id` 是否和 `task.assignedAgent` 一致，任何 Agent 都能完成任何 Task。

**修复**：查出 task 后，对比 `task.assignedAgent` 和 `X-Agent-Id`，不匹配返回 403。

---

### A5. debates POST agentId fallback 为空字符串

**文件**：`apps/site/src/app/api/pipeline/phases/[phaseId]/debates/route.ts`

**问题**：`const agentId = req.headers.get("X-Agent-Id") ?? ""`，写入 DB 的是空字符串而非 null。其他接口用 `?? undefined`，风格不一致。

**修复**：改为 `?? undefined`，或在 handler 开头强制要求 X-Agent-Id 存在，缺失返回 401。

---

### A6. 缺少 reviewSchema

**文件**：`apps/site/src/lib/schemas/` 下需新增 `review.ts`

**问题**：试剑的输出格式在 TOOLS.md 中有定义（verdict/issues/summary），但没有对应的 Zod Schema。A2 修复 phase output 校验时需要它。

**修复**：按试剑 TOOLS.md 输出格式新增 reviewSchema。

---

## B 组：架构对齐（Plugin 方案前置）

### B1. submitOutput 和 Plugin 具名工具的关系

**问题**：`submitOutput.ts` 是通用函数，但 Plugin 方案（D6）要求按角色注册 5 个具名工具（submit_scout_report 等），各自有独立 Schema。两者关系不清。

**方案**：保持 `submitOutput.ts` 为 HTTP client 底层（design.md D6 已说明 "tools/ 保留为 HTTP client 底层"）。Plugin 层各具名工具的 execute 函数调用 submitOutput，各自的 TypeBox Schema 提供 Agent 侧的参数描述。Route Handler 端的 Zod 校验（A2）是最终防线。

**变更**：
- submitOutput.ts 不拆，保持通用
- Route Handler 加 phase-type 校验（A2）
- Plugin 层 5 个具名工具各自用 TypeBox 定义参数 Schema + 调 submitOutput

**无需额外修改**，A2 + 8 组 Plugin 任务覆盖。

---

## C 组：文档与类型补齐

### C1. spec 文件 camelCase 残留

**文件**：`openspec/changes/s03-api-layer/specs/` 下 4 个 spec.md

**问题**：所有 spec 文件还是 camelCase 工具名，且引用 getMyMemories。

**修复**：
- 工具名全部 snake_case
- 移除 getMyMemories 场景，改为 memory_search 说明
- 新增 Plugin 注册相关 requirement
- submitOutput 场景改为具名工具

---

### C2. Tool 函数返回 `Promise<unknown>`

**文件**：`packages/openclaw/src/tools/*.ts`

**问题**：9 个 Tool 函数全部返回 `Promise<unknown>`，丢失类型信息。编排层调用时需要手动断言。

**修复**：用 schema 的 `z.infer<>` 类型标注返回值。例如：

```typescript
import type { ScoutReport } from "@kaiwu/site/lib/schemas/scout-report"
// 或在 openclaw 包内定义响应类型
export async function getMyStats(agentId: string): Promise<AgentStatsResponse> { ... }
```

注意：响应类型目前定义在 `apps/site` 里（Zod schema），跨包引用不好。更好的做法是把响应类型提取到 `packages/domain` 或 `packages/openclaw` 中。

**建议**：随 Plugin 层（8 组任务）一起做，因为 TypeBox Schema 定义时自然会产出类型。

---

## D 组：后续提案补丁

### D1. s04 — Gateway session API 契约未定义

**文件**：`openspec/changes/s04-orchestrator/design.md`

**问题**：D3 说"通过 Gateway API 创建 isolated session 并直接传入任务消息"，但未定义具体的 API 契约（endpoint、request/response）。`packages/openclaw` 里也没有 Gateway session 相关封装。

**修复**：追加 Decision，明确 Gateway API 调用方式：
- 创建 session：`POST /api/agents/:agentId/sessions`
- 发送消息：`POST /api/sessions/:sessionId/messages`
- 获取结果：轮询或回调
- 在 `packages/openclaw/src/` 中封装 `gateway-client.ts`

---

### D2. s10/s11 — 目录结构未统一

**文件**：`openspec/changes/s10-memory/design.md`、`openspec/changes/s11-build-pipeline/design.md`

**问题**：s10 记忆存 OpenClaw workspace 文件，s11 产出存 `~/.openclaw/products/`。但无统一目录结构规范，D8 的 sync-workspaces.ts 需要知道这些路径。

**修复**：在 s10 或 s11 的 design.md 中追加 Decision，定义 OpenClaw 目录结构：
```
~/.openclaw/
├── workspaces/{agent-id}/     # Agent workspace（记忆、配置）
│   └── memory/
├── products/{project-slug}/   # 造物产出
│   ├── .kaiwu/
│   └── src/
└── gateway.yaml               # Gateway 配置
```

---

### D3. s03 — API_BASE 端口 fallback 需文档说明

**文件**：`packages/openclaw/src/tools/api-client.ts`

**问题**：`API_BASE` fallback 为 `http://127.0.0.1:3600`，但没有在 .env.example 或文档中说明。

**修复**：在 .env.example 中补充 `KAIWU_API_BASE` 说明。

---

## 执行优先级

| 优先级 | 组别 | 任务数 | 阻塞关系 |
|--------|------|--------|----------|
| P0 | A 组（Route Handler 修复） | 6 项 | 阻塞 s07/s08 |
| P1 | C1（spec 文档对齐） | 4 文件 | 阻塞 Plugin 开发 |
| P2 | D1（s04 Gateway 契约） | 1 Decision | 阻塞 s04 实现 |
| P3 | C2（类型补全）+ D2/D3 | 随 Plugin 一起做 | 不阻塞 |
