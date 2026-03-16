import { boolean, jsonb, pgTable, text, timestamp, index } from "drizzle-orm/pg-core"

/**
 * AI Agent 配置，核心字段独立列 + config JSONB 兜底。
 * 数据同步自 OpenClaw 运行时（openclaw.json），Console 可修改后写回。
 */
export const agents = pgTable(
  "agents",
  {
    /** Agent 标识符，如 zhongshu、bingbu（同步自 openclaw.json） */
    id: text("id").primaryKey(),
    /** 展示名称，同步自 openclaw.json 或模板 manifest */
    name: text("name").notNull(),
    /** 流水线逻辑角色：triage / planning / review / dispatch / execute / publish */
    stageType: text("stage_type").notNull(),
    /** execute 阶段的细分角色：code / doc / data / audit / infra / hr（其他阶段为空） */
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
  },
  (table) => [index("agents_stage_type_idx").on(table.stageType)]
)

export type Agent = typeof agents.$inferSelect
export type NewAgent = typeof agents.$inferInsert
