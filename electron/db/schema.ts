import { sql } from "drizzle-orm"
import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core"

/**
 * kaiwu 本地 agents 表。
 * 字段名保持 snake_case 和 sqlite 列名一致，方便 renderer 侧零转换使用。
 * sync_state 用 text + enum 约束，drizzle 能推导出 union 类型。
 */
export const agents = sqliteTable(
  "agents",
  {
    id: text("id").primaryKey(),
    agent: text("agent").notNull().unique(),
    name: text("name").notNull(),
    workspace: text("workspace").notNull(),
    model: text("model"),
    emoji: text("emoji"),
    avatar: text("avatar"),
    avatar_url: text("avatar_url"),
    created_at: integer("created_at").notNull(),
    updated_at: integer("updated_at").notNull(),
    last_synced_at: integer("last_synced_at"),
    pinned: integer("pinned").notNull().default(0),
    hidden: integer("hidden").notNull().default(0),
    sort_order: integer("sort_order").notNull().default(0),
    tags: text("tags"),
    last_opened_at: integer("last_opened_at"),
    remark: text("remark"),
    sync_state: text("sync_state", { enum: ["ok", "orphan-local", "workspace-missing"] })
      .notNull()
      .default("ok"),
  },
  (table) => [
    // 列表排序常用索引：先过滤 hidden，再按 pinned DESC / sort_order / created_at DESC 排列
    index("idx_agents_list").on(table.hidden, sql`${table.pinned} DESC`, table.sort_order, sql`${table.created_at} DESC`),
  ],
)

/** 知识库。embedding_model 建库时锁定，换模型需重建全部 chunks。 */
export const knowledges = sqliteTable(
  "knowledges",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    embedding_model: text("embedding_model").notNull(),
    chunk_count: integer("chunk_count").notNull().default(0),
    doc_count: integer("doc_count").notNull().default(0),
    created_at: integer("created_at").notNull(),
    updated_at: integer("updated_at").notNull(),
  },
  (table) => [index("idx_knowledges_created").on(sql`${table.created_at} DESC`)],
)

/** 知识库文档。state 跟踪处理进度：pending → processing → ready / failed。 */
export const knowledgeDocuments = sqliteTable(
  "knowledge_documents",
  {
    id: text("id").primaryKey(),
    kb_id: text("kb_id").notNull(),
    title: text("title").notNull(),
    format: text("format", { enum: ["md", "pdf", "docx", "xlsx", "txt"] }).notNull(),
    size: integer("size").notNull(),
    chunk_count: integer("chunk_count").notNull().default(0),
    state: text("state", { enum: ["pending", "processing", "ready", "failed"] })
      .notNull()
      .default("pending"),
    error: text("error"),
    created_at: integer("created_at").notNull(),
    updated_at: integer("updated_at").notNull(),
  },
  (table) => [index("idx_kd_kb").on(table.kb_id, table.state)],
)

/** Agent ↔ 知识库多对多关联。 */
export const agentKnowledge = sqliteTable(
  "agent_knowledge",
  {
    agent_id: text("agent_id").notNull(),
    kb_id: text("kb_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.agent_id, table.kb_id] }), index("idx_ak_agent").on(table.agent_id), index("idx_ak_kb").on(table.kb_id)],
)

/** 对话。config / metadata 为 JSON 文本，TS 侧用 zod 约束结构。 */
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

/** 对话成员（Agent）。复合主键 chat_id + agent_id。 */
export const chatMembers = sqliteTable(
  "chat_members",
  {
    chat_id: text("chat_id").notNull(),
    agent_id: text("agent_id").notNull(),
    session_key: text("session_key"),
    config: text("config").notNull().default("{}"),
  },
  (table) => [primaryKey({ columns: [table.chat_id, table.agent_id] })],
)
