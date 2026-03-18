# Agent 数据接口设计

## 架构总览

```
┌─────────────────────────────────────────────────────┐
│                   OpenClaw Agent                     │
│                                                     │
│   useTool("getMyStats")                             │
│   useTool("submitOutput", { report })               │
│   useTool("getProjectContext", { projectId })       │
│                                                     │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              OpenClaw Tools 封装层                    │
│         packages/openclaw/src/tools/                 │
│                                                     │
│   把 HTTP 调用封装成 Agent 可直接使用的 tool          │
│   自动注入 agentId + 会话 token                      │
│                                                     │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (localhost)
                       ▼
┌─────────────────────────────────────────────────────┐
│              Route Handler (API 层)                  │
│         apps/site/src/app/api/pipeline/              │
│                                                     │
│   校验 token → 执行业务逻辑 → 读写数据库             │
│                                                     │
│   同时服务于：                                       │
│   - Agent tool 调用                                  │
│   - 展示网站 SSE 推送                                │
│   - 管理后台数据展示                                 │
│                                                     │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                   PostgreSQL                         │
│   agent_stats / phases / projects / events / ...     │
└─────────────────────────────────────────────────────┘
```

## 安全方案

### MVP 阶段：同机部署，最小暴露

- API 监听 `127.0.0.1`，外网不可达
- OpenClaw Gateway 和 Next.js 跑在同一台机器上
- 无需复杂认证，用内部 header `X-Agent-Id` 标识调用者即可

### 生产阶段：分布式部署

- 编排层调用 Agent 时下发一次性 session token（HMAC 签名，含 agentId + projectId + phaseId + 过期时间）
- Agent 提交产出时带上 token，Route Handler 校验签名和过期时间
- token 用完即废，不可重放

### 数据分级

| 级别 | 数据                                                   | 访问策略                 |
| ---- | ------------------------------------------------------ | ------------------------ |
| 公开 | Agent 属性、状态、辩论记录、采风报告、项目状态、事件流 | 无需认证，展示网站直接读 |
| 内部 | 阶段产出写入、状态流转、属性更新                       | 需要 session token       |
| 管理 | Agent 配置修改、流水线控制                             | 仅编排层，管理后台认证   |

### 防护措施

- **幂等性**：同一阶段产出只能提交一次，重复提交返回 409
- **来源校验**：写入接口校验 `X-Agent-Id` 与 token 中的 agentId 一致
- **速率限制**：单个 Agent 每分钟最多 30 次写入请求
- **输入校验**：所有写入接口用 Zod schema 校验请求体

---

## API 端点设计

### 读取接口（Agent 可用）

#### 获取自己的属性

```
GET /api/pipeline/agents/:agentId/stats
```

响应：

```json
{
  "agentId": "youshang",
  "level": 2,
  "levelName": "行脚期",
  "stats": [
    { "key": "嗅觉", "starLevel": 3, "rawValue": 0.72, "sampleSize": 8 },
    { "key": "脚力", "starLevel": 2, "rawValue": 0.65, "sampleSize": 8 }
  ],
  "specialStats": { "领域专长": { "工具类": 4, "社交类": 2, "电商类": 3 } }
}
```

#### 获取自己的记忆

> **注意**：MVP 阶段记忆走 OpenClaw 原生 `memory_search`，不走自建 Route Handler。`getMyMemories` Tool 直接调用 OpenClaw Gateway API，不经过 `/api/pipeline/`。后续如需自建记忆索引再迁移。

```
OpenClaw memory_search API（非自建端点）
```

响应（由 OpenClaw Gateway 返回）：

```json
{
  "memories": [
    { "id": "uuid", "type": "lesson", "content": "竞品分析不能只看大厂，小作坊往往更贴近用户", "domain": "工具类", "projectId": "uuid", "createdAt": "2026-03-15T10:00:00Z" }
  ]
}
```

#### 获取当前项目上下文

```
GET /api/pipeline/projects/:projectId/context
```

响应：

```json
{
  "project": { "id": "uuid", "keyword": "极简记账", "status": "debating", "currentPhase": "council" },
  "upstreamOutputs": { "scout": { "overallScore": 72, "verdict": "green", "...": "..." }, "council": null },
  "currentPhase": { "id": "uuid", "type": "council", "status": "in_progress", "input": { "scoutReport": "..." } }
}
```

#### 获取辩论记录（说客/诤臣/掌秤用）

```
GET /api/pipeline/phases/:phaseId/debates
```

响应：

```json
{ "debates": [{ "round": 1, "agentRole": "optimist", "content": "...", "citations": [], "stance": "support", "createdAt": "..." }] }
```

#### 获取任务列表（匠人用）

```
GET /api/pipeline/projects/:projectId/tasks?assignedTo=jiangren&status=pending
```

### 写入接口（需要 session token）

#### 提交阶段产出

```
POST /api/pipeline/phases/:phaseId/output
X-Agent-Id: youshang
X-Session-Token: <hmac-token>

Body: { 阶段产出 JSON，schema 因角色而异 }
```

响应：

```json
{ "success": true, "nextPhase": "council" }
```

#### 提交辩论发言

```
POST /api/pipeline/phases/:phaseId/debates
X-Agent-Id: shuike
X-Session-Token: <hmac-token>

Body: {
  "round": 1,
  "stance": "support",
  "content": "...",
  "citations": [...],
  "keyPoint": "..."
}
```

#### 提交任务完成报告

```
POST /api/pipeline/tasks/:taskId/complete
X-Agent-Id: jiangren
X-Session-Token: <hmac-token>

Body: {
  "commits": [...],
  "decisions": [...],
  "note": "..."
}
```

#### 写入日志

```
POST /api/pipeline/agents/:agentId/logs
X-Agent-Id: youshang
X-Session-Token: <hmac-token>

Body: {
  "projectId": "uuid",
  "phaseId": "uuid",
  "type": "thought | action | decision | error",
  "content": "...",
  "visibility": "public | internal"
}
```

---

## OpenClaw Tool 封装

每个 tool 对应一个或多个 API 端点，Agent 不需要知道 HTTP 细节。

### 通用 tool（所有角色可用）

| tool 名称           | 对应 API                    | 说明               |
| ------------------- | --------------------------- | ------------------ |
| `getMyStats`        | `GET /agents/:id/stats`     | 读取自己的属性     |
| `getMyMemories`     | `GET /agents/:id/memories`  | 读取自己的经验记忆 |
| `getProjectContext` | `GET /projects/:id/context` | 读取当前项目上下文 |
| `writeLog`          | `POST /agents/:id/logs`     | 写入思考/行动日志  |

### 角色专属 tool

| 角色      | tool 名称            | 对应 API                   | 说明         |
| --------- | -------------------- | -------------------------- | ------------ |
| 游商      | `submitScoutReport`  | `POST /phases/:id/output`  | 提交采风报告 |
| 说客      | `submitDebateSpeech` | `POST /phases/:id/debates` | 提交过堂发言 |
| 诤臣      | `submitDebateSpeech` | `POST /phases/:id/debates` | 提交过堂发言 |
| 说客/诤臣 | `getDebateHistory`   | `GET /phases/:id/debates`  | 读取辩论记录 |
| 掌秤      | `submitVerdict`      | `POST /phases/:id/output`  | 提交裁决     |
| 掌秤      | `getDebateHistory`   | `GET /phases/:id/debates`  | 读取辩论记录 |
| 画师      | `submitBlueprint`    | `POST /phases/:id/output`  | 提交蓝图     |
| 匠人      | `getMyTasks`         | `GET /projects/:id/tasks`  | 获取待办任务 |
| 匠人      | `completeTask`       | `POST /tasks/:id/complete` | 提交任务完成 |
| 试剑      | `submitReview`       | `POST /phases/:id/output`  | 提交审查报告 |
| 鸣锣      | `submitDeployReport` | `POST /phases/:id/output`  | 提交部署报告 |

### Tool 实现示例

```ts
// packages/openclaw/src/tools/getMyStats.ts
import { defineTool } from "@openclaw/sdk"

export const getMyStats = defineTool({
  name: "getMyStats",
  description: "读取我的属性面板——嗅觉、脚力、见闻、慧眼等当前星级和原始数据",

  async execute(ctx) {
    const res = await fetch(`http://127.0.0.1:3600/api/pipeline/agents/${ctx.agentId}/stats`)
    return res.json()
  },
})
```

```ts
// packages/openclaw/src/tools/submitScoutReport.ts
import { defineTool } from "@openclaw/sdk"
import { z } from "zod"

const ScoutReportSchema = z.object({
  keyword: z.string(),
  dimensions: z.object({
    /* ... */
  }),
  overallScore: z.number().min(0).max(100),
  verdict: z.enum(["green", "yellow", "red"]),
  privateNote: z.string().optional(),
})

export const submitScoutReport = defineTool({
  name: "submitScoutReport",
  description: "提交采风报告——把我在坊间摸到的底，正式交给编排层",
  input: ScoutReportSchema,

  async execute(ctx, input) {
    const res = await fetch(`http://127.0.0.1:3600/api/pipeline/phases/${ctx.phaseId}/output`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Agent-Id": ctx.agentId, "X-Session-Token": ctx.sessionToken },
      body: JSON.stringify(input),
    })
    return res.json()
  },
})
```

---

## 数据流完整示例：游商采风

```
1. 编排层检测到新物帖进入队列
   │
2. 编排层更新游商的 HEARTBEAT.md：
   │  "有新物帖等待采风：极简记账"
   │
3. 更鼓响起，OpenClaw 唤醒游商
   │
4. 游商读取 HEARTBEAT.md，发现有活
   │
5. 游商调用 getProjectContext(projectId)
   │  → 获取物帖详情和项目上下文
   │
6. 游商调用 getMyStats()
   │  → 读取自己的属性，发现"工具类"领域专长较高
   │  → 在采风时重点参考工具类历史数据
   │
7. 游商调用 getMyMemories({ domain: "工具类" })
   │  → 读取过往工具类项目的经验教训
   │
8. 游商调用 web_search / trend_analysis / competitor_scan
   │  → 执行实际的市场调研
   │
9. 游商调用 submitScoutReport({ ... })
   │  → 提交采风报告到数据库
   │
10. 游商调用 writeLog({ type: "thought", content: "这个赛道比我想的卷..." })
    │  → 记录思考过程，供展示网站展示
    │
11. 编排层收到产出，检查评分
    │  → ≥ 60：更新项目状态为 debating，更新说客/诤臣的 HEARTBEAT.md
    │  → < 60：更新项目状态为 dead，生成封存辞
    │
12. 编排层计算游商属性变化
    → 更新 agent_stats 表
```
