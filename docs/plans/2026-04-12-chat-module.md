# 对话模块 (P1) 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 kaiwu 的对话模块 P1——支持单 agent 对话和圆桌讨论模式，包含完整的三栏 UI、本地编排引擎、上下文预算管理和 OpenClaw 插件扩展。

**Architecture:** Renderer 三栏页面通过 IPC 调用 Main Process 的 chat feature；chat feature 使用独立的 engine 层调度 agent（通过 gateway WebSocket RPC）；OpenClaw 插件在 agent 推理前注入共享上下文和知识库。数据持久化到 SQLite。

**Tech Stack:** Electron + React 19 + TypeScript + Tailwind CSS + zustand + drizzle-orm + better-sqlite3 + zod + OpenClaw gateway WebSocket RPC

**Spec:** `docs/specs/2026-04-12-chat-module-design.md`

---

## 文件清单

### 新建文件

**数据库迁移：**

- `electron/db/migrations/0003_create_chat_tables.sql` — 三张表 DDL

**Engine 层 (`electron/engine/`)：**

- `electron/engine/types.ts` — 引擎接口、配置 schema、类型定义
- `electron/engine/context.ts` — 上下文预算计算 + StageContext 组装
- `electron/engine/runner.ts` — agent 执行器（调 gateway + 流式管理）
- `electron/engine/strategy.ts` — 轮转策略（sequential / random / adaptive）

**Chat Feature (`electron/features/chat/`)：**

- `electron/features/chat/channels.ts` — IPC channel 常量
- `electron/features/chat/types.ts` — Bridge 接口类型
- `electron/features/chat/service.ts` — 对话 CRUD + 消息存取
- `electron/features/chat/orchestrator.ts` — 编排逻辑（单 agent + 圆桌）
- `electron/features/chat/ipc.ts` — setupChat() 注册 ipcMain.handle
- `electron/features/chat/bridge.ts` — preload 暴露给 renderer

**Renderer Store：**

- `app/stores/chat.ts` — 对话状态管理

**Renderer 页面 (`app/pages/chat/`)：**

- `app/pages/chat/index.tsx` — 页面入口（三栏布局）
- `app/pages/chat/components/list.tsx` — 对话列表（左栏）
- `app/pages/chat/components/messages.tsx` — 消息列表 + 气泡
- `app/pages/chat/components/input.tsx` — 消息输入框
- `app/pages/chat/components/panel.tsx` — 信息面板（右栏）
- `app/pages/chat/components/header.tsx` — 聊天区头部
- `app/pages/chat/components/create.tsx` — 新建对话弹窗

### 修改文件

- `electron/db/schema.ts` — 新增三张表的 drizzle schema
- `electron/main.ts` — 添加 `setupChat()` 调用
- `electron/preload.ts` — 添加 `chatBridge` 到 api
- `app/App.tsx` — 更新 Chat 路由指向新页面
- `app/i18n/locales/zh-CN.json` — 添加 chat 模块翻译键
- `app/i18n/locales/en.json` — 添加 chat 模块翻译键
- `plugins/kaiwu/src/context/contract.ts` — StageContext 加 sharedHistory
- `plugins/kaiwu/src/context/hook.ts` — hook 注入 sharedHistory

---

## Task 1: 数据库 Schema + 迁移

**Files:**

- Create: `electron/db/migrations/0003_create_chat_tables.sql`
- Modify: `electron/db/schema.ts`

- [ ] **Step 1: 查看现有迁移文件命名**

Run: `ls electron/db/migrations/`
确认最新编号，下一个用 `0003`（或实际的下一个编号）。

- [ ] **Step 2: 创建迁移 SQL**

Create `electron/db/migrations/0003_create_chat_tables.sql`:

```sql
CREATE TABLE IF NOT EXISTS chats (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  mode        TEXT NOT NULL DEFAULT 'single',
  status      TEXT NOT NULL DEFAULT 'active',
  config      TEXT NOT NULL DEFAULT '{}',
  metadata    TEXT NOT NULL DEFAULT '{}',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id               TEXT PRIMARY KEY,
  chat_id          TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_type      TEXT NOT NULL,
  sender_agent_id  TEXT,
  content          TEXT NOT NULL,
  metadata         TEXT NOT NULL DEFAULT '{}',
  created_at       INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat
  ON chat_messages(chat_id, created_at);

CREATE TABLE IF NOT EXISTS chat_members (
  chat_id     TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  agent_id    TEXT NOT NULL,
  session_key TEXT,
  config      TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (chat_id, agent_id)
);
```

- [ ] **Step 3: 添加 drizzle schema 定义**

在 `electron/db/schema.ts` 末尾添加三张表的 drizzle 定义，匹配现有 schema 的 snake_case 风格和 `sqliteTable` 用法。参考文件中 `agents` 表的定义模式。

```typescript
export const chats = sqliteTable("chats", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  mode: text("mode", { enum: ["single", "roundtable", "pipeline", "debate", "delegation"] })
    .notNull()
    .default("single"),
  status: text("status", { enum: ["active", "paused", "completed", "archived"] })
    .notNull()
    .default("active"),
  config: text("config").notNull().default("{}"),
  metadata: text("metadata").notNull().default("{}"),
  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
})

export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: text("id").primaryKey(),
    chat_id: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    sender_type: text("sender_type", { enum: ["user", "agent", "system"] }).notNull(),
    sender_agent_id: text("sender_agent_id"),
    content: text("content").notNull(),
    metadata: text("metadata").notNull().default("{}"),
    created_at: integer("created_at").notNull(),
  },
  (table) => [index("idx_chat_messages_chat").on(table.chat_id, table.created_at)],
)

export const chatMembers = sqliteTable(
  "chat_members",
  {
    chat_id: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    agent_id: text("agent_id").notNull(),
    session_key: text("session_key"),
    config: text("config").notNull().default("{}"),
  },
  (table) => [primaryKey({ columns: [table.chat_id, table.agent_id] })],
)
```

- [ ] **Step 4: 验证**

Run: `pnpm lint`
Expected: PASS，无错误。

- [ ] **Step 5: 启动应用验证迁移**

Run: `pnpm dev`
观察控制台无迁移错误。打开 DevTools 确认表已创建（或用 sqlite CLI 检查 `kaiwu.db`）。

- [ ] **Step 6: Commit**

```bash
git add electron/db/migrations/0003_create_chat_tables.sql electron/db/schema.ts
git commit -m "$(cat <<'EOF'
feat: 添加对话模块数据表（chats / chat_messages / chat_members）
EOF
)"
```

---

## Task 2: Engine 类型与配置 Schema

**Files:**

- Create: `electron/engine/types.ts`

- [ ] **Step 1: 创建 engine 目录和类型文件**

Create `electron/engine/types.ts`——引擎的所有类型定义和 zod schema：

```typescript
import { z } from "zod"

// ---------- 上下文预算配置 ----------

/** 对话配置 schema，JSON 字段用 zod 校验。所有字段都有 default，老数据自动兼容。 */
export const chatConfigSchema = z.object({
  historyBudget: z.number().default(40),
  knowledgeBudget: z.number().default(20),
  memoryBudget: z.number().default(10),
  systemReserved: z.number().default(30),
  historyStrategy: z.enum(["recent", "summary", "full"]).default("recent"),
  historyMaxMessages: z.number().default(20),
  knowledgeIds: z.array(z.string()).default([]),
  knowledgeMaxChunks: z.number().default(5),
  knowledgeMinRelevance: z.number().default(0.7),
  turnStrategy: z.enum(["sequential", "random", "adaptive"]).default("sequential"),
  maxRounds: z.number().default(5),
  autoStop: z.boolean().default(true),
})

export type ChatConfig = z.infer<typeof chatConfigSchema>

/** 三层合并后的最终配置。 */
export type ResolvedConfig = ChatConfig

// ---------- Token 用量 ----------

export interface TokenUsage {
  input?: number
  output?: number
  total?: number
}

// ---------- Engine 运行参数 ----------

/** 单次 agent 调用的参数。 */
export interface EngineRunParams {
  sessionKey: string
  agentId: string
  message: string
  config: ResolvedConfig
  chatId: string
  onDelta: (text: string) => void
  onFinal: (message: string, usage: TokenUsage) => void
  onError: (error: Error) => void
  signal?: AbortSignal
}

/** 推送给插件的阶段上下文。 */
export interface EngineStageContext {
  instruction: string
  knowledge: string[]
  sharedHistory?: string
}

// ---------- 轮转策略 ----------

export type TurnStrategy = ChatConfig["turnStrategy"]

/** 轮转决策结果。 */
export interface TurnDecision {
  agentId: string
  sessionKey: string
}
```

- [ ] **Step 2: 验证**

Run: `pnpm lint`
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
git add electron/engine/types.ts
git commit -m "$(cat <<'EOF'
feat: 定义编排引擎类型和上下文预算 schema
EOF
)"
```

---

## Task 3: Engine 上下文构建器

**Files:**

- Create: `electron/engine/context.ts`

- [ ] **Step 1: 实现上下文构建逻辑**

Create `electron/engine/context.ts`——负责三层配置合并和 StageContext 组装：

```typescript
import { chatConfigSchema } from "./types"
import type { ChatConfig, EngineStageContext, ResolvedConfig } from "./types"

/** 全局默认配置，所有字段由 zod default 填充。 */
export const GLOBAL_DEFAULTS: ChatConfig = chatConfigSchema.parse({})

/**
 * 三层合并配置：全局默认 → 对话级 → 成员级。
 * @param chatConfig 对话级 JSON（来自 chats.config）
 * @param memberConfig 成员级 JSON（来自 chat_members.config，可选）
 */
export function resolveConfig(chatConfig: string, memberConfig?: string): ResolvedConfig {
  const chat = safeParseJson(chatConfig)
  const member = memberConfig ? safeParseJson(memberConfig) : {}
  return chatConfigSchema.parse({ ...chat, ...member })
}

/**
 * 组装推送给插件的阶段上下文。
 * @param role agent 在此对话中的角色描述
 * @param knowledge 检索到的知识库片段
 * @param sharedMessages 共享对话历史（已格式化的文本）
 */
export function buildStageContext(role: string | undefined, knowledge: string[], sharedMessages?: string): EngineStageContext {
  return {
    instruction: role ?? "",
    knowledge,
    sharedHistory: sharedMessages,
  }
}

/**
 * 将共享消息列表格式化为带 XML 标签的文本块。
 * @param messages 消息列表，每条包含 senderLabel 和 content
 */
export function formatSharedTranscript(messages: Array<{ senderLabel: string; content: string }>): string {
  if (messages.length === 0) return ""
  const lines = messages.map((m) => `[${m.senderLabel}] ${m.content}`)
  return "<共享对话记录>\n" + lines.join("\n") + "\n</共享对话记录>"
}

function safeParseJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}
```

- [ ] **Step 2: 验证**

Run: `pnpm lint`
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
git add electron/engine/context.ts
git commit -m "$(cat <<'EOF'
feat: 实现上下文预算三层合并和 StageContext 组装
EOF
)"
```

---

## Task 4: Engine Runner

**Files:**

- Create: `electron/engine/runner.ts`

- [ ] **Step 1: 查看 gateway 客户端 API**

Read `electron/features/openclaw/gateway/client.ts` 确认 `request()` 和 `onChatEvent()` 的签名，以及 `ChatSendParams` / `ChatEvent` 的具体结构。还要看 `electron/features/openclaw/service.ts` 中现有的 chat.send 调用方式。

- [ ] **Step 2: 查看插件调用方式**

Read `electron/features/openclaw/` 中如何调用 `invokePlugin`（即 `stage.set` action），确认现有的通信方式。

- [ ] **Step 3: 实现 runner**

Create `electron/engine/runner.ts`——封装 gateway chat.send + 流式事件监听 + 插件上下文推送：

```typescript
import type { EngineRunParams, EngineStageContext } from "./types"

// 依赖由调用方注入，engine 不直接 import features
export interface EngineRuntime {
  /** 调用 gateway chat.send RPC。 */
  chatSend(sessionKey: string, message: string): Promise<{ runId: string }>
  /** 调用 gateway chat.abort RPC。 */
  chatAbort(sessionKey: string, runId?: string): Promise<void>
  /** 订阅 chat 事件流，返回取消函数。 */
  onChatEvent(sessionKey: string, listener: (event: { state: string; message?: string; errorMessage?: string; usage?: unknown }) => void): () => void
  /** 推送阶段上下文到插件。 */
  pushStageContext(sessionKey: string, ctx: EngineStageContext): Promise<void>
  /** 清除阶段上下文。 */
  clearStageContext(sessionKey: string): Promise<void>
}

/**
 * 执行一次 agent 调用：推送上下文 → chat.send → 监听流式响应。
 * @param runtime 注入的 gateway/plugin 运行时
 * @param params 运行参数
 */
export async function runAgent(runtime: EngineRuntime, params: EngineRunParams): Promise<void> {
  const { sessionKey, message, onDelta, onFinal, onError, signal } = params

  if (signal?.aborted) {
    onError(new Error("aborted"))
    return
  }

  let runId: string | undefined
  let unsubscribe: (() => void) | undefined

  try {
    const { runId: rid } = await runtime.chatSend(sessionKey, message)
    runId = rid

    // 如果在发送后立即被取消
    if (signal?.aborted) {
      await runtime.chatAbort(sessionKey, runId)
      onError(new Error("aborted"))
      return
    }

    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        runtime.chatAbort(sessionKey, runId).catch(() => {})
        reject(new Error("aborted"))
      }
      signal?.addEventListener("abort", onAbort, { once: true })

      unsubscribe = runtime.onChatEvent(sessionKey, (event) => {
        switch (event.state) {
          case "delta":
            if (event.message) onDelta(event.message)
            break
          case "final":
            onFinal(event.message ?? "", parseUsage(event.usage))
            signal?.removeEventListener("abort", onAbort)
            resolve()
            break
          case "error":
            reject(new Error(event.errorMessage ?? "agent error"))
            break
          case "aborted":
            reject(new Error("agent aborted"))
            break
        }
      })
    })
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)))
  } finally {
    unsubscribe?.()
    runtime.clearStageContext(sessionKey).catch(() => {})
  }
}

function parseUsage(raw: unknown): { input?: number; output?: number; total?: number } {
  if (!raw || typeof raw !== "object") return {}
  const u = raw as Record<string, unknown>
  return {
    input: typeof u.input === "number" ? u.input : undefined,
    output: typeof u.output === "number" ? u.output : undefined,
    total: typeof u.total === "number" ? u.total : undefined,
  }
}
```

- [ ] **Step 4: 验证**

Run: `pnpm lint`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add electron/engine/runner.ts
git commit -m "$(cat <<'EOF'
feat: 实现引擎 runner——封装 gateway 调用和流式响应管理
EOF
)"
```

---

## Task 5: Engine 轮转策略

**Files:**

- Create: `electron/engine/strategy.ts`

- [ ] **Step 1: 实现轮转策略**

Create `electron/engine/strategy.ts`：

```typescript
import type { TurnDecision, TurnStrategy } from "./types"

interface Member {
  agentId: string
  sessionKey: string
}

/**
 * 根据策略决定下一个发言者。
 * @param strategy 轮转策略
 * @param members 参与者列表（按 sort_order 排列）
 * @param lastSpeakerIndex 上一个发言者的索引，-1 表示还没人发言
 */
export function nextSpeaker(strategy: TurnStrategy, members: Member[], lastSpeakerIndex: number): TurnDecision {
  if (members.length === 0) throw new Error("no members")

  switch (strategy) {
    case "sequential":
      return pickSequential(members, lastSpeakerIndex)
    case "random":
      return pickRandom(members)
    case "adaptive":
      // P1 先用 sequential 兜底，后续可接入 LLM 判断
      return pickSequential(members, lastSpeakerIndex)
  }
}

/**
 * 判断当前轮次是否已完成（所有人都发言了一轮）。
 * @param memberCount 参与者总数
 * @param speakerIndex 当前发言者索引
 */
export function isRoundComplete(memberCount: number, speakerIndex: number): boolean {
  return speakerIndex >= memberCount - 1
}

function pickSequential(members: Member[], lastIndex: number): TurnDecision {
  const next = (lastIndex + 1) % members.length
  return { agentId: members[next].agentId, sessionKey: members[next].sessionKey }
}

function pickRandom(members: Member[]): TurnDecision {
  const idx = Math.floor(Math.random() * members.length)
  return { agentId: members[idx].agentId, sessionKey: members[idx].sessionKey }
}
```

- [ ] **Step 2: 验证**

Run: `pnpm lint`
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
git add electron/engine/strategy.ts
git commit -m "$(cat <<'EOF'
feat: 实现多 agent 轮转策略（sequential / random / adaptive）
EOF
)"
```

---

## Task 6: 插件扩展（StageContext + hook）

**Files:**

- Modify: `plugins/kaiwu/src/context/contract.ts`
- Modify: `plugins/kaiwu/src/context/hook.ts`

- [ ] **Step 1: 扩展 StageContext 类型**

在 `plugins/kaiwu/src/context/contract.ts` 的 `StageContext` 接口中添加 `sharedHistory` 字段，在 `StageSetParams` 中也添加对应字段：

```typescript
// StageContext 新增字段
/** 共享对话历史 → prependContext（用户消息前面，每轮发送）。 */
sharedHistory?: string

// StageSetParams 新增字段
/** 共享对话历史。空字符串或省略表示本阶段无共享历史。 */
sharedHistory?: string
```

- [ ] **Step 2: 更新 store 写入**

在 `plugins/kaiwu/src/context/route.ts` 的 `handleStageSet` 中，把 `sharedHistory` 也写入 store：

```typescript
setStageContext(p.sessionKey, {
  instruction: p.instruction ?? "",
  knowledge: p.knowledge ?? [],
  sharedHistory: p.sharedHistory,
})
```

- [ ] **Step 3: 更新 hook 注入逻辑**

修改 `plugins/kaiwu/src/context/hook.ts` 的 `createPromptHook`，把 `sharedHistory` 和 `knowledge` 合并注入到 `prependContext`：

```typescript
export function createPromptHook(): (_event: unknown, ctx: unknown) => PromptBuildResult | undefined {
  return (_event, ctx) => {
    const { sessionKey } = ctx as PromptBuildContext
    if (!sessionKey) return undefined
    const data = getStageContext(sessionKey)
    if (!data) return undefined

    const result: PromptBuildResult = {}

    if (data.instruction) {
      result.appendSystemContext = data.instruction
    }

    const prependParts: string[] = []
    if (data.sharedHistory) prependParts.push(data.sharedHistory)
    if (data.knowledge.length > 0) prependParts.push(formatKnowledge(data.knowledge))
    if (prependParts.length > 0) {
      result.prependContext = prependParts.join("\n\n")
    }

    return result
  }
}
```

- [ ] **Step 4: 验证**

进入插件目录检查语法：
Run: `cd plugins/kaiwu && npx tsc --noEmit`
Expected: PASS（如果有 tsconfig 的话），或者用 `pnpm lint` 全局检查。

- [ ] **Step 5: Commit**

```bash
git add plugins/kaiwu/src/context/contract.ts plugins/kaiwu/src/context/hook.ts plugins/kaiwu/src/context/route.ts
git commit -m "$(cat <<'EOF'
feat: 插件支持注入共享对话历史到 agent 上下文
EOF
)"
```

---

## Task 7: Chat Feature — channels + types

**Files:**

- Create: `electron/features/chat/channels.ts`
- Create: `electron/features/chat/types.ts`

- [ ] **Step 1: 定义 IPC 通道**

Create `electron/features/chat/channels.ts`，参照 `electron/features/agent/channels.ts` 的风格：

```typescript
export const chatChannels = {
  list: "chat:list",
  create: "chat:create",
  delete: "chat:delete",
  detail: "chat:detail",
  updateConfig: "chat:update-config",
  messages: {
    list: "chat:messages:list",
    send: "chat:messages:send",
    stream: "chat:messages:stream",
  },
  members: {
    list: "chat:members:list",
    add: "chat:members:add",
    remove: "chat:members:remove",
  },
  roundtable: {
    start: "chat:roundtable:start",
    pause: "chat:roundtable:pause",
    resume: "chat:roundtable:resume",
    stop: "chat:roundtable:stop",
  },
  abort: "chat:abort",
  event: "chat:event",
} as const
```

- [ ] **Step 2: 定义 Bridge 接口类型**

Create `electron/features/chat/types.ts`，参照 `electron/features/agent/types.ts` 风格：

```typescript
import type { TokenUsage } from "../../engine/types"

// ---------- 数据行类型 ----------

export interface ChatRow {
  id: string
  title: string
  mode: ChatMode
  status: ChatStatus
  config: string
  metadata: string
  created_at: number
  updated_at: number
  lastMessage?: string
  memberCount?: number
}

export type ChatMode = "single" | "roundtable" | "pipeline" | "debate" | "delegation"
export type ChatStatus = "active" | "paused" | "completed" | "archived"

export interface ChatMessageRow {
  id: string
  chat_id: string
  sender_type: "user" | "agent" | "system"
  sender_agent_id: string | null
  content: string
  metadata: string
  created_at: number
}

export interface ChatMemberRow {
  chat_id: string
  agent_id: string
  session_key: string | null
  config: string
}

// ---------- 输入类型 ----------

export interface ChatCreateInput {
  title: string
  mode: ChatMode
  agentIds: string[]
  config?: Record<string, unknown>
}

export interface ChatSendInput {
  chatId: string
  content: string
}

export interface ChatMemberAddInput {
  chatId: string
  agentId: string
  config?: Record<string, unknown>
}

// ---------- 事件类型（主进程 → 渲染进程推送） ----------

export interface ChatStreamEvent {
  chatId: string
  messageId: string
  agentId: string
  type: "delta" | "final" | "error"
  content?: string
  usage?: TokenUsage
  error?: string
}

export interface ChatRoundtableEvent {
  chatId: string
  type: "round-start" | "turn-start" | "turn-end" | "round-end" | "stopped" | "paused" | "resumed"
  round?: number
  agentId?: string
}

// ---------- Bridge 接口 ----------

export interface ChatBridge {
  list: () => Promise<ChatRow[]>
  create: (input: ChatCreateInput) => Promise<ChatRow>
  delete: (id: string) => Promise<void>
  detail: (id: string) => Promise<ChatRow>
  updateConfig: (id: string, config: Record<string, unknown>) => Promise<void>
  messages: {
    list: (chatId: string) => Promise<ChatMessageRow[]>
    send: (input: ChatSendInput) => Promise<void>
  }
  members: {
    list: (chatId: string) => Promise<ChatMemberRow[]>
    add: (input: ChatMemberAddInput) => Promise<void>
    remove: (chatId: string, agentId: string) => Promise<void>
  }
  roundtable: {
    start: (chatId: string, topic: string) => Promise<void>
    pause: (chatId: string) => Promise<void>
    resume: (chatId: string) => Promise<void>
    stop: (chatId: string) => Promise<void>
  }
  abort: (chatId: string) => Promise<void>
  on: {
    stream: (listener: (event: ChatStreamEvent) => void) => () => void
    roundtable: (listener: (event: ChatRoundtableEvent) => void) => () => void
  }
}
```

- [ ] **Step 3: 验证**

Run: `pnpm lint`
Expected: PASS。

- [ ] **Step 4: Commit**

```bash
git add electron/features/chat/channels.ts electron/features/chat/types.ts
git commit -m "$(cat <<'EOF'
feat: 定义对话模块 IPC 通道和 Bridge 接口类型
EOF
)"
```

---

## Task 8: Chat Feature — service（CRUD）

**Files:**

- Create: `electron/features/chat/service.ts`

- [ ] **Step 1: 查看现有 service 模式**

Read `electron/features/agent/service.ts` 了解 drizzle 查询风格、ID 生成方式（crypto.randomUUID 或其他）、错误处理模式。

- [ ] **Step 2: 实现 service**

Create `electron/features/chat/service.ts`——对话 CRUD + 消息读写 + 成员管理。不 import `ipcMain` / `BrowserWindow`，纯业务逻辑。

核心函数清单：

- `listChats(): Promise<ChatRow[]>` — 按 updated_at 降序
- `createChat(input: ChatCreateInput): Promise<ChatRow>` — 创建对话 + 批量插入 members
- `deleteChat(id: string): Promise<void>` — CASCADE 自动删消息和成员
- `getChat(id: string): Promise<ChatRow>` — 单条查询
- `updateChatConfig(id: string, config: Record<string, unknown>): Promise<void>` — 合并更新 config JSON
- `listMessages(chatId: string): Promise<ChatMessageRow[]>` — 按 created_at 升序
- `insertMessage(chatId, senderType, senderAgentId, content, metadata?): Promise<ChatMessageRow>` — 插入消息
- `listMembers(chatId: string): Promise<ChatMemberRow[]>` — 查询成员
- `addMember(input: ChatMemberAddInput): Promise<void>` — 添加成员
- `removeMember(chatId, agentId): Promise<void>` — 移除成员

每个函数都需要 JSDoc 注释（按 comments.md 规范）。ID 用 `crypto.randomUUID()`。时间戳用 `Date.now()`。

- [ ] **Step 3: 验证**

Run: `pnpm lint`
Expected: PASS。

- [ ] **Step 4: Commit**

```bash
git add electron/features/chat/service.ts
git commit -m "$(cat <<'EOF'
feat: 实现对话模块 service 层（CRUD + 消息 + 成员管理）
EOF
)"
```

---

## Task 9: Chat Feature — orchestrator

**Files:**

- Create: `electron/features/chat/orchestrator.ts`

- [ ] **Step 1: 实现编排器**

Create `electron/features/chat/orchestrator.ts`——调用 engine 编排对话。核心职责：

1. **单 agent 对话**：`sendMessage(chatId, content)` → 保存用户消息 → engine.runAgent → 保存回复
2. **圆桌讨论**：`startRoundtable(chatId, topic)` → 循环调 engine.runAgent → 管理轮次
3. **中断控制**：AbortController 管理，暂停/恢复/停止

关键实现点：

- 维护一个 `Map<string, AbortController>` 追踪活跃对话
- 单 agent 发送时：保存用户消息 → resolveConfig → buildStageContext → pushStageContext → runAgent → 保存 agent 回复
- 圆桌讨论时：外层 for 循环 rounds，内层 for 循环 members（通过 strategy.nextSpeaker），每轮结束检查 isRoundComplete
- 通过回调函数通知上层（ipc.ts）各种事件（delta / final / round-start 等），不直接操作 IPC
- 暂停通过 Promise + resolve 模式实现

```typescript
import type { EngineRuntime } from "../../engine/runner"
import type { ChatStreamEvent, ChatRoundtableEvent } from "./types"

interface OrchestratorCallbacks {
  onStream: (event: ChatStreamEvent) => void
  onRoundtable: (event: ChatRoundtableEvent) => void
}

export function createOrchestrator(
  runtime: EngineRuntime,
  callbacks: OrchestratorCallbacks,
): ChatOrchestrator { ... }

export interface ChatOrchestrator {
  sendMessage(chatId: string, content: string): Promise<void>
  startRoundtable(chatId: string, topic: string): Promise<void>
  pauseRoundtable(chatId: string): void
  resumeRoundtable(chatId: string): void
  stopRoundtable(chatId: string): void
  abort(chatId: string): void
}
```

- [ ] **Step 2: 验证**

Run: `pnpm lint`
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
git add electron/features/chat/orchestrator.ts
git commit -m "$(cat <<'EOF'
feat: 实现对话编排器（单 agent + 圆桌讨论）
EOF
)"
```

---

## Task 10: Chat Feature — IPC + Bridge + 注册

**Files:**

- Create: `electron/features/chat/ipc.ts`
- Create: `electron/features/chat/bridge.ts`
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`

- [ ] **Step 1: 实现 ipc.ts**

Create `electron/features/chat/ipc.ts`——`setupChat()` 函数注册所有 handler。参照 `electron/features/agent/ipc.ts` 风格。

关键点：

- 用 `safeHandle` 包装每个 handler（来自 `electron/core/ipc.ts`）
- stream 和 roundtable 事件通过 `mainWindow.webContents.send` 推送（需要获取 window 引用）
- 创建 EngineRuntime 实例（桥接 gateway client 和 plugin invoke）
- 创建 orchestrator 实例

- [ ] **Step 2: 实现 bridge.ts**

Create `electron/features/chat/bridge.ts`——参照 `electron/features/agent/bridge.ts`。

关键点：

- 普通方法用 `ipcRenderer.invoke`
- stream/roundtable 事件用 `ipcRenderer.on`，返回取消函数
- 不创建 index.ts barrel

- [ ] **Step 3: 注册到 main.ts**

在 `electron/main.ts` 的 `app.whenReady()` 中，在现有 `setupAgent()` 等调用后面添加 `setupChat()`。注意 import 路径直接指向 `./features/chat/ipc`。

- [ ] **Step 4: 注册到 preload.ts**

在 `electron/preload.ts` 中，import `chatBridge` 并添加到 `api` 对象中。按 imports.md 的行长升序规则插入。

- [ ] **Step 5: 验证**

Run: `pnpm lint`
Run: `pnpm dev`
Expected: 应用正常启动，无崩溃。DevTools console 无 IPC 注册错误。

- [ ] **Step 6: Commit**

```bash
git add electron/features/chat/ipc.ts electron/features/chat/bridge.ts electron/main.ts electron/preload.ts
git commit -m "$(cat <<'EOF'
feat: 注册对话模块 IPC handler 和 bridge
EOF
)"
```

---

## Task 11: Renderer — Chat Store

**Files:**

- Create: `app/stores/chat.ts`

- [ ] **Step 1: 实现 chat store**

Create `app/stores/chat.ts`——zustand store，不持久化（业务数据不走 localStorage）。参照 `app/stores/agents.ts` 风格。

```typescript
import { create } from "zustand"
import type { ChatRow, ChatMessageRow, ChatMemberRow, ChatStreamEvent, ChatRoundtableEvent } from "../../electron/features/chat/types"

interface ChatState {
  // 对话列表
  chats: ChatRow[]
  activeId: string | null
  loading: boolean

  // 当前对话的消息和成员
  messages: ChatMessageRow[]
  members: ChatMemberRow[]

  // 流式状态
  streamingMessageId: string | null
  streamingContent: string

  // 圆桌状态
  roundtableStatus: "idle" | "running" | "paused"
  currentRound: number
  currentSpeaker: string | null

  // Actions
  setChats: (chats: ChatRow[]) => void
  setActiveId: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setMessages: (messages: ChatMessageRow[]) => void
  setMembers: (members: ChatMemberRow[]) => void
  appendMessage: (message: ChatMessageRow) => void
  handleStreamEvent: (event: ChatStreamEvent) => void
  handleRoundtableEvent: (event: ChatRoundtableEvent) => void
  reset: () => void
}

export const useChatStore = create<ChatState>()((set) => ({
  chats: [],
  activeId: null,
  loading: false,
  messages: [],
  members: [],
  streamingMessageId: null,
  streamingContent: "",
  roundtableStatus: "idle",
  currentRound: 0,
  currentSpeaker: null,

  setChats: (chats) => set({ chats }),
  setActiveId: (id) => set({ activeId: id }),
  setLoading: (loading) => set({ loading }),
  setMessages: (messages) => set({ messages }),
  setMembers: (members) => set({ members }),
  appendMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),

  handleStreamEvent: (event) =>
    set((s) => {
      if (event.type === "delta") {
        return {
          streamingMessageId: event.messageId,
          streamingContent: s.streamingContent + (event.content ?? ""),
        }
      }
      if (event.type === "final") {
        return { streamingMessageId: null, streamingContent: "" }
      }
      if (event.type === "error") {
        return { streamingMessageId: null, streamingContent: "" }
      }
      return s
    }),

  handleRoundtableEvent: (event) =>
    set(() => {
      switch (event.type) {
        case "round-start":
          return { roundtableStatus: "running" as const, currentRound: event.round ?? 0 }
        case "turn-start":
          return { currentSpeaker: event.agentId ?? null }
        case "turn-end":
          return { currentSpeaker: null }
        case "stopped":
          return { roundtableStatus: "idle" as const, currentSpeaker: null }
        case "paused":
          return { roundtableStatus: "paused" as const }
        case "resumed":
          return { roundtableStatus: "running" as const }
        default:
          return {}
      }
    }),

  reset: () =>
    set({
      messages: [],
      members: [],
      streamingMessageId: null,
      streamingContent: "",
      roundtableStatus: "idle",
      currentRound: 0,
      currentSpeaker: null,
    }),
}))
```

- [ ] **Step 2: 验证**

Run: `pnpm lint`
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
git add app/stores/chat.ts
git commit -m "$(cat <<'EOF'
feat: 实现对话状态 store（zustand，含流式和圆桌状态管理）
EOF
)"
```

---

## Task 12: Renderer — i18n 翻译键

**Files:**

- Modify: `app/i18n/locales/zh-CN.json`
- Modify: `app/i18n/locales/en.json`

- [ ] **Step 1: 查看现有翻译键结构**

Read `app/i18n/locales/zh-CN.json` 了解键的层级结构和命名惯例。

- [ ] **Step 2: 添加 chat 模块翻译键**

在两个 locale 文件中添加 `chat` 块：

```json
{
  "chat": {
    "title": "对话",
    "description": "与 AI Agent 对话",
    "newChat": "新建对话",
    "search": "搜索对话...",
    "empty": "暂无对话",
    "startConversation": "开始对话",
    "inputPlaceholder": "输入消息...",
    "inputPlaceholderRoundtable": "插入观点或引导讨论方向...",
    "send": "发送",
    "abort": "中断",
    "mode": {
      "single": "单 Agent",
      "roundtable": "圆桌讨论",
      "pipeline": "流水线",
      "debate": "对抗辩论",
      "delegation": "委派协调"
    },
    "status": {
      "active": "进行中",
      "paused": "已暂停",
      "completed": "已完成",
      "archived": "已归档"
    },
    "roundtable": {
      "round": "第 {{n}} 轮",
      "speaking": "发言中...",
      "spoken": "已发言",
      "waiting": "待发言",
      "start": "开始讨论",
      "pause": "暂停",
      "resume": "继续",
      "stop": "停止"
    },
    "panel": {
      "agent": "Agent",
      "participants": "参与者",
      "contextBudget": "上下文预算",
      "history": "会话历史",
      "knowledge": "知识库",
      "memory": "Agent 记忆",
      "systemReserved": "系统保留",
      "linkedKnowledge": "关联知识库",
      "addKnowledge": "添加知识库",
      "orchestration": "编排参数",
      "turnStrategy": "轮转策略",
      "maxRounds": "最大轮次",
      "sharedHistory": "共享历史",
      "stats": "统计",
      "messageCount": "消息数",
      "tokenUsage": "Token 消耗",
      "estimatedCost": "预估费用",
      "duration": "会话时长"
    },
    "create": {
      "title": "新建对话",
      "chatTitle": "对话标题",
      "selectMode": "选择模式",
      "selectAgent": "选择 Agent",
      "selectAgents": "选择参与者",
      "confirm": "创建"
    }
  }
}
```

en.json 对应翻译（英文版本）。

- [ ] **Step 3: 验证**

Run: `pnpm lint`
Expected: PASS（JSON 格式正确）。

- [ ] **Step 4: Commit**

```bash
git add app/i18n/locales/zh-CN.json app/i18n/locales/en.json
git commit -m "$(cat <<'EOF'
feat: 添加对话模块 i18n 翻译键
EOF
)"
```

---

## Task 13: Renderer — Chat 页面三栏布局

**Files:**

- Create: `app/pages/chat/index.tsx`
- Create: `app/pages/chat/components/list.tsx`
- Create: `app/pages/chat/components/messages.tsx`
- Create: `app/pages/chat/components/input.tsx`
- Create: `app/pages/chat/components/header.tsx`
- Create: `app/pages/chat/components/panel.tsx`
- Create: `app/pages/chat/components/create.tsx`
- Modify: `app/App.tsx` — 更新 Chat 路由

这是最大的一个 task，包含所有 UI 组件。由于 UI 组件之间强耦合，拆得太细反而不好迭代，这里作为一个整体 task 但分步骤推进。

- [ ] **Step 1: 页面入口（三栏骨架）**

Create `app/pages/chat/index.tsx`——三栏 flex 布局，先用占位内容。

关键点：

- 左栏 `w-56` 固定宽度，`border-r`
- 中栏 `flex-1`
- 右栏 `w-60` 固定宽度，`border-l`
- 使用 `useChatStore` 获取状态
- 组件挂载时通过 `window.electron.chat.list()` 加载对话列表
- 订阅 `window.electron.chat.on.stream` 和 `window.electron.chat.on.roundtable` 事件

- [ ] **Step 2: 对话列表组件**

Create `app/pages/chat/components/list.tsx`——左栏对话列表。

关键点：

- 搜索框（本地过滤）
- 新建按钮（触发 create dialog）
- 对话项：头像 + 标题 + 模式标签 + 最后消息预览
- 选中项高亮
- 点击切换 `activeId`，加载对应的 messages 和 members

- [ ] **Step 3: 聊天区头部**

Create `app/pages/chat/components/header.tsx`——中栏顶部。

关键点：

- 单 agent：agent 头像 + 名称 + 在线状态
- 圆桌：参与者头像组 + 标题 + 轮次状态 + 暂停/停止按钮

- [ ] **Step 4: 消息列表组件**

Create `app/pages/chat/components/messages.tsx`——消息气泡渲染。

关键点：

- 用户消息右对齐蓝色气泡
- Agent 消息左对齐，带头像和名字
- 多 agent 时每个 agent 用颜色 + 左侧 border 区分
- 流式渲染：`streamingContent` 显示为最后一条消息 + 光标
- 自动滚动到底部（新消息到达时）
- `useRef` 管理滚动容器

- [ ] **Step 5: 输入框组件**

Create `app/pages/chat/components/input.tsx`——消息输入区域。

关键点：

- textarea 自适应高度
- Enter 发送，Shift+Enter 换行
- 发送中禁用输入
- 圆桌模式下 placeholder 不同
- 发送按钮 / abort 按钮切换

- [ ] **Step 6: 信息面板组件**

Create `app/pages/chat/components/panel.tsx`——右栏信息面板。

关键点：

- Agent 信息区
- 上下文预算进度条（只读展示，后续做可调）
- 关联知识库列表
- 统计数据
- 圆桌模式：参与者列表 + 编排参数

- [ ] **Step 7: 新建对话弹窗**

Create `app/pages/chat/components/create.tsx`——新建对话 Dialog。

关键点：

- 用 shadcn Dialog 组件
- 标题输入
- 模式选择（P1 只显示 single / roundtable）
- Agent 选择（从 `useAgentsStore` 获取可用 agents）
- 圆桌模式允许多选 agents
- 创建后跳转到新对话

- [ ] **Step 8: 更新路由**

修改 `app/App.tsx`，把 Chat 路由指向新的 `app/pages/chat/index.tsx`。

- [ ] **Step 9: 验证**

Run: `pnpm lint`
Run: `pnpm dev`
Expected: Chat 页面显示三栏布局，可以新建对话（UI 层面），消息列表正确渲染。Gateway 未连接时发送会报错（预期行为）。

- [ ] **Step 10: Commit**

```bash
git add app/pages/chat/ app/App.tsx
git commit -m "$(cat <<'EOF'
feat: 实现 Chat 页面三栏布局和核心 UI 组件
EOF
)"
```

---

## Task 14: 集成验证

端到端验证所有层的联通。

- [ ] **Step 1: 启动 OpenClaw gateway**

确保本地 OpenClaw gateway 运行中，至少有一个可用的 agent。

- [ ] **Step 2: 验证单 agent 对话**

1. `pnpm dev` 启动 kaiwu
2. 进入 Chat 页面
3. 新建单 agent 对话（选择一个 agent）
4. 发送消息
5. 验证：流式响应正常显示，消息保存到 SQLite，信息面板显示统计

- [ ] **Step 3: 验证圆桌讨论**

1. 新建圆桌对话（选择 2-3 个 agent）
2. 输入话题，开始讨论
3. 验证：agents 轮流发言，每个 agent 颜色不同，轮次计数正确
4. 验证：暂停/恢复/停止功能
5. 验证：用户可以中途插入发言

- [ ] **Step 4: 验证上下文注入**

检查 OpenClaw gateway 日志，确认插件的 `before_prompt_build` hook 被触发，`sharedHistory` 正确注入。

- [ ] **Step 5: 修复发现的问题**

修复集成测试中发现的任何问题，逐个 commit。

- [ ] **Step 6: 最终 lint + 格式化**

```bash
pnpm lint:fix
pnpm format
```

Commit 所有修复。
