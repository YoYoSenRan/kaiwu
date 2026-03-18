import { pgTable, uuid, varchar, jsonb, timestamp, serial, index, uniqueIndex } from "drizzle-orm/pg-core"
import { projects } from "./projects"
import { phases } from "./phases"
import { agents } from "./agents"

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seq: serial("seq").unique().notNull(),
    projectId: uuid("project_id").references(() => projects.id),
    phaseId: uuid("phase_id").references(() => phases.id),
    agentId: varchar("agent_id").references(() => agents.id),
    type: varchar("type").notNull(),
    title: varchar("title"),
    detail: jsonb("detail"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("idx_events_seq").on(t.seq),
    index("idx_events_project_id").on(t.projectId),
    index("idx_events_type").on(t.type),
    index("idx_events_created_at").on(t.createdAt),
  ]
)
