import { pgTable, uuid, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core"
import { users } from "./users"
import { keywords } from "./keywords"

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    keywordId: uuid("keyword_id")
      .references(() => keywords.id)
      .notNull(),
    stance: varchar("stance").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("idx_votes_user_keyword").on(t.userId, t.keywordId)]
)
