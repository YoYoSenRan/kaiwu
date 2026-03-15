import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"

/** 系统键值配置，Console UI 可管理 */
export const settings = pgTable("settings", {
  /** 配置键，如 openclaw.gateway_url */
  key: text("key").primaryKey(),
  /** 配置值（支持任意 JSON 结构） */
  value: jsonb("value").notNull(),
  /** 配置说明 */
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type Setting = typeof settings.$inferSelect
export type NewSetting = typeof settings.$inferInsert
