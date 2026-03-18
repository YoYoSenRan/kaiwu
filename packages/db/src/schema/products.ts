import { pgTable, uuid, varchar, text, jsonb, boolean, timestamp } from "drizzle-orm/pg-core"
import { projects } from "./projects"

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  name: varchar("name").notNull(),
  tagline: varchar("tagline"),
  description: text("description"),
  url: varchar("url"),
  repoUrl: varchar("repo_url"),
  screenshotUrls: varchar("screenshot_urls").array(),
  techStack: varchar("tech_stack").array(),
  metrics: jsonb("metrics"),
  storyPublished: boolean("story_published").default(false),
  launchedAt: timestamp("launched_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
