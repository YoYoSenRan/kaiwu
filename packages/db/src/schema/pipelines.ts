import { integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core"
import { themes } from "./themes"

/** 流水线阶段定义，每个主题下有一套完整的阶段配置 */
export const pipelines = pgTable(
  "pipelines",
  {
    id: serial("id").primaryKey(),
    /** 所属主题 */
    themeId: integer("theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    /** 逻辑阶段标识，业务代码只认此值：triage / planning / review / dispatch / execute / publish */
    stageType: text("stage_type").notNull(),
    /** 流水线中的顺序（越小越靠前） */
    sortOrder: integer("sort_order").notNull(),
    /** 该主题下的阶段名称，如「中书省」「架构师」 */
    label: text("label").notNull(),
    /** 阶段 emoji，如 📜 🤖 */
    emoji: text("emoji").notNull().default(""),
    /** 阶段职责描述 */
    description: text("description"),
    /** 阶段专属色值，如 #a07aff */
    color: text("color"),
    /** 阶段配置：超时阈值、最大重试、can_reject_to、flavor_text 等 */
    config: jsonb("config").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("pipelines_theme_stage_unique").on(table.themeId, table.stageType), index("pipelines_theme_sort_idx").on(table.themeId, table.sortOrder)]
)

export const StageType = { Triage: "triage", Planning: "planning", Review: "review", Dispatch: "dispatch", Execute: "execute", Publish: "publish" } as const
export type StageType = (typeof StageType)[keyof typeof StageType]

export type Pipeline = typeof pipelines.$inferSelect
export type NewPipeline = typeof pipelines.$inferInsert
