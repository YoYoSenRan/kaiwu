import { nanoid } from "nanoid"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

/**
 * 通用列 helper。所有业务表直接展开使用，保证 id / created_at / updated_at 的形态统一。
 *
 * 使用：
 * ```ts
 * export const knowledges = sqliteTable("knowledges", {
 *   id: pk(),
 *   name: text("name").notNull(),
 *   ...timestamps(),
 * })
 * ```
 */

/** 文本主键。默认用 nanoid() 生成 21 字符 URL-safe id。 */
export const pk = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => nanoid())

/** 创建时间：毫秒时间戳。insert 时默认 Date.now()。 */
export const createdAt = () =>
  integer("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now())

/** 更新时间：毫秒时间戳。insert 默认 Date.now()，drizzle update 时自动刷新。 */
export const updatedAt = () =>
  integer("updated_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdate(() => Date.now())

/** 一次性展开 created_at + updated_at。 */
export const timestamps = () => ({
  created_at: createdAt(),
  updated_at: updatedAt(),
})

export const agents = sqliteTable("agents", {
  agent_id: text("agent_id").primaryKey(),
  created_at: integer("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
  updated_at: integer("updated_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdate(() => Date.now()),
})

export const chatSessions = sqliteTable("chat_sessions", {
  id: pk(),
  mode: text("mode").notNull().$type<"direct" | "group">(),
  label: text("label"),
  openclaw_key: text("openclaw_key").unique(),
  budget_json: text("budget_json").notNull(),
  strategy_json: text("strategy_json").notNull(),
  supervisor_id: text("supervisor_id"),
  archived: integer("archived", { mode: "boolean" })
    .notNull()
    .$defaultFn(() => false),
  ...timestamps(),
})

export const chatSessionMembers = sqliteTable("chat_session_members", {
  id: pk(),
  session_id: text("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  agent_id: text("agent_id").notNull(),
  openclaw_key: text("openclaw_key").notNull(),
  reply_mode: text("reply_mode").notNull().$type<"auto" | "mention">(),
  joined_at: integer("joined_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
  left_at: integer("left_at", { mode: "number" }),
  seed_history: integer("seed_history", { mode: "boolean" })
    .notNull()
    .$defaultFn(() => false),
})

export const chatMessages = sqliteTable("chat_messages", {
  id: pk(),
  session_id: text("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  seq: integer("seq", { mode: "number" }).notNull(),
  openclaw_session_key: text("openclaw_session_key"),
  openclaw_message_id: text("openclaw_message_id"),
  sender_type: text("sender_type").notNull().$type<"user" | "agent" | "tool" | "system">(),
  sender_id: text("sender_id"),
  role: text("role").notNull().$type<"user" | "assistant" | "tool" | "system">(),
  content_json: text("content_json").notNull(),
  mentions_json: text("mentions_json"),
  /** 本消息回复的目标消息 id(同表引用)。用于 reply-to 结构化路由 + thread 可视化。 */
  in_reply_to_message_id: text("in_reply_to_message_id"),
  /** 关联的 idempotencyKey（openclaw 侧叫 runId）；字段名延续旧命名避免 schema 迁移。 */
  turn_run_id: text("turn_run_id"),
  tags_json: text("tags_json"),
  /** assistant 消息用的模型（"provider/model-id"）。 */
  model: text("model"),
  /** StepUsage 的 JSON：input/output/cacheRead/cacheWrite/total。 */
  usage_json: text("usage_json"),
  /** final 的 stopReason（end_turn / tool_use / max_tokens 等）。 */
  stop_reason: text("stop_reason"),
  created_at_local: integer("created_at_local", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
  created_at_remote: integer("created_at_remote", { mode: "number" }),
})

/**
 * 每一次 agent turn 的运行快照:调 openclaw chat.send 前,kaiwu 注入给 plugin 的
 * system_prompt / history_text + 实际发给 agent 的 sent_message 全部落库,用于链路追踪。
 *
 * 一次 user 消息 → fan-out 到 N 个 member → N 行 chat_turns(turn_run_id 唯一)。
 * 可按 turn_run_id JOIN chat_messages 拉全链路(输入 + prompt + 上下文 + 输出)。
 */
export const chatTurns = sqliteTable("chat_turns", {
  id: pk(),
  session_id: text("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  member_id: text("member_id")
    .notNull()
    .references(() => chatSessionMembers.id, { onDelete: "cascade" }),
  /** idempotencyKey,可 JOIN chat_messages.turn_run_id。 */
  turn_run_id: text("turn_run_id").notNull().unique(),
  /** openclaw 侧 sessionKey(用于定位该 run 在龙虾那边对应的 session)。 */
  session_key: text("session_key").notNull(),
  /** 冗余,便于按 agent 筛选无需 JOIN。 */
  agent_id: text("agent_id").notNull(),
  /** 该 member 当时配的 model.primary(可能与实际 session 运行时 model 不同)。 */
  model: text("model"),
  /** 触发本 run 的上游消息 id(user msg 或 agent msg,引用 chat_messages.id)。 */
  trigger_message_id: text("trigger_message_id"),
  /** kaiwu 推给 plugin 的 instruction(即 agent 看到的 system prompt)。 */
  system_prompt: text("system_prompt").notNull(),
  /** kaiwu 推给 plugin 的 sharedHistory(序列化的群聊流水)。 */
  history_text: text("history_text"),
  /** 剥离 @ 后真正发给 openclaw chat.send 的消息文本。 */
  sent_message: text("sent_message").notNull(),
  /** 推 context + chat.send 的时刻。 */
  sent_at: integer("sent_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
  created_at: createdAt(),
})

export const chatBudgetState = sqliteTable("chat_budget_state", {
  session_id: text("session_id")
    .primaryKey()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  rounds_used: integer("rounds_used", { mode: "number" })
    .notNull()
    .$defaultFn(() => 0),
  started_at: integer("started_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
  updated_at: integer("updated_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdate(() => Date.now()),
})
