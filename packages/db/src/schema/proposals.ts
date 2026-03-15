import { jsonb, pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core"

/** 选题/灵感池——流水线入口，宽进严出 */
export const proposals = pgTable(
  "proposals",
  {
    id: serial("id").primaryKey(),
    /** 选题标题 */
    title: text("title").notNull(),
    /** 详细描述 */
    description: text("description"),
    /** 来源类型：manual（手动）/ cron（定时）/ external（外部信号）/ agent（Agent 发现） */
    source: text("source").notNull().default("manual"),
    /** 来源引用：定时任务 ID、外部 URL、Agent ID 等 */
    sourceRef: text("source_ref"),
    /** 状态：pending / approved / rejected / expired */
    status: text("status").notNull().default("pending"),
    /** 优先级：low / normal / high / urgent */
    priority: text("priority").notNull().default("normal"),
    /** 标签列表 ["AI", "竞品", "周报"] */
    tags: jsonb("tags").notNull().default([]),
    /** 来源元数据（结构因 source 而异） */
    meta: jsonb("meta").notNull().default({}),
    /** 审核时间 */
    reviewedAt: timestamp("reviewed_at"),
    /** 审核者（Agent ID 或用户名） */
    reviewedBy: text("reviewed_by"),
    /** 驳回原因 */
    rejectReason: text("reject_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("proposals_status_idx").on(table.status), index("proposals_source_idx").on(table.source), index("proposals_created_at_idx").on(table.createdAt)]
)

export const ProposalSource = { Manual: "manual", Cron: "cron", External: "external", Agent: "agent" } as const
export type ProposalSource = (typeof ProposalSource)[keyof typeof ProposalSource]

export const ProposalStatus = { Pending: "pending", Approved: "approved", Rejected: "rejected", Expired: "expired" } as const
export type ProposalStatus = (typeof ProposalStatus)[keyof typeof ProposalStatus]

export type Proposal = typeof proposals.$inferSelect
export type NewProposal = typeof proposals.$inferInsert
