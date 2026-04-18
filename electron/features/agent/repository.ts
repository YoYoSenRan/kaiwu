/**
 * kaiwu 本地 agents 表的纯函数 CRUD。
 *
 * 只存三列 agent_id / created_at / updated_at，其他字段以 openclaw gateway 为准。
 */

import { eq } from "drizzle-orm"
import { database } from "../../database/client"
import { agents } from "../../database/schema"
import type { AgentRow } from "./contracts"

export function listAll(): AgentRow[] {
  const rows = database().select().from(agents).all()
  return rows.map(toRow)
}

export function get(agentId: string): AgentRow | null {
  const row = database().select().from(agents).where(eq(agents.agent_id, agentId)).get()
  return row ? toRow(row) : null
}

export function insert(agentId: string): AgentRow {
  const now = Date.now()
  database()
    .insert(agents)
    .values({ agent_id: agentId, created_at: now, updated_at: now })
    .onConflictDoNothing()
    .run()
  return { agentId, createdAt: now, updatedAt: now }
}

/** 批量导入未同步 agent。INSERT OR IGNORE 语义，返回尝试插入的数量。 */
export function insertMany(agentIds: string[]): number {
  if (agentIds.length === 0) return 0
  const now = Date.now()
  const rows = agentIds.map((id) => ({ agent_id: id, created_at: now, updated_at: now }))
  database().insert(agents).values(rows).onConflictDoNothing().run()
  return agentIds.length
}

export function touch(agentId: string): void {
  database().update(agents).set({ updated_at: Date.now() }).where(eq(agents.agent_id, agentId)).run()
}

export function remove(agentId: string): void {
  database().delete(agents).where(eq(agents.agent_id, agentId)).run()
}

function toRow(raw: typeof agents.$inferSelect): AgentRow {
  return { agentId: raw.agent_id, createdAt: raw.created_at, updatedAt: raw.updated_at }
}
