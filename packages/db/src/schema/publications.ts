import { jsonb, pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core"
import { productions } from "./productions"
import { agents } from "./agents"

/** 发布记录——跟踪自动部署发布的全过程，一个作品可发布到多个渠道 */
export const publications = pgTable(
  "publications",
  {
    id: serial("id").primaryKey(),
    /** 关联作品 */
    productionId: text("production_id")
      .notNull()
      .references(() => productions.id, { onDelete: "cascade" }),
    /** 发布渠道：site / blog / social / email / feishu 等 */
    channel: text("channel").notNull(),
    /** 状态：pending / deploying / published / failed / retrying */
    status: text("status").notNull().default("pending"),
    /** 执行发布的 Agent */
    agentId: text("agent_id").references(() => agents.id),
    /** 发布后的最终 URL */
    publishedUrl: text("published_url"),
    /** 发布后的文件路径 */
    publishedPath: text("published_path"),
    /** 部署日志（错误排查用） */
    deployLog: text("deploy_log"),
    /** 扩展元数据：部署配置、CDN 状态等 */
    meta: jsonb("meta").notNull().default({}),
    /** 实际发布时间 */
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("publications_production_id_idx").on(table.productionId),
    index("publications_status_idx").on(table.status),
    index("publications_channel_idx").on(table.channel),
  ]
)

export const PublicationStatus = { Pending: "pending", Deploying: "deploying", Published: "published", Failed: "failed", Retrying: "retrying" } as const
export type PublicationStatus = (typeof PublicationStatus)[keyof typeof PublicationStatus]

export type Publication = typeof publications.$inferSelect
export type NewPublication = typeof publications.$inferInsert
