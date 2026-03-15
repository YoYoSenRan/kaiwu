import { boolean, integer, jsonb, pgTable, text, timestamp, index } from "drizzle-orm/pg-core"
import { proposals } from "./proposals"
import { agents } from "./agents"

/** 正式立项的内容作品——流水线核心主表 */
export const productions = pgTable(
  "productions",
  {
    /** 作品 ID，格式 KW-YYYYMMDD-NNN */
    id: text("id").primaryKey(),
    /** 关联选题（手动创建时为空） */
    proposalId: integer("proposal_id").references(() => proposals.id),
    /** 作品标题 */
    title: text("title").notNull(),
    /** 详细描述 */
    description: text("description"),
    /** 业务状态：triage / planning / review / rejected / dispatch / executing / publishing / done / cancelled / blocked */
    status: text("status").notNull().default("triage"),
    /** 当前所在流水线阶段（stage_type） */
    currentStage: text("current_stage").notNull().default("triage"),
    /** 当前处理的 Agent */
    currentAgent: text("current_agent").references(() => agents.id),
    /** 优先级：low / normal / high / urgent */
    priority: text("priority").notNull().default("normal"),
    /** 产出目录绝对路径 */
    outputDir: text("output_dir"),
    /** 验收标准 */
    acceptanceCriteria: text("acceptance_criteria"),
    /** 标签 */
    tags: jsonb("tags").notNull().default([]),
    /** 扩展元数据 */
    meta: jsonb("meta").notNull().default({}),
    /** 开始处理时间 */
    startedAt: timestamp("started_at"),
    /** 完成时间 */
    completedAt: timestamp("completed_at"),
    /** 是否归档（完成/取消后归档，看板默认不显示） */
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("productions_status_idx").on(table.status),
    index("productions_current_stage_idx").on(table.currentStage),
    index("productions_is_archived_idx").on(table.isArchived),
    index("productions_created_at_idx").on(table.createdAt),
    index("productions_status_archived_idx").on(table.status, table.isArchived),
  ]
)

export const ProductionStatus = {
  Triage: "triage",
  Planning: "planning",
  Review: "review",
  Rejected: "rejected",
  Dispatch: "dispatch",
  Executing: "executing",
  Publishing: "publishing",
  Done: "done",
  Cancelled: "cancelled",
  Blocked: "blocked",
} as const
export type ProductionStatus = (typeof ProductionStatus)[keyof typeof ProductionStatus]

export const TERMINAL_STATUSES = new Set<string>([ProductionStatus.Done, ProductionStatus.Cancelled])

/** 状态流转合法路径 */
export const STATE_TRANSITIONS: Record<string, Set<string>> = {
  [ProductionStatus.Triage]: new Set([ProductionStatus.Planning, ProductionStatus.Cancelled]),
  [ProductionStatus.Planning]: new Set([ProductionStatus.Review, ProductionStatus.Cancelled, ProductionStatus.Blocked]),
  [ProductionStatus.Review]: new Set([ProductionStatus.Dispatch, ProductionStatus.Rejected, ProductionStatus.Cancelled, ProductionStatus.Blocked]),
  [ProductionStatus.Rejected]: new Set([ProductionStatus.Planning]),
  [ProductionStatus.Dispatch]: new Set([ProductionStatus.Executing, ProductionStatus.Cancelled, ProductionStatus.Blocked]),
  [ProductionStatus.Executing]: new Set([ProductionStatus.Publishing, ProductionStatus.Cancelled, ProductionStatus.Blocked]),
  [ProductionStatus.Publishing]: new Set([ProductionStatus.Done, ProductionStatus.Cancelled, ProductionStatus.Blocked]),
  [ProductionStatus.Blocked]: new Set([
    ProductionStatus.Triage,
    ProductionStatus.Planning,
    ProductionStatus.Review,
    ProductionStatus.Dispatch,
    ProductionStatus.Executing,
    ProductionStatus.Publishing,
  ]),
}

export type Production = typeof productions.$inferSelect
export type NewProduction = typeof productions.$inferInsert
