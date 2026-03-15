import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { users } from "./users"

/** 登录会话，Token-based 认证 */
export const sessions = pgTable("sessions", {
  /** 会话 Token（UUID 或随机字符串），存于 HttpOnly Cookie */
  id: text("id").primaryKey(),
  /** 关联用户 */
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  /** 过期时间 */
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
