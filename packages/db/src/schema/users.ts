import { pgTable, uuid, varchar, integer, timestamp, date, uniqueIndex } from "drizzle-orm/pg-core"

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    githubId: varchar("github_id").unique().notNull(),
    username: varchar("username").unique().notNull(),
    avatarUrl: varchar("avatar_url"),
    githubStars: integer("github_stars").default(0),
    githubCreated: timestamp("github_created"),
    lastSubmitAt: date("last_submit_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("idx_users_github_id").on(t.githubId)]
)
