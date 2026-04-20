/**
 * chat_sessions 表数据访问。
 */

import { asc, eq } from "drizzle-orm"
import { database } from "../../../database/client"
import { chatSessions } from "../../../database/schema"
import type { BudgetConfig, ChatMode, ChatSession, StrategyConfig } from "../types"

export function insertSession(s: {
  id: string
  mode: ChatMode
  label: string | null
  openclawKey: string | null
  budget: BudgetConfig
  strategy: StrategyConfig
  supervisorId: string | null
}): void {
  database()
    .insert(chatSessions)
    .values({
      id: s.id,
      mode: s.mode,
      label: s.label,
      openclaw_key: s.openclawKey,
      budget_json: JSON.stringify(s.budget),
      strategy_json: JSON.stringify(s.strategy),
      supervisor_id: s.supervisorId,
    })
    .run()
}

export function listSessions(): ChatSession[] {
  const rows = database().select().from(chatSessions).orderBy(asc(chatSessions.created_at)).all()
  return rows.map(rowToSession)
}

export function getSession(id: string): ChatSession | null {
  const row = database().select().from(chatSessions).where(eq(chatSessions.id, id)).get()
  return row ? rowToSession(row) : null
}

export function setSessionArchived(id: string, archived: boolean): void {
  database().update(chatSessions).set({ archived }).where(eq(chatSessions.id, id)).run()
}

export function setSessionSupervisor(id: string, supervisorId: string | null): void {
  database().update(chatSessions).set({ supervisor_id: supervisorId }).where(eq(chatSessions.id, id)).run()
}

export function deleteSession(id: string): void {
  database().delete(chatSessions).where(eq(chatSessions.id, id)).run()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSession(row: any): ChatSession {
  return {
    id: row.id,
    mode: row.mode,
    label: row.label,
    openclawKey: row.openclaw_key,
    budget: JSON.parse(row.budget_json) as BudgetConfig,
    strategy: JSON.parse(row.strategy_json) as StrategyConfig,
    supervisorId: row.supervisor_id,
    archived: !!row.archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
