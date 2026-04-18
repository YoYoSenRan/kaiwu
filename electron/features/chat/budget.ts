/**
 * 预算/终止检查。每轮 chat.send 前调 checkAndIncrement()。
 */

import { getBudgetState, upsertBudgetState } from "./repository"
import type { BudgetConfig, BudgetState, LoopEndedReason } from "./types"

const DEFAULTS: Required<BudgetConfig> = {
  maxRounds: 20,
  maxTokens: 100_000,
  stopPhrase: "",
  wallClockSec: 300,
}

export function withDefaults(cfg: BudgetConfig): Required<BudgetConfig> {
  return { ...DEFAULTS, ...cfg }
}

/** 确保 session 有 budget_state 行，无则建。 */
export function ensureBudgetState(sessionId: string): BudgetState {
  const existing = getBudgetState(sessionId)
  if (existing) return existing
  const fresh: BudgetState = { sessionId, roundsUsed: 0, tokensUsed: 0, startedAt: Date.now(), updatedAt: Date.now() }
  upsertBudgetState(fresh)
  return fresh
}

/**
 * 增加一轮 + 检查是否超限。
 * @returns 若未超 {exceeded:false}；否则 {exceeded:true, reason}
 */
export function checkAndIncrementRound(
  sessionId: string,
  cfg: BudgetConfig,
): { exceeded: false } | { exceeded: true; reason: LoopEndedReason } {
  const merged = withDefaults(cfg)
  const state = ensureBudgetState(sessionId)
  const next: BudgetState = { ...state, roundsUsed: state.roundsUsed + 1, updatedAt: Date.now() }
  upsertBudgetState(next)

  if (next.roundsUsed > merged.maxRounds) return { exceeded: true, reason: "budget_max_rounds" }
  if (next.tokensUsed > merged.maxTokens) return { exceeded: true, reason: "budget_max_tokens" }
  if (Date.now() - next.startedAt > merged.wallClockSec * 1000) return { exceeded: true, reason: "budget_wall_clock" }
  return { exceeded: false }
}

export function addTokens(sessionId: string, tokens: number): void {
  const s = ensureBudgetState(sessionId)
  upsertBudgetState({ ...s, tokensUsed: s.tokensUsed + tokens, updatedAt: Date.now() })
}

export function checkStopPhrase(text: string, cfg: BudgetConfig): boolean {
  const phrase = cfg.stopPhrase?.trim()
  if (!phrase) return false
  return text.includes(phrase)
}
