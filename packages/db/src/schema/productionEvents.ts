import { jsonb, pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core"
import { productions } from "./productions"

/** 全量事件流（append-only）——状态变更、Agent 输出、调度触发等，支持时间线回放 */
export const productionEvents = pgTable(
  "production_events",
  {
    id: serial("id").primaryKey(),
    /** 关联作品（系统级事件可为空） */
    productionId: text("production_id").references(() => productions.id, { onDelete: "cascade" }),
    /** 事件主题：production.created / stage.changed / agent.output / task.progress 等 */
    topic: text("topic").notNull(),
    /** 事件子类型：state.planning / verdict.reject 等 */
    eventType: text("event_type").notNull(),
    /** 事件产生者：system / agent.zhongshu 等 */
    producer: text("producer").notNull(),
    /** 事件负载（结构因 topic 而异） */
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("production_events_production_id_idx").on(table.productionId),
    index("production_events_topic_idx").on(table.topic),
    index("production_events_created_at_idx").on(table.createdAt),
    index("production_events_production_topic_idx").on(table.productionId, table.topic),
  ]
)

export type ProductionEvent = typeof productionEvents.$inferSelect
export type NewProductionEvent = typeof productionEvents.$inferInsert
