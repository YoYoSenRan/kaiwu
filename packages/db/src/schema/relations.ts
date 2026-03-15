import { relations } from "drizzle-orm"
import { users } from "./users"
import { sessions } from "./sessions"
import { themes } from "./themes"
import { pipelines } from "./pipelines"
import { agents } from "./agents"
import { proposals } from "./proposals"
import { productions } from "./productions"
import { productionStages } from "./productionStages"
import { productionTasks } from "./productionTasks"
import { publications } from "./publications"
import { productionEvents } from "./productionEvents"

/** users ↔ sessions */
export const usersRelations = relations(users, ({ many }) => ({ sessions: many(sessions) }))

export const sessionsRelations = relations(sessions, ({ one }) => ({ user: one(users, { fields: [sessions.userId], references: [users.id] }) }))

/** themes ↔ pipelines */
export const themesRelations = relations(themes, ({ many }) => ({ pipelines: many(pipelines) }))

export const pipelinesRelations = relations(pipelines, ({ one }) => ({ theme: one(themes, { fields: [pipelines.themeId], references: [themes.id] }) }))

/** proposals ↔ productions */
export const proposalsRelations = relations(proposals, ({ many }) => ({ productions: many(productions) }))

/** productions ↔ 所有子表 */
export const productionsRelations = relations(productions, ({ one, many }) => ({
  proposal: one(proposals, { fields: [productions.proposalId], references: [proposals.id] }),
  currentAgentRef: one(agents, { fields: [productions.currentAgent], references: [agents.id] }),
  stages: many(productionStages),
  tasks: many(productionTasks),
  events: many(productionEvents),
  publications: many(publications),
}))

/** production_stages */
export const productionStagesRelations = relations(productionStages, ({ one }) => ({
  production: one(productions, { fields: [productionStages.productionId], references: [productions.id] }),
  agent: one(agents, { fields: [productionStages.agentId], references: [agents.id] }),
}))

/** production_tasks（含自引用 parent） */
export const productionTasksRelations = relations(productionTasks, ({ one, many }) => ({
  production: one(productions, { fields: [productionTasks.productionId], references: [productions.id] }),
  agent: one(agents, { fields: [productionTasks.agentId], references: [agents.id] }),
  parent: one(productionTasks, { fields: [productionTasks.parentId], references: [productionTasks.id], relationName: "taskParent" }),
  children: many(productionTasks, { relationName: "taskParent" }),
}))

/** publications */
export const publicationsRelations = relations(publications, ({ one }) => ({
  production: one(productions, { fields: [publications.productionId], references: [productions.id] }),
  agent: one(agents, { fields: [publications.agentId], references: [agents.id] }),
}))

/** production_events */
export const productionEventsRelations = relations(productionEvents, ({ one }) => ({
  production: one(productions, { fields: [productionEvents.productionId], references: [productions.id] }),
}))
