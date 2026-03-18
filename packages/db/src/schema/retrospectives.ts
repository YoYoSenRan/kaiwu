import { pgTable, uuid, integer, jsonb, text, timestamp, index } from "drizzle-orm/pg-core"
import { projects } from "./projects"

export const retrospectives = pgTable(
  "retrospectives",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => projects.id)
      .notNull(),
    triggerDay: integer("trigger_day").notNull(),
    metrics: jsonb("metrics"),
    verdicts: jsonb("verdicts"),
    statChanges: jsonb("stat_changes"),
    summary: text("summary"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_retrospectives_project").on(t.projectId)]
)
