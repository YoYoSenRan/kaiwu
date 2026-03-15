import { boolean, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core"

/** 可用 LLM 模型清单，Agent 通过 model_id 绑定 */
export const models = pgTable("models", {
  id: serial("id").primaryKey(),
  /** 模型提供商：anthropic / openai / google 等 */
  provider: text("provider").notNull(),
  /** 模型标识符（传给 LLM API 的实际值），如 anthropic/claude-sonnet-4-6 */
  modelId: text("model_id").notNull().unique(),
  /** UI 显示名称，如 Claude Sonnet 4.6 */
  label: text("label").notNull(),
  /** 是否可用 */
  isEnabled: boolean("is_enabled").notNull().default(true),
  /** 模型配置：温度、max_tokens、成本信息等 */
  config: jsonb("config").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type Model = typeof models.$inferSelect
export type NewModel = typeof models.$inferInsert
