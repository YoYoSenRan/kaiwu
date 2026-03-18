import { pgTable, uuid, varchar, real, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core"
import { agents } from "./agents"

export const agentStats = pgTable(
  "agent_stats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: varchar("agent_id")
      .references(() => agents.id)
      .notNull(),
    statKey: varchar("stat_key").notNull(),
    rawValue: real("raw_value").default(0).notNull(),
    starLevel: integer("star_level").default(1).notNull(),
    sampleSize: integer("sample_size").default(0).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("idx_agent_stats_key").on(t.agentId, t.statKey)]
)
