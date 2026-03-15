import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core"

/** Console 管理后台登录用户 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  /** 登录用户名 */
  username: text("username").notNull().unique(),
  /** 密码哈希（bcrypt/argon2） */
  passwordHash: text("password_hash").notNull(),
  /** 显示名称 */
  displayName: text("display_name"),
  /** 角色：admin / viewer */
  role: text("role").notNull().default("admin"),
  /** 是否启用（软禁用，不做物理删除） */
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
