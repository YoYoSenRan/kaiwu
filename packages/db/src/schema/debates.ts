import { pgTable, uuid, varchar, integer, text, jsonb, timestamp, index } from "drizzle-orm/pg-core"
import { phases } from "./phases"
import { agents } from "./agents"

export const debates = pgTable(
  "debates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    phaseId: uuid("phase_id")
      .references(() => phases.id)
      .notNull(),
    round: integer("round").notNull(),
    agentId: varchar("agent_id")
      .references(() => agents.id)
      .notNull(),
    content: text("content").notNull(),
    citations: jsonb("citations"),
    stance: varchar("stance").notNull(),
    keyPoint: varchar("key_point"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_debates_phase_round").on(t.phaseId, t.round)]
)
