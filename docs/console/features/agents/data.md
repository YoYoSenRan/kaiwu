# 数据与状态 — Agent 管理

## 数据源

| 页面     | 数据源                            | 方式                             |
| -------- | --------------------------------- | -------------------------------- |
| 列表页   | DB agents 表                      | Server Component 直查            |
| 详情概览 | DB agents 表 + Gateway 实时状态   | Server Component + Zustand store |
| 文件 Tab | OpenClaw workspace 本地文件系统   | Server Action 读写文件           |
| 任务 Tab | DB production_tasks 表            | Server Component 直查            |
| 消耗 Tab | DB（待定，可能需要 token 统计表） | Server Component 直查            |

## DB agents 表结构（调整后）

```ts
export const agents = pgTable("agents", {
  /** Agent 标识符，同步自 openclaw.json */
  id: text("id").primaryKey(),
  /** 展示名称，同步自 openclaw.json 或模板 manifest */
  name: text("name").notNull(),
  /** 流水线逻辑角色：triage / planning / review / dispatch / execute / publish */
  stageType: text("stage_type").notNull(),
  /** execute 阶段的细分角色：code / doc / data / audit / infra / hr */
  subRole: text("sub_role"),
  /** 当前使用的模型 ID */
  model: text("model"),
  /** 运行时状态：online / idle / offline / error */
  status: text("status").notNull().default("offline"),
  /** 最后活跃时间 */
  lastSeenAt: timestamp("last_seen_at"),
  /** openclaw.json 中该 agent 的完整配置（兜底字段） */
  config: jsonb("config").notNull().default({}),
  /** 是否启用 */
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
```

核心字段独立列（name、model、status、lastSeenAt），其余配置放 `config` JSONB 兜底。OpenClaw 新增字段自动落入 config，不需要改表。

## 关键类型

```ts
interface AgentWithRealtime {
  /** DB 数据 */
  id: string
  name: string
  stageType: string
  subRole: string | null
  model: string | null
  isEnabled: boolean
  config: Record<string, unknown>
  /** 实时数据（来自 Gateway WebSocket） */
  realtimeStatus: "online" | "idle" | "offline" | "error"
  lastSeenAt: string | null
  currentTask: string | null
}

interface WorkspaceFile {
  filename: string
  label: string
  description: string
  content: string
  exists: boolean
}
```

## 实时状态获取

```
Gateway WebSocket
  ↓ tick / agent.status 事件
Zustand gatewayStore
  ↓ agentStatuses: Map<string, AgentRealtimeStatus>
Client Component 订阅
  ↓ 合并 DB 数据 + 实时状态
UI 渲染
```

### 状态判定规则

| 状态      | 条件                                 |
| --------- | ------------------------------------ |
| `online`  | Gateway 连接正常 + 2 分钟内有活动    |
| `idle`    | Gateway 连接正常 + 超过 2 分钟无活动 |
| `offline` | Gateway 断开 或 workspace 不存在     |
| `error`   | Gateway 报告该 Agent 异常            |

## 状态归属

| 状态             | 存放位置                        | 说明                   |
| ---------------- | ------------------------------- | ---------------------- |
| Agent 列表       | Server Component props          | SSR 直出               |
| Agent 实时状态   | Zustand store                   | Gateway WebSocket 推送 |
| 详情页当前 Tab   | URL searchParams `?tab=files`   | 可刷新、可分享         |
| 消耗时间维度     | URL searchParams `?period=week` | 可刷新、可分享         |
| 文件编辑内容     | 组件 state                      | AgentFileEditor 内部   |
| 文件保存 loading | 组件 state                      | AgentFileEditor 内部   |
