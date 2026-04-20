/**
 * @Handle("budget:*") 处理器。
 */

import { getBudgetState, resetBudgetState } from "../repository"
import type { BudgetState } from "../types"

export async function get(sessionId: string): Promise<BudgetState | null> {
  return getBudgetState(sessionId)
}

export async function reset(sessionId: string): Promise<void> {
  resetBudgetState(sessionId)
}
