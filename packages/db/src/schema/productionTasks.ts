import { integer, jsonb, pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core"
import { productions } from "./productions"
import { agents } from "./agents"

/** 实施阶段子任务——由 dispatch Agent 拆分，多个 execute Agent 并行执行，支持树状层级 */
export const productionTasks = pgTable(
  "production_tasks",
  {
    id: serial("id").primaryKey(),
    /** 关联作品 */
    productionId: text("production_id")
      .notNull()
      .references(() => productions.id, { onDelete: "cascade" }),
    /** 父任务 ID（树状结构，顶层为空） */
    parentId: integer("parent_id"),
    /** 子任务标题 */
    title: text("title").notNull(),
    /** 详细描述 */
    description: text("description"),
    /** 负责执行的 Agent */
    agentId: text("agent_id").references(() => agents.id),
    /** 状态：pending / in_progress / done / blocked / cancelled */
    status: text("status").notNull().default("pending"),
    /** 排序 */
    sortOrder: integer("sort_order").notNull().default(0),
    /** 子任务产出文件路径（相对于 production.output_dir） */
    outputPath: text("output_path"),
    /** 检查点 [{name, status}]，比 status 更细粒度的进度跟踪 */
    checkpoints: jsonb("checkpoints").notNull().default([]),
    /** 扩展元数据：token 消耗、耗时等 */
    meta: jsonb("meta").notNull().default({}),
    /** 开始时间 */
    startedAt: timestamp("started_at"),
    /** 完成时间 */
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("production_tasks_production_id_idx").on(table.productionId),
    index("production_tasks_agent_id_idx").on(table.agentId),
    index("production_tasks_status_idx").on(table.status),
    index("production_tasks_parent_id_idx").on(table.parentId),
  ]
)

export const TaskStatus = { Pending: "pending", InProgress: "in_progress", Done: "done", Blocked: "blocked", Cancelled: "cancelled" } as const
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus]

export type ProductionTask = typeof productionTasks.$inferSelect
export type NewProductionTask = typeof productionTasks.$inferInsert
