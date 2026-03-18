import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core"
import { projects } from "./projects"
import { phases } from "./phases"
import { agents } from "./agents"

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => projects.id)
      .notNull(),
    phaseId: uuid("phase_id")
      .references(() => phases.id)
      .notNull(),
    title: varchar("title").notNull(),
    description: text("description"),
    status: varchar("status").default("pending").notNull(),
    priority: integer("priority").default(1).notNull(),
    assignedAgent: varchar("assigned_agent").references(() => agents.id),
    subRole: varchar("sub_role"),
    dependsOn: uuid("depends_on").array(),
    result: jsonb("result"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_tasks_project_status").on(t.projectId, t.status), index("idx_tasks_assigned_agent").on(t.assignedAgent, t.status)]
)
