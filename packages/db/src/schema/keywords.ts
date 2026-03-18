import { pgTable, uuid, varchar, text, integer, real, jsonb, timestamp, index } from "drizzle-orm/pg-core"
import { users } from "./users"

export const keywords = pgTable(
  "keywords",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    text: varchar("text").notNull(),
    reason: text("reason").notNull(),
    source: varchar("source").default("user_submit").notNull(),
    submittedBy: uuid("submitted_by").references(() => users.id),
    score: integer("score"),
    sealVotes: integer("seal_votes").default(0).notNull(),
    blankVotes: integer("blank_votes").default(0).notNull(),
    weight: real("weight").default(0),
    status: varchar("status").default("pending").notNull(),
    preScoutData: jsonb("pre_scout_data"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_keywords_status_weight").on(t.status, t.weight), index("idx_keywords_submitted_by").on(t.submittedBy)]
)
