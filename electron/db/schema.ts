import { sql } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

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
