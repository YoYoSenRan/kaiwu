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
  mode: text("mode").notNull().$type<"single" | "group">(),
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
  turn_run_id: text("turn_run_id"),
  tags_json: text("tags_json"),
  created_at_local: integer("created_at_local", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
  created_at_remote: integer("created_at_remote", { mode: "number" }),
})

export const chatBudgetState = sqliteTable("chat_budget_state", {
  session_id: text("session_id")
    .primaryKey()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  rounds_used: integer("rounds_used", { mode: "number" })
    .notNull()
    .$defaultFn(() => 0),
  tokens_used: integer("tokens_used", { mode: "number" })
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
