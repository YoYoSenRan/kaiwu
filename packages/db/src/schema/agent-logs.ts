import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from "drizzle-orm/pg-core"
import { agents } from "./agents"
import { projects } from "./projects"
import { phases } from "./phases"
import { tasks } from "./tasks"

export const agentLogs = pgTable(
  "agent_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: varchar("agent_id")
      .references(() => agents.id)
      .notNull(),
    projectId: uuid("project_id").references(() => projects.id),
    phaseId: uuid("phase_id").references(() => phases.id),
    taskId: uuid("task_id").references(() => tasks.id),
    type: varchar("type").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata"),
    visibility: varchar("visibility").default("internal").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_agent_logs_project_id").on(t.projectId), index("idx_agent_logs_agent_id").on(t.agentId)]
)
