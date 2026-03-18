# 02 — API 层

## 目标

实现 Agent 数据接口的 Route Handler 和 OpenClaw Tool 封装。完成后 Agent 可以通过 tool 调用读写数据库，展示网站也可以通过同一套 API 获取数据。

## 依赖

- 00-数据库（表定义和 db 实例）

## 文件清单

```
apps/site/src/app/api/pipeline/
├── agents/
│   ├── [agentId]/
│   │   ├── stats/route.ts           # GET — 获取 Agent 属性
│   │   └── logs/route.ts            # POST — 写入 Agent 日志
│   └── route.ts                     # GET — 获取所有 Agent 列表和状态
├── projects/
│   ├── [projectId]/
│   │   ├── context/route.ts         # GET — 获取项目上下文（含上游产出）
│   │   └── tasks/route.ts           # GET — 获取项目任务列表
│   └── route.ts                     # GET — 获取当前 running 的造物令
├── phases/
│   └── [phaseId]/
│       ├── output/route.ts          # POST — 提交阶段产出
│       └── debates/route.ts         # GET + POST — 读取/提交辩论发言
├── tasks/
│   └── [taskId]/
│       └── complete/route.ts        # POST — 提交任务完成报告
└── events/
    └── stream/route.ts              # GET — SSE 实时推送

packages/openclaw/src/tools/
├── getMyStats.ts                    # 读取属性
├── getMyMemories.ts                 # 读取记忆
├── getProjectContext.ts             # 读取项目上下文
├── getDebateHistory.ts              # 读取辩论记录
├── getMyTasks.ts                    # 读取任务列表
├── submitOutput.ts                  # 提交阶段产出（通用）
├── submitDebateSpeech.ts            # 提交辩论发言
├── completeTask.ts                  # 提交任务完成
├── writeLog.ts                      # 写入日志
└── index.ts                         # barrel 导出
```

## 实现步骤

### Step 1：通用工具

创建 API 层的通用工具：

文件：`apps/site/src/lib/api-utils.ts`

```ts
// Zod 校验 + 错误处理 + JSON 响应的通用封装
export function apiHandler(schema, handler) { ... }
export function apiError(status, message) { ... }
```

### Step 2：读取接口（Route Handlers）

按以下顺序实现（从简单到复杂）：

**2.1 GET /api/pipeline/agents**
- 查询 agents 表全部记录
- 返回：id, name, title, emoji, status, activity, level, levelName

**2.2 GET /api/pipeline/agents/[agentId]/stats**
- 查询 agent_stats 表 WHERE agent_id = ?
- 返回：agentId, level, levelName, stats[], specialStats

**2.3 GET /api/pipeline/projects/[projectId]/context**
- 查询 projects 表 + 关联的 phases（含 output）
- 组装上游产出（scout → council → architect → ...）
- 返回：project, upstreamOutputs, currentPhase

**2.4 GET /api/pipeline/phases/[phaseId]/debates**
- 查询 debates 表 WHERE phase_id = ? ORDER BY round, created_at
- 返回：debates[]

**2.5 GET /api/pipeline/projects/[projectId]/tasks**
- 查询 tasks 表 WHERE project_id = ?
- 支持筛选：assignedTo, status
- 返回：tasks[]

### Step 3：写入接口（Route Handlers）

**3.1 POST /api/pipeline/phases/[phaseId]/output**
- Zod 校验请求体（schema 因阶段而异，用 phaseType 判断）
- 写入 phases.output
- 返回：{ success: true }

**3.2 POST /api/pipeline/phases/[phaseId]/debates**
- Zod 校验：round, agentId, content, citations, stance, keyPoint
- 写入 debates 表
- 返回：{ success: true, debateId }

**3.3 POST /api/pipeline/tasks/[taskId]/complete**
- Zod 校验：status, commits, decisions, blockers, note, selfCheck
- 更新 tasks 表（status, result, completed_at）
- 返回：{ success: true }

**3.4 POST /api/pipeline/agents/[agentId]/logs**
- Zod 校验：projectId, phaseId, taskId(可选), type, content, metadata, visibility
- 写入 agent_logs 表
- 返回：{ success: true }

### Step 4：SSE 推送

**4.1 GET /api/pipeline/events/stream**
- 实现 EventSource 兼容的 SSE 端点
- 每个事件带 `id` 字段（events 表自增 ID）
- 支持 `Last-Event-ID` 断线恢复
- 从 EventBus 订阅事件并推送

EventBus 定义在 `packages/domain/src/events/bus.ts`（编排层是事件生产者，EventBus 属于核心领域逻辑）。SSE 端点从 `@kaiwu/domain` 导入 EventBus 并 subscribe。

- `packages/domain/src/events/bus.ts`：内存级发布/订阅
- `packages/domain/src/events/emitter.ts`：`emitEvent()` = 写入 events 表 + publish 到 bus

### Step 5：OpenClaw Tool 封装

为每个 Route Handler 封装对应的 OpenClaw Tool。Tool 内部调用 localhost API，Agent 不需要知道 HTTP 细节。

每个 Tool 的结构：

```ts
// packages/openclaw/src/tools/getMyStats.ts
import { defineTool } from "@openclaw/sdk"

export const getMyStats = defineTool({
  name: "getMyStats",
  description: "读取我的属性面板",
  async execute(ctx) {
    const res = await fetch(`http://127.0.0.1:3000/api/pipeline/agents/${ctx.agentId}/stats`)
    return res.json()
  },
})
```

按以下顺序实现：
1. `getMyStats.ts` — 最简单，验证 Tool 封装模式
2. `getProjectContext.ts`
3. `getDebateHistory.ts`
4. `getMyTasks.ts`
5. `getMyMemories.ts` — 调用 OpenClaw 原生 memory_search
6. `submitOutput.ts` — 通用提交（scout/council/architect/inspector/deployer）
7. `submitDebateSpeech.ts`
8. `completeTask.ts`
9. `writeLog.ts`

### Step 6：Zod Schema 定义

文件：`apps/site/src/lib/schemas/`

为每个写入接口定义 Zod schema：

- `scoutReportSchema.ts` — 采风报告（含 background + dimensions + score）
- `debateSpeechSchema.ts` — 辩论发言
- `verdictSchema.ts` — 裁决书
- `blueprintSchema.ts` — 蓝图
- `taskCompleteSchema.ts` — 任务完成报告
- `deployReportSchema.ts` — 鸣锣报告
- `agentLogSchema.ts` — Agent 日志

Schema 定义严格按照 `Agent工作区设计/各角色/TOOLS.md` 中的输出格式。

## 验收标准

- [ ] 所有读取接口可通过 curl 测试返回正确数据
- [ ] 所有写入接口可通过 curl 测试写入数据库
- [ ] SSE 端点可连接，写入 events 表后客户端收到推送
- [ ] SSE 断线恢复（Last-Event-ID）正常工作
- [ ] 所有 OpenClaw Tool 可在 Agent session 中调用
- [ ] 写入接口的 Zod 校验能拦截非法请求（返回 400）
- [ ] `pnpm typecheck` 通过

## 参考文档

- `design/Agent工作区设计/API.md` — 完整的端点设计、请求/响应格式、Tool 封装示例
- `design/Agent工作区设计/各角色/TOOLS.md` — 各 Agent 的输出格式（Zod schema 来源）
- `design/技术架构.md → 实时推送` — SSE 设计、断线恢复、延迟预期
