/**
 * 预算/终止检查。群聊每轮 chat.send 前调 checkAndIncrementRound()。
 *
 * 只保留 kaiwu 应用层护栏(防 agent 互 @ 死循环)。
 * token / 墙钟 / context 由龙虾自身管理,kaiwu 不做自判。
 */

import { getBudgetState, upsertBudgetState } from "../repository"
import type { BudgetConfig, BudgetState, LoopEndedReason } from "../types"

const DEFAULT_MAX_ROUNDS = 200

/** 确保 session 有 budget_state 行，无则建。 */
export function ensureBudgetState(sessionId: string): BudgetState {
  const existing = getBudgetState(sessionId)
  if (existing) return existing
  const fresh: BudgetState = { sessionId, roundsUsed: 0, startedAt: Date.now(), updatedAt: Date.now() }
  upsertBudgetState(fresh)
  return fresh
}

/**
 * 增加一轮 + 检查是否超 maxRounds。
 * @returns 若未超 {exceeded:false}；否则 {exceeded:true, reason}
 */
export function checkAndIncrementRound(sessionId: string, cfg: BudgetConfig): { exceeded: false } | { exceeded: true; reason: LoopEndedReason } {
  const max = cfg.maxRounds ?? DEFAULT_MAX_ROUNDS
  const state = ensureBudgetState(sessionId)
  const next: BudgetState = { ...state, roundsUsed: state.roundsUsed + 1, updatedAt: Date.now() }
  upsertBudgetState(next)

  if (next.roundsUsed > max) return { exceeded: true, reason: "budget_max_rounds" }
  return { exceeded: false }
}

/** agent 回复里匹配到终止文本则返 true;由 group loop 决定终止。 */
export function checkStopPhrase(text: string, cfg: BudgetConfig): boolean {
  const phrase = cfg.stopPhrase?.trim()
  if (!phrase) return false
  return text.includes(phrase)
}
