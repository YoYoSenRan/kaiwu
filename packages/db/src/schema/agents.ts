import { boolean, integer, jsonb, pgTable, text, timestamp, index } from "drizzle-orm/pg-core"
import { models } from "./models"

/** AI Agent 角色定义，通过 stage_type 关联流水线阶段 */
export const agents = pgTable(
  "agents",
  {
    /** Agent 标识符，如 zhongshu、bingbu */
    id: text("id").primaryKey(),
    /** 流水线逻辑角色：triage / planning / review / dispatch / execute / publish */
    stageType: text("stage_type").notNull(),
    /** execute 阶段的细分角色：code / doc / data / audit / infra / hr（其他阶段为空） */
    subRole: text("sub_role"),
    /** 当前绑定的 LLM 模型 */
    modelId: integer("model_id").references(() => models.id),
    /** Agent 工作目录路径 */
    workspace: text("workspace"),
    /** Agent 人格 prompt（SOUL.md 内容） */
    soulPrompt: text("soul_prompt"),
    /** 已安装技能列表 [{name, description, path}] */
    skills: jsonb("skills").notNull().default([]),
    /** Agent 级配置：超时、重试等 */
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
