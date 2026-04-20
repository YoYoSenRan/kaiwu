/**
 * chat_budget_state 表数据访问。
 */

import { eq } from "drizzle-orm"
import { database } from "../../../database/client"
import { chatBudgetState } from "../../../database/schema"
import type { BudgetState } from "../types"

export function upsertBudgetState(s: BudgetState): void {
  database()
    .insert(chatBudgetState)
    .values({
      session_id: s.sessionId,
      rounds_used: s.roundsUsed,
      started_at: s.startedAt,
    })
    .onConflictDoUpdate({
      target: chatBudgetState.session_id,
      set: { rounds_used: s.roundsUsed, started_at: s.startedAt },
    })
    .run()
}

export function getBudgetState(sessionId: string): BudgetState | null {
  const row = database().select().from(chatBudgetState).where(eq(chatBudgetState.session_id, sessionId)).get()
  return row
    ? { sessionId: row.session_id, roundsUsed: row.rounds_used, startedAt: row.started_at, updatedAt: row.updated_at }
    : null
}

export function resetBudgetState(sessionId: string): void {
  database().delete(chatBudgetState).where(eq(chatBudgetState.session_id, sessionId)).run()
}
