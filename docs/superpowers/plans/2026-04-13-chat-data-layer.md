# 聊天数据层重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 chat 模块拆为 chat_messages + chat_invocations 双表，支持完整 token/cost/model 统计，用原始 JSON 兜底 OpenClaw 字段演进，实现可靠的幂等对账。

**Architecture:** chat_messages 存纯对话内容（乐观写入 + status 状态机），chat_invocations 存 OpenClaw 调用记录（run_id 为主键，raw JSON 兜底）。实时写入两表包在同一事务内，补偿同步靠 run_id / content_hash 去重，幂等安全。

**Tech Stack:** drizzle-orm + better-sqlite3, Electron IPC, Zustand, React

**Spec:** `docs/superpowers/specs/2026-04-13-chat-data-layer-design.md`

---

### Task 1: 数据库 migration 文件

**Files:**

- Create: `electron/db/migrations/0003_invocations.sql`
- Modify: `electron/db/migrate.ts:5-16`

- [ ] **Step 1: 创建 migration SQL**

```sql
-- electron/db/migrations/0003_invocations.sql

-- chat_messages 新增列
ALTER TABLE chat_messages ADD COLUMN status TEXT NOT NULL DEFAULT 'confirmed';
--> statement-breakpoint
ALTER TABLE chat_messages ADD COLUMN invocation_id TEXT;
--> statement-breakpoint
ALTER TABLE chat_messages ADD COLUMN run_id TEXT;
--> statement-breakpoint
ALTER TABLE chat_messages ADD COLUMN remote_seq INTEGER;
--> statement-breakpoint
ALTER TABLE chat_messages ADD COLUMN content_hash TEXT;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_cm_run
  ON chat_messages(chat_id, run_id);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_cm_hash
  ON chat_messages(chat_id, sender_type, content_hash, created_at);

--> statement-breakpoint

-- chat_invocations 新表
CREATE TABLE IF NOT EXISTS chat_invocations (
  id              TEXT PRIMARY KEY,
  chat_id         TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  session_key     TEXT NOT NULL,
  agent_id        TEXT NOT NULL,
  model           TEXT,
  provider        TEXT,
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  cache_read      INTEGER,
  cache_write     INTEGER,
  cost            REAL,
  stop_reason     TEXT,
  duration_ms     INTEGER,
  raw             TEXT,
  created_at      INTEGER NOT NULL
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_ci_chat
  ON chat_invocations(chat_id, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_ci_agent
  ON chat_invocations(agent_id, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_ci_model
  ON chat_invocations(model, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_ci_session
  ON chat_invocations(session_key);
```

- [ ] **Step 2: 注册 migration**

在 `electron/db/migrate.ts` 中添加 import 和清单项：

```ts
// 添加 import（按行长升序，插到 chatSql 之后）
import invocationsSql from "./migrations/0003_invocations.sql?raw"

// MIGRATIONS 数组末尾追加
{ name: "0003_invocations", sql: invocationsSql },
```

- [ ] **Step 3: 验证 migration**

Run: `pnpm dev`（启动后检查控制台日志出现 `数据库迁移已应用: 0003_invocations`）

- [ ] **Step 4: Commit**

```bash
git add electron/db/migrations/0003_invocations.sql electron/db/migrate.ts
git commit -m "chore: 新增 chat_invocations 表和 chat_messages 扩展列的 migration"
```

---

### Task 2: drizzle schema 更新

**Files:**

- Modify: `electron/db/schema.ts:101-127`

- [ ] **Step 1: 更新 chatMessages 表定义**

在 `electron/db/schema.ts` 中，将 `chatMessages` 的定义替换为：

```ts
/** 对话消息。chat_id 级联删除，sender_agent_id 仅 agent 发言时填。 */
export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: text("id").primaryKey(),
    chat_id: text("chat_id").notNull(),
    sender_type: text("sender_type", { enum: ["user", "agent", "system"] }).notNull(),
    sender_agent_id: text("sender_agent_id"),
    content: text("content").notNull(),
    status: text("status", { enum: ["pending", "confirmed", "failed"] })
      .notNull()
      .default("confirmed"),
    invocation_id: text("invocation_id"),
    run_id: text("run_id"),
    remote_seq: integer("remote_seq"),
    content_hash: text("content_hash"),
    metadata: text("metadata").notNull().default("{}"),
    created_at: integer("created_at").notNull(),
  },
  (table) => [
    index("idx_chat_messages_chat").on(table.chat_id, table.created_at),
    index("idx_cm_run").on(table.chat_id, table.run_id),
    index("idx_cm_hash").on(table.chat_id, table.sender_type, table.content_hash, table.created_at),
  ],
)
```

- [ ] **Step 2: 新增 chatInvocations 表定义**

在 `chatMessages` 定义之后、`chatMembers` 之前添加：

```ts
/** 调用记录。一次 agent 回复 = 一行，承载计费/监控维度的数据。 */
export const chatInvocations = sqliteTable(
  "chat_invocations",
  {
    id: text("id").primaryKey(),
    chat_id: text("chat_id").notNull(),
    session_key: text("session_key").notNull(),
    agent_id: text("agent_id").notNull(),
    model: text("model"),
    provider: text("provider"),
    input_tokens: integer("input_tokens"),
    output_tokens: integer("output_tokens"),
    cache_read: integer("cache_read"),
    cache_write: integer("cache_write"),
    cost: real("cost"),
    stop_reason: text("stop_reason"),
    duration_ms: integer("duration_ms"),
    raw: text("raw"),
    created_at: integer("created_at").notNull(),
  },
  (table) => [
    index("idx_ci_chat").on(table.chat_id, table.created_at),
    index("idx_ci_agent").on(table.agent_id, table.created_at),
    index("idx_ci_model").on(table.model, table.created_at),
    index("idx_ci_session").on(table.session_key),
  ],
)
```

注意：需要在文件顶部的 import 中补充 `real`：

```ts
import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core"
```

- [ ] **Step 3: 类型检查**

Run: `npx tsc --noEmit 2>&1 | grep -E "(schema\.ts)" || echo "无错误"`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add electron/db/schema.ts
git commit -m "feat: schema 新增 chat_invocations 表和 chat_messages 扩展列"
```

---

### Task 3: 类型定义更新

**Files:**

- Modify: `electron/features/chat/types.ts`
- Modify: `electron/openclaw/gateway/contract.ts:121-197`
- Modify: `electron/engine/types.ts:26-49`
- Modify: `app/types/chat.ts`

- [ ] **Step 1: 更新 contract.ts——ChatEvent 补全字段，ChatHistoryMessage 补全元数据**

在 `electron/openclaw/gateway/contract.ts` 中：

ChatEvent 已有 usage（含 cacheRead/cacheWrite）。需要补全 message 内嵌的 cost/model 信息。将 `ChatEventMessage` 替换为：

```ts
/** gateway 推送的 chat 事件中的 message 结构。 */
export interface ChatEventMessage {
  role: string
  content: Array<{ type: string; text?: string }>
  timestamp?: number
  model?: string
  provider?: string
  usage?: {
    input?: number
    output?: number
    cacheRead?: number
    cacheWrite?: number
    totalTokens?: number
    cost?: { total?: number }
  }
  stopReason?: string
}
```

将 `ChatHistoryMessage` 替换为：

```ts
/** chat.history 返回的消息条目。 */
export interface ChatHistoryMessage {
  role: string
  content: unknown
  timestamp?: number
  model?: string
  provider?: string
  stopReason?: string
  usage?: {
    input?: number
    output?: number
    cacheRead?: number
    cacheWrite?: number
    totalTokens?: number
    cost?: { total?: number }
  }
  /** OpenClaw 附加的元数据。 */
  __openclaw?: { id?: string; seq?: number }
}
```

- [ ] **Step 2: 更新 engine/types.ts——onFinal 签名传原始事件**

在 `electron/engine/types.ts` 中，删除 `TokenUsage` 接口，新增 `InvocationData`：

```ts
/** 从 ChatEvent final 中提取的调用元数据。 */
export interface InvocationData {
  runId: string
  model?: string
  provider?: string
  inputTokens?: number
  outputTokens?: number
  cacheRead?: number
  cacheWrite?: number
  cost?: number
  stopReason?: string
  raw: string
}
```

将 `EngineRunParams.onFinal` 签名改为：

```ts
  onFinal: (message: string, invocation: InvocationData) => void
```

- [ ] **Step 3: 更新 chat/types.ts——新增 ChatInvocationRow，ChatMessageRow 加列，ChatStreamEvent 加元数据**

在 `electron/features/chat/types.ts` 中：

更新 import：

```ts
import type { InvocationData } from "../../engine/types"
```

将 `ChatMessageRow` 替换为：

```ts
/** 消息行。 */
export interface ChatMessageRow {
  id: string
  chat_id: string
  content: string
  status: "pending" | "confirmed" | "failed"
  invocation_id: string | null
  run_id: string | null
  remote_seq: number | null
  content_hash: string | null
  metadata: string
  created_at: number
  sender_type: "user" | "agent" | "system"
  sender_agent_id: string | null
}
```

新增 `ChatInvocationRow`：

```ts
/** 调用记录行。一次 agent 回复 = 一行。 */
export interface ChatInvocationRow {
  id: string
  chat_id: string
  session_key: string
  agent_id: string
  model: string | null
  provider: string | null
  input_tokens: number | null
  output_tokens: number | null
  cache_read: number | null
  cache_write: number | null
  cost: number | null
  stop_reason: string | null
  duration_ms: number | null
  raw: string | null
  created_at: number
}
```

将 `ChatStreamEvent` 替换为：

```ts
/** 流式响应事件。 */
export interface ChatStreamEvent {
  type: "delta" | "final" | "error"
  chatId: string
  agentId: string
  messageId: string
  error?: string
  content?: string
  invocation?: InvocationData
}
```

- [ ] **Step 4: 更新 app/types/chat.ts——re-export 新类型**

```ts
export type {
  ChatRow,
  ChatMode,
  ChatStatus,
  ChatMessageRow,
  ChatInvocationRow,
  ChatMemberRow,
  ChatCreateInput,
  ChatSendInput,
  ChatMemberAddInput,
  ChatStreamEvent,
  ChatRoundtableEvent,
} from "../../electron/features/chat/types"

export type { InvocationData } from "../../electron/engine/types"
```

- [ ] **Step 5: 类型检查**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: 会有一些下游文件报错（runner.ts、orchestrator.ts、service.ts 等引用了旧签名），这是预期的，后续 Task 修复。

- [ ] **Step 6: Commit**

```bash
git add electron/openclaw/gateway/contract.ts electron/engine/types.ts electron/features/chat/types.ts app/types/chat.ts
git commit -m "feat: 类型定义更新——InvocationData、ChatInvocationRow、ChatStreamEvent 扩展"
```

---

### Task 4: engine 层——runner.ts + ipc.ts 适配新签名

**Files:**

- Modify: `electron/engine/runner.ts`
- Modify: `electron/features/chat/ipc.ts:13-56,109-119`

- [ ] **Step 1: 重写 runner.ts**

将 `electron/engine/runner.ts` 全文替换为：

```ts
import type { EngineRunParams, EngineStageContext, InvocationData } from "./types"

/** engine 的运行时依赖，由调用方注入。engine 不直接 import features。 */
export interface EngineRuntime {
  /** 创建 OpenClaw session，返回 session key。 */
  sessionCreate(agentId: string, label?: string): Promise<{ sessionKey: string }>
  /** 获取 OpenClaw session 的聊天历史。 */
  chatHistory(sessionKey: string, limit?: number): Promise<Array<{ role: string; content: unknown; timestamp?: number; [k: string]: unknown }>>
  /** 调用 gateway chat.send RPC，返回 runId。 */
  chatSend(sessionKey: string, message: string): Promise<{ runId: string }>
  /** 调用 gateway chat.abort RPC。 */
  chatAbort(sessionKey: string, runId?: string): Promise<void>
  /** 订阅指定 session 的 chat 事件流，返回取消函数。 */
  onChatEvent(
    sessionKey: string,
    listener: (event: { runId: string; state: "delta" | "final" | "aborted" | "error"; message?: unknown; errorMessage?: string; raw: unknown }) => void,
  ): () => void
  /** 推送阶段上下文到 kaiwu 插件（通过 gateway HTTP invoke）。 */
  pushStageContext(sessionKey: string, ctx: EngineStageContext): Promise<void>
  /** 清除指定 session 的阶段上下文。 */
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
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        runtime.chatAbort(sessionKey, runId).catch(() => {})
        reject(new Error("aborted"))
      }
      signal?.addEventListener("abort", onAbort, { once: true })

      unsubscribe = runtime.onChatEvent(sessionKey, (event) => {
        switch (event.state) {
          case "delta":
            if (event.message) onDelta(extractText(event.message))
            break
          case "final": {
            signal?.removeEventListener("abort", onAbort)
            const text = extractText(event.message)
            const invocation = buildInvocationData(event.runId, event.raw)
            onFinal(text, invocation)
            resolve()
            break
          }
          case "error":
            signal?.removeEventListener("abort", onAbort)
            reject(new Error(event.errorMessage ?? "agent error"))
            break
          case "aborted":
            signal?.removeEventListener("abort", onAbort)
            reject(new Error("agent aborted"))
            break
        }
      })

      runtime.chatSend(sessionKey, message).then(
        (result) => {
          runId = result.runId
          params.onSendConfirmed?.(runId)
          if (signal?.aborted) {
            runtime.chatAbort(sessionKey, runId).catch(() => {})
            reject(new Error("aborted"))
          }
        },
        (err) => reject(err),
      )
    })
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)))
  } finally {
    unsubscribe?.()
    runtime.clearStageContext(sessionKey).catch(() => {})
  }
}

/** 从 gateway 消息对象中提取纯文本。 */
function extractText(message: unknown): string {
  if (!message) return ""
  if (typeof message === "string") return message
  const msg = message as { content?: Array<{ type?: string; text?: string }> }
  if (!Array.isArray(msg.content)) return ""
  return msg.content
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text)
    .join("")
}

/** 安全提取数字，非有限数字返回 undefined。 */
function safeNum(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined
}

/** 安全提取字符串。 */
function safeStr(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined
}

/** 从原始 ChatEvent 构造 InvocationData。 */
function buildInvocationData(runId: string, raw: unknown): InvocationData {
  const event = (raw ?? {}) as Record<string, unknown>
  const msg = (event.message ?? {}) as Record<string, unknown>
  const usage = (event.usage ?? msg.usage ?? {}) as Record<string, unknown>
  const cost = (usage.cost ?? {}) as Record<string, unknown>

  return {
    runId,
    model: safeStr(msg.model) ?? safeStr(event.model),
    provider: safeStr(msg.provider) ?? safeStr(event.provider),
    inputTokens: safeNum(usage.input),
    outputTokens: safeNum(usage.output),
    cacheRead: safeNum(usage.cacheRead),
    cacheWrite: safeNum(usage.cacheWrite),
    cost: safeNum(cost.total) ?? safeNum(usage.cost as unknown),
    stopReason: safeStr(event.stopReason) ?? safeStr(msg.stopReason),
    raw: JSON.stringify(raw ?? {}),
  }
}
```

- [ ] **Step 2: 更新 ipc.ts——buildRuntime 传完整原始事件**

在 `electron/features/chat/ipc.ts` 中，将 `buildRuntime` 函数中的 `onChatEvent` 方法替换为：

```ts
    onChatEvent(sessionKey, listener) {
      return requireEmitter().subscribe("chat", sessionKey, (payload) => {
        const event = payload as ChatEvent
        listener({
          runId: event.runId,
          state: event.state,
          message: event.message,
          errorMessage: event.errorMessage,
          raw: payload,
        })
      })
    },
```

同时删除文件底部的 `extractMessageText` 函数（不再需要，提取逻辑已移入 runner.ts）。

更新 `buildRuntime` 的 `chatHistory` 方法返回完整消息：

```ts
    async chatHistory(sessionKey, limit) {
      const result = await requireCaller().call("chat.history", { sessionKey, limit })
      const payload = result as { messages?: unknown[] }
      return (payload.messages ?? []) as Array<{ role: string; content: unknown; timestamp?: number; [k: string]: unknown }>
    },
```

- [ ] **Step 3: 类型检查**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: orchestrator.ts 和 service.ts 仍有错误（旧的 onFinal 签名和 insertMessage 签名），后续 Task 修复。

- [ ] **Step 4: Commit**

```bash
git add electron/engine/runner.ts electron/features/chat/ipc.ts
git commit -m "refactor: runner 传递完整原始事件，ipc 层不再提前提取文本"
```

---

### Task 5: service 层重写

**Files:**

- Modify: `electron/features/chat/service.ts`

- [ ] **Step 1: 重写 service.ts**

将 `electron/features/chat/service.ts` 全文替换为：

```ts
import { and, asc, desc, eq, sql } from "drizzle-orm"
import { createHash } from "node:crypto"
import { getDb } from "../../db/client"
import { chatInvocations, chatMembers, chatMessages, chats } from "../../db/schema"
import { scope } from "../../core/logger"
import type { ChatCreateInput, ChatInvocationRow, ChatMemberAddInput, ChatMemberRow, ChatMessageRow, ChatRow } from "./types"
import type { InvocationData } from "../../engine/types"

const log = scope("chat")

// ---- Chats ----

/**
 * 列出所有对话，按最后更新时间倒序排列。
 */
export function listChats(): ChatRow[] {
  return getDb().select().from(chats).orderBy(desc(chats.updated_at)).all() as ChatRow[]
}

/**
 * 新建对话，同时插入成员记录。操作在同一事务内完成。
 * @param input 对话标题、模式和初始成员 agentId 列表
 */
export function createChat(input: ChatCreateInput): ChatRow {
  const id = crypto.randomUUID()
  const now = Date.now()
  const config = JSON.stringify(input.config ?? {})

  getDb().transaction(() => {
    getDb().insert(chats).values({ id, title: input.title, mode: input.mode, config, created_at: now, updated_at: now }).run()

    for (const agentId of input.agentIds) {
      getDb().insert(chatMembers).values({ chat_id: id, agent_id: agentId }).run()
    }
  })

  log.info(`对话已创建: ${id}`)
  const row = getDb().select().from(chats).where(eq(chats.id, id)).get()
  return row as ChatRow
}

/**
 * 删除对话（级联删除消息、调用记录和成员）。
 * @param id 对话 id
 */
export function deleteChat(id: string): void {
  getDb().transaction(() => {
    getDb().delete(chatInvocations).where(eq(chatInvocations.chat_id, id)).run()
    getDb().delete(chatMessages).where(eq(chatMessages.chat_id, id)).run()
    getDb().delete(chatMembers).where(eq(chatMembers.chat_id, id)).run()
    getDb().delete(chats).where(eq(chats.id, id)).run()
  })
  log.info(`对话已删除: ${id}`)
}

/**
 * 按 id 查单个对话，找不到时抛出错误。
 * @param id 对话 id
 */
export function getChat(id: string): ChatRow {
  const row = getDb().select().from(chats).where(eq(chats.id, id)).get()
  if (!row) throw new Error(`chat not found: ${id}`)
  return row as ChatRow
}

/**
 * 合并更新对话的 config JSON 字段，同时刷新 updated_at。
 * @param id 对话 id
 * @param config 要合并的配置键值对
 */
export function updateChatConfig(id: string, config: Record<string, unknown>): void {
  const row = getChat(id)
  const merged = JSON.stringify({ ...JSON.parse(row.config), ...config })
  getDb().update(chats).set({ config: merged, updated_at: Date.now() }).where(eq(chats.id, id)).run()
}

// ---- Messages ----

/**
 * 列出指定对话的所有消息，按发送时间升序排列。
 * @param chatId 对话 id
 */
export function listMessages(chatId: string): ChatMessageRow[] {
  return getDb().select().from(chatMessages).where(eq(chatMessages.chat_id, chatId)).orderBy(asc(chatMessages.created_at)).all() as ChatMessageRow[]
}

/**
 * 乐观写入用户消息（status='pending'），发送确认后再标记为 confirmed。
 * @param chatId 对话 id
 * @param content 消息正文
 */
export function insertPendingUserMessage(chatId: string, content: string): ChatMessageRow {
  const id = crypto.randomUUID()
  const now = Date.now()
  const hash = contentHash(content)

  getDb()
    .insert(chatMessages)
    .values({
      id,
      chat_id: chatId,
      sender_type: "user",
      sender_agent_id: null,
      content,
      status: "pending",
      content_hash: hash,
      metadata: "{}",
      created_at: now,
    })
    .run()
  getDb().update(chats).set({ updated_at: now }).where(eq(chats.id, chatId)).run()

  return getDb().select().from(chatMessages).where(eq(chatMessages.id, id)).get() as ChatMessageRow
}

/**
 * 标记 pending 消息为已确认。
 * @param messageId 消息 id
 */
export function confirmMessage(messageId: string): void {
  getDb().update(chatMessages).set({ status: "confirmed" }).where(eq(chatMessages.id, messageId)).run()
}

/**
 * 标记 pending 消息为发送失败。
 * @param messageId 消息 id
 */
export function failMessage(messageId: string): void {
  getDb().update(chatMessages).set({ status: "failed" }).where(eq(chatMessages.id, messageId)).run()
}

/**
 * 事务内同时写入 agent 消息和调用记录。
 * @param chatId 对话 id
 * @param agentId 发言的 agent id
 * @param content 回复正文
 * @param sessionKey OpenClaw session key
 * @param invocation 调用元数据
 */
export function insertAgentMessageWithInvocation(chatId: string, agentId: string, content: string, sessionKey: string, invocation: InvocationData): void {
  const msgId = crypto.randomUUID()
  const now = Date.now()
  const hash = contentHash(content)

  getDb().transaction(() => {
    getDb()
      .insert(chatMessages)
      .values({
        id: msgId,
        chat_id: chatId,
        sender_type: "agent",
        sender_agent_id: agentId,
        content,
        status: "confirmed",
        invocation_id: invocation.runId,
        run_id: invocation.runId,
        content_hash: hash,
        metadata: "{}",
        created_at: now,
      })
      .run()

    getDb()
      .insert(chatInvocations)
      .values({
        id: invocation.runId,
        chat_id: chatId,
        session_key: sessionKey,
        agent_id: agentId,
        model: invocation.model ?? null,
        provider: invocation.provider ?? null,
        input_tokens: invocation.inputTokens ?? null,
        output_tokens: invocation.outputTokens ?? null,
        cache_read: invocation.cacheRead ?? null,
        cache_write: invocation.cacheWrite ?? null,
        cost: invocation.cost ?? null,
        stop_reason: invocation.stopReason ?? null,
        raw: invocation.raw,
        created_at: now,
      })
      .run()

    getDb().update(chats).set({ updated_at: now }).where(eq(chats.id, chatId)).run()
  })
}

// ---- Invocations ----

/**
 * 列出指定对话的所有调用记录，按时间升序。
 * @param chatId 对话 id
 */
export function listInvocations(chatId: string): ChatInvocationRow[] {
  return getDb().select().from(chatInvocations).where(eq(chatInvocations.chat_id, chatId)).orderBy(asc(chatInvocations.created_at)).all() as ChatInvocationRow[]
}

/**
 * 检查指定 invocation 是否存在。
 * @param invocationId invocation id（即 run_id）
 */
export function invocationExists(invocationId: string): boolean {
  const row = getDb().select({ id: chatInvocations.id }).from(chatInvocations).where(eq(chatInvocations.id, invocationId)).get()
  return !!row
}

// ---- Members ----

/**
 * 列出指定对话的所有成员。
 * @param chatId 对话 id
 */
export function listMembers(chatId: string): ChatMemberRow[] {
  return getDb().select().from(chatMembers).where(eq(chatMembers.chat_id, chatId)).all() as ChatMemberRow[]
}

/**
 * 向对话中添加一个成员。
 * @param input 包含 chatId、agentId 和可选 config
 */
export function addMember(input: ChatMemberAddInput): void {
  const config = JSON.stringify(input.config ?? {})
  getDb().insert(chatMembers).values({ chat_id: input.chatId, agent_id: input.agentId, config }).run()
}

/**
 * 更新成员的 session key（首次 chat.send 前自动创建 session 后回写）。
 * @param chatId 对话 id
 * @param agentId agent id
 * @param sessionKey 新的 session key
 */
export function updateMemberSessionKey(chatId: string, agentId: string, sessionKey: string): void {
  getDb()
    .update(chatMembers)
    .set({ session_key: sessionKey })
    .where(and(eq(chatMembers.chat_id, chatId), eq(chatMembers.agent_id, agentId)))
    .run()
}

/**
 * 从对话中移除一个成员。
 * @param chatId 对话 id
 * @param agentId 要移除的 agent id
 */
export function removeMember(chatId: string, agentId: string): void {
  getDb()
    .delete(chatMembers)
    .where(and(eq(chatMembers.chat_id, chatId), eq(chatMembers.agent_id, agentId)))
    .run()
}

// ---- 对账 ----

/**
 * 从 OpenClaw 远程消息中提取纯文本。
 * @param content 远程消息的 content 字段
 */
function extractText(content: unknown): string {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return ""
  return (content as Array<{ type?: string; text?: string }>)
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text)
    .join("")
}

/**
 * 查询指定 chat + session 中最新消息的时间戳。
 * @param chatId 对话 id
 * @param sessionKey session key（通过 invocation 关联）
 */
function getMaxCreatedAt(chatId: string): number {
  const row = getDb()
    .select({ max: sql<number>`MAX(${chatMessages.created_at})` })
    .from(chatMessages)
    .where(eq(chatMessages.chat_id, chatId))
    .get()
  return row?.max ?? 0
}

/**
 * 与 OpenClaw 对账：补录缺失的消息和调用记录。
 * 去重策略：assistant 消息靠 invocation id（__openclaw.id），
 * user 消息靠 content_hash + timestamp ±2s 容差。
 * @param chatId 对话 id
 * @param sessionKey 该成员的 session key
 * @param agentId 该成员的 agent id
 * @param remoteMessages chat.history 返回的消息列表
 */
export function syncMessages(
  chatId: string,
  sessionKey: string,
  agentId: string,
  remoteMessages: Array<{ role: string; content: unknown; timestamp?: number; [k: string]: unknown }>,
): number {
  const lastTs = getMaxCreatedAt(chatId)
  let synced = 0
  // 时间容差 2 秒
  const TOLERANCE_MS = 2000

  for (const remote of remoteMessages) {
    const ts = typeof remote.timestamp === "number" ? remote.timestamp : 0
    // 只处理比本地最新消息更新的远程消息（compaction 保护）
    if (ts <= lastTs) continue

    const text = extractText(remote.content)
    if (!text) continue

    const oc = remote.__openclaw as { id?: string; seq?: number } | undefined

    if (remote.role === "assistant" || remote.role === "tool") {
      // assistant 消息靠 invocation id 去重
      const remoteId = oc?.id ?? ""
      if (remoteId && invocationExists(remoteId)) continue

      // 构造 invocation data
      const usage = (remote.usage ?? {}) as Record<string, unknown>
      const cost = (usage.cost ?? {}) as Record<string, unknown>
      const invocation: InvocationData = {
        runId: remoteId || crypto.randomUUID(),
        model: typeof remote.model === "string" ? remote.model : undefined,
        provider: typeof remote.provider === "string" ? remote.provider : undefined,
        inputTokens: typeof usage.input === "number" ? usage.input : undefined,
        outputTokens: typeof usage.output === "number" ? usage.output : undefined,
        cacheRead: typeof usage.cacheRead === "number" ? usage.cacheRead : undefined,
        cacheWrite: typeof usage.cacheWrite === "number" ? usage.cacheWrite : undefined,
        cost: typeof cost.total === "number" ? cost.total : undefined,
        stopReason: typeof remote.stopReason === "string" ? remote.stopReason : undefined,
        raw: JSON.stringify(remote),
      }
      insertAgentMessageWithInvocation(chatId, agentId, text, sessionKey, invocation)
      synced++
    } else {
      // user 消息靠 content_hash + timestamp 容差去重
      const hash = contentHash(text)
      const existing = getDb()
        .select({ id: chatMessages.id })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.chat_id, chatId),
            eq(chatMessages.sender_type, "user"),
            eq(chatMessages.content_hash, hash),
            sql`${chatMessages.created_at} BETWEEN ${ts - TOLERANCE_MS} AND ${ts + TOLERANCE_MS}`,
          ),
        )
        .get()
      if (existing) continue

      const msgId = crypto.randomUUID()
      getDb()
        .insert(chatMessages)
        .values({
          id: msgId,
          chat_id: chatId,
          sender_type: "user",
          sender_agent_id: null,
          content: text,
          status: "confirmed",
          content_hash: hash,
          remote_seq: oc?.seq ?? null,
          metadata: JSON.stringify({ synced: true }),
          created_at: ts || Date.now(),
        })
        .run()
      synced++
    }
  }

  if (synced > 0) {
    getDb().update(chats).set({ updated_at: Date.now() }).where(eq(chats.id, chatId)).run()
    log.info(`对账补录 ${synced} 条消息: chatId=${chatId}`)
  }
  return synced
}

// ---- 工具 ----

/**
 * 计算 content hash（SHA-256 hex 前 16 位）。用于 user 消息的对账去重。
 * @param content 消息正文
 */
export function contentHash(content: string): string {
  return createHash("sha256").update(content.slice(0, 100)).digest("hex").slice(0, 16)
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit 2>&1 | grep "service.ts" || echo "无错误"`
Expected: service.ts 无错误。orchestrator.ts 仍有错误（下个 Task 修复）。

- [ ] **Step 3: Commit**

```bash
git add electron/features/chat/service.ts
git commit -m "feat: service 层重写——双表事务写入、乐观写入、幂等对账"
```

---

### Task 6: orchestrator 适配新 service API

**Files:**

- Modify: `electron/features/chat/orchestrator.ts`

- [ ] **Step 1: 更新 import 和 handleSendMessage**

在 `electron/features/chat/orchestrator.ts` 中，将 import 更新为：

```ts
import type { EngineRuntime } from "../../engine/runner"
import type { ResolvedConfig } from "../../engine/types"
import { runAgent } from "../../engine/runner"
import { resolveConfig, buildStageContext, formatSharedTranscript } from "../../engine/context"
import { nextSpeaker, isRoundComplete } from "../../engine/strategy"
import { scope } from "../../core/logger"
import {
  getChat,
  listMembers,
  listMessages,
  insertPendingUserMessage,
  confirmMessage,
  failMessage,
  insertAgentMessageWithInvocation,
  updateMemberSessionKey,
  syncMessages,
} from "./service"
import type { ChatStreamEvent, ChatRoundtableEvent, ChatSendInput, ChatMemberRow } from "./types"
```

将 `handleSendMessage` 函数替换为：

```ts
async function handleSendMessage(runtime: EngineRuntime, callbacks: OrchestratorCallbacks, controllers: Map<string, AbortController>, input: ChatSendInput): Promise<void> {
  log.info(`sendMessage: chatId=${input.chatId}`)
  const chat = getChat(input.chatId)
  const members = listMembers(input.chatId)
  const member = members[0]
  if (!member) throw new Error("chat has no member")

  const config = resolveConfig(chat.config, member.config)
  const sessionKey = await ensureSession(runtime, input.chatId, member)
  log.info(`sessionKey=${sessionKey}, agentId=${member.agent_id}`)

  // 乐观写入用户消息，UI 立即可见
  const userMsg = insertPendingUserMessage(input.chatId, input.content)

  const messageId = crypto.randomUUID()
  const role = getMemberRole(member.config)
  const ctx = buildStageContext(role, [], undefined)

  log.info("pushStageContext...")
  await runtime.pushStageContext(sessionKey, ctx)

  controllers.get(input.chatId)?.abort()
  const ac = new AbortController()
  controllers.set(input.chatId, ac)

  log.info("runAgent...")
  await runAgent(runtime, {
    sessionKey,
    agentId: member.agent_id,
    message: input.content,
    config,
    chatId: input.chatId,
    signal: ac.signal,
    onSendConfirmed: () => {
      log.info("send confirmed")
      confirmMessage(userMsg.id)
    },
    onDelta: (text) => callbacks.onStream({ type: "delta", chatId: input.chatId, agentId: member.agent_id, messageId, content: text }),
    onFinal: (message, invocation) => {
      log.info(`final: ${message.slice(0, 100)}`)
      callbacks.onStream({ type: "final", chatId: input.chatId, agentId: member.agent_id, messageId, content: message, invocation })
      insertAgentMessageWithInvocation(input.chatId, member.agent_id, message, sessionKey, invocation)
    },
    onError: (err) => {
      log.error(`error: ${err.message}`)
      failMessage(userMsg.id)
      callbacks.onStream({ type: "error", chatId: input.chatId, agentId: member.agent_id, messageId, error: err.message })
    },
  })

  log.info("sendMessage done")
  controllers.delete(input.chatId)
}
```

- [ ] **Step 2: 更新 handleStartRoundtable 中的 topic 写入**

将 `handleStartRoundtable` 中的 `insertMessage(chatId, "user", null, topic)` 改为：

```ts
insertPendingUserMessage(chatId, topic)
```

注：圆桌 topic 是本地发起的，不经 gateway，可以直接标记 confirmed。但为了简化，用 pending 也不影响——sync 不会覆盖它。如果追求精确，可以在下一行加 `confirmMessage(userMsg.id)`。

实际改法：将那一行替换为：

```ts
const topicMsg = insertPendingUserMessage(chatId, topic)
confirmMessage(topicMsg.id)
```

- [ ] **Step 3: 更新 runSingleTurn 中的 onFinal**

将 `runSingleTurn` 中的 `onFinal` 回调替换为：

```ts
    onFinal: (message, invocation) => {
      callbacks.onStream({ type: "final", chatId, agentId: member.agent_id, messageId, content: message, invocation })
      insertAgentMessageWithInvocation(chatId, member.agent_id, message, sessionKey, invocation)
    },
```

- [ ] **Step 4: 更新 handleSyncChat**

将 `handleSyncChat` 替换为：

```ts
async function handleSyncChat(runtime: EngineRuntime, chatId: string): Promise<number> {
  const members = listMembers(chatId)
  let totalSynced = 0
  for (const member of members) {
    if (!member.session_key) continue
    try {
      const remote = await runtime.chatHistory(member.session_key)
      const synced = syncMessages(chatId, member.session_key, member.agent_id, remote)
      totalSynced += synced
    } catch (err) {
      log.warn(`对账失败 session=${member.session_key}: ${(err as Error).message}`)
    }
  }
  return totalSynced
}
```

- [ ] **Step 5: 类型检查**

Run: `npx tsc --noEmit 2>&1 | grep -E "(orchestrator|service|runner|ipc)\.ts" || echo "无错误"`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add electron/features/chat/orchestrator.ts
git commit -m "feat: orchestrator 适配双表写入和乐观发送"
```

---

### Task 7: store 和 UI 适配

**Files:**

- Modify: `app/stores/chat.ts`
- Modify: `app/pages/chat/components/messages.tsx`
- Modify: `app/pages/chat/index.tsx`

- [ ] **Step 1: 更新 store——ChatStreamEvent 已包含 invocation，暂无 store 结构变更**

`app/stores/chat.ts` 中 `handleStreamEvent` 已经只取 `event.chatId` / `event.agentId` / `event.content`，不直接使用 `usage` 或 `invocation`。暂不需要改动 store 结构。

但需要确认 `ChatMessageRow` 类型变更后 store 的 `messages` 类型自动跟上（通过 re-export）。类型检查应该自动通过。

- [ ] **Step 2: 更新 messages.tsx——agent 消息页脚展示元信息**

当前消息列表只渲染 content。需要从数据库读取关联的 invocation 数据。最简方案：在消息列表页通过 IPC 获取 invocations，在 store 中缓存，渲染时关联。

但更简单的做法是：页面加载消息时，同时加载 invocations，按 `invocation_id` 做 Map 查找。

在 `app/stores/chat.ts` 中新增 invocations 状态：

```ts
// ChatState interface 中新增：
  invocations: Map<string, { model?: string; inputTokens?: number; outputTokens?: number; cacheRead?: number; cacheWrite?: number; cost?: number }>
  setInvocations: (list: Array<{ id: string; model: string | null; input_tokens: number | null; output_tokens: number | null; cache_read: number | null; cache_write: number | null; cost: number | null }>) => void
```

在 store 初始值中添加：

```ts
  invocations: new Map(),
  setInvocations: (list) => set({
    invocations: new Map(list.map((i) => [i.id, {
      model: i.model ?? undefined,
      inputTokens: i.input_tokens ?? undefined,
      outputTokens: i.output_tokens ?? undefined,
      cacheRead: i.cache_read ?? undefined,
      cacheWrite: i.cache_write ?? undefined,
      cost: i.cost ?? undefined,
    }])),
  }),
```

在 `reset` 中添加 `invocations: new Map()`。

- [ ] **Step 3: 新增 invocations IPC channel + bridge + handler**

在 `electron/features/chat/channels.ts` 的 `messages` 对象中新增：

```ts
  invocations: {
    list: "chat:invocations:list",
  },
```

在 `electron/features/chat/types.ts` 的 `ChatBridge` 中新增：

```ts
invocations: {
  list: (chatId: string) => Promise<ChatInvocationRow[]>
}
```

在 `electron/features/chat/bridge.ts` 中新增：

```ts
  invocations: {
    list: (chatId: string) => ipcRenderer.invoke(chatChannels.invocations.list, chatId),
  },
```

在 `electron/features/chat/ipc.ts` 的 `setupChat` 中新增：

```ts
safeHandle(chatChannels.invocations.list, (chatId) => listInvocations(chatId as string))
```

并在 ipc.ts 的 import 中添加 `listInvocations`。

- [ ] **Step 4: 更新 index.tsx——加载 invocations**

在 `app/pages/chat/index.tsx` 的 `activeId` useEffect 中，`finally` 块里追加：

```ts
window.electron.chat.invocations.list(activeId).then(setInvocations)
```

以及在 stream `final` 事件处理中，刷新 invocations：

```ts
if (event.type === "final" && event.chatId === useChatStore.getState().activeId) {
  window.electron.chat.messages.list(event.chatId).then(setMessages)
  window.electron.chat.invocations.list(event.chatId).then(setInvocations)
}
```

- [ ] **Step 5: 更新 messages.tsx——渲染消息元信息**

在 `MessageList` 组件中，agent 消息气泡下方添加元信息行。从 store 获取 invocations Map，按 `msg.invocation_id` 查找：

```tsx
// 在组件顶部
const invocations = useChatStore((s) => s.invocations)

// agent 消息气泡 </div> 之后，</div> 之前
{
  msg.invocation_id &&
    (() => {
      const inv = invocations.get(msg.invocation_id)
      if (!inv) return null
      return (
        <p className="text-muted-foreground/60 mt-1 flex flex-wrap gap-2 text-[10px]">
          {inv.inputTokens != null && <span>↑{formatTokens(inv.inputTokens)}</span>}
          {inv.outputTokens != null && <span>↓{formatTokens(inv.outputTokens)}</span>}
          {inv.cacheRead != null && inv.cacheRead > 0 && <span>R{formatTokens(inv.cacheRead)}</span>}
          {inv.cacheWrite != null && inv.cacheWrite > 0 && <span>W{formatTokens(inv.cacheWrite)}</span>}
          {inv.cost != null && <span>${inv.cost.toFixed(4)}</span>}
          {inv.model && <span>{inv.model}</span>}
        </p>
      )
    })()
}
```

在文件底部添加 helper：

```ts
/** token 数量格式化：≥1000 显示为 1.2k。 */
function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}
```

- [ ] **Step 6: 类型检查 + lint**

Run: `npx tsc --noEmit 2>&1 | head -20 && pnpm lint`
Expected: 通过

- [ ] **Step 7: Commit**

```bash
git add app/stores/chat.ts app/pages/chat/index.tsx app/pages/chat/components/messages.tsx electron/features/chat/channels.ts electron/features/chat/types.ts electron/features/chat/bridge.ts electron/features/chat/ipc.ts
git commit -m "feat: UI 展示消息元信息——token 用量、费用、模型"
```

---

### Task 8: 全量验证 + 收尾

**Files:**

- 无新文件

- [ ] **Step 1: 完整类型检查**

Run: `npx tsc --noEmit`
Expected: 无新增错误（预存的 sidebar.tsx 和 agent.ts 错误不管）

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: 通过

- [ ] **Step 3: 启动应用验证 migration**

Run: `pnpm dev`
验证：

1. 控制台出现 `数据库迁移已应用: 0003_invocations`
2. 已有对话列表正常加载
3. 新建对话 → 发送消息 → agent 回复后消息下方显示 token/cost/model
4. 删除对话后检查 DB 无孤儿数据

- [ ] **Step 4: 最终 Commit（如有 lint 自动修复）**

```bash
git add -A && git status
# 如果有改动
git commit -m "chore: lint 自动修复"
```
