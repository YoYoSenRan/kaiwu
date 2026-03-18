import { pgTable, varchar, jsonb, text, uuid, integer, timestamp } from "drizzle-orm/pg-core"
import { projects } from "./projects"

export const agents = pgTable("agents", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  title: varchar("title").notNull(),
  emoji: varchar("emoji").notNull(),
  stageType: varchar("stage_type").notNull(),
  personality: jsonb("personality"),
  status: varchar("status").default("idle").notNull(),
  activity: text("activity"),
  activityDetail: jsonb("activity_detail"),
  currentProject: uuid("current_project").references(() => projects.id),
  level: integer("level").default(1).notNull(),
  levelName: varchar("level_name").default("初出茅庐"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
