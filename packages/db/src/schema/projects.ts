import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core"
import { keywords } from "./keywords"

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    keywordId: uuid("keyword_id").references(() => keywords.id),
    name: varchar("name"),
    slug: varchar("slug").unique(),
    description: text("description"),
    status: varchar("status").notNull(),
    currentPhase: varchar("current_phase"),
    productUrl: varchar("product_url"),
    repoUrl: varchar("repo_url"),
    startedAt: timestamp("started_at"),
    launchedAt: timestamp("launched_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_projects_status").on(t.status), index("idx_projects_current_phase").on(t.currentPhase)]
)
