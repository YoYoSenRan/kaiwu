import { pgTable, uuid, varchar, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core"
import { projects } from "./projects"

export const phases = pgTable(
  "phases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => projects.id)
      .notNull(),
    type: varchar("type").notNull(),
    status: varchar("status").default("pending").notNull(),
    attempt: integer("attempt").default(1).notNull(),
    failCount: integer("fail_count").default(0).notNull(),
    input: jsonb("input"),
    output: jsonb("output"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_phases_project_type").on(t.projectId, t.type)]
)
