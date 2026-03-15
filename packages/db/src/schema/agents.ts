import { boolean, jsonb, pgTable, text, timestamp, index } from "drizzle-orm/pg-core"

/**
 * AI Agent 角色定义，通过 stage_type 关联流水线阶段。
 * 只存 Kaiwu 侧管理元数据。
 * 工作区内容（SOUL.md、Skills）和模型配置直接读 OpenClaw 运行时，不入库。
 */
export const agents = pgTable(
  "agents",
  {
    /** Agent 标识符，如 zhongshu、bingbu（同步自 openclaw.json） */
    id: text("id").primaryKey(),
    /** 流水线逻辑角色：triage / planning / review / dispatch / execute / publish */
    stageType: text("stage_type").notNull(),
    /** execute 阶段的细分角色：code / doc / data / audit / infra / hr（其他阶段为空） */
    subRole: text("sub_role"),
    /** Kaiwu 侧配置：超时、重试等 */
    config: jsonb("config").notNull().default({}),
    /** 是否启用 */
    isEnabled: boolean("is_enabled").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("agents_stage_type_idx").on(table.stageType)]
)

export type Agent = typeof agents.$inferSelect
export type NewAgent = typeof agents.$inferInsert
