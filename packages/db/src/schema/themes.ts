import { boolean, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core"

/** 可替换的叙事主题（如三省六部、赛博朋克），系统同时只有一个激活主题 */
export const themes = pgTable("themes", {
  id: serial("id").primaryKey(),
  /** 主题标识符，如 sansheng-liubu、cyberpunk */
  slug: text("slug").notNull().unique(),
  /** 主题显示名，如 三省六部、赛博朋克 */
  name: text("name").notNull(),
  /** 主题简介 */
  description: text("description"),
  /** 是否为当前激活主题（全局唯一 true） */
  isActive: boolean("is_active").notNull().default(false),
  /** 主题级配置：色值体系、字体、flavor text 术语映射等 */
  config: jsonb("config").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type Theme = typeof themes.$inferSelect
export type NewTheme = typeof themes.$inferInsert
