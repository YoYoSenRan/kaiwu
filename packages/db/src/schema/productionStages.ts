import { integer, jsonb, pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core"
import { productions } from "./productions"
import { agents } from "./agents"

/** 流转审计表（append-only）——每次阶段变更记一条，Site 上渲染为时间线故事 */
export const productionStages = pgTable(
  "production_stages",
  {
    id: serial("id").primaryKey(),
    /** 关联作品 */
    productionId: text("production_id")
      .notNull()
      .references(() => productions.id, { onDelete: "cascade" }),
    /** 来源阶段（首条记录为空） */
    fromStage: text("from_stage"),
    /** 目标阶段 */
    toStage: text("to_stage").notNull(),
    /** 执行此操作的 Agent */
    agentId: text("agent_id").references(() => agents.id),
    /** 决策：proceed（通过）/ reject（驳回）/ block（阻塞） */
    verdict: text("verdict").notNull().default("proceed"),
    /** 决策理由/备注 */
    reason: text("reason"),
    /** 在上一阶段停留的秒数 */
    durationSec: integer("duration_sec"),
    /** 扩展元数据：token 消耗、成本等 */
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("production_stages_production_id_idx").on(table.productionId),
    index("production_stages_created_at_idx").on(table.createdAt),
    index("production_stages_production_created_idx").on(table.productionId, table.createdAt),
  ]
)

export const StageVerdict = { Proceed: "proceed", Reject: "reject", Block: "block" } as const
export type StageVerdict = (typeof StageVerdict)[keyof typeof StageVerdict]

export type ProductionStage = typeof productionStages.$inferSelect
export type NewProductionStage = typeof productionStages.$inferInsert
