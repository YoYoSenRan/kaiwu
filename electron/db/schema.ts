import { sql } from "drizzle-orm"
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"

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
