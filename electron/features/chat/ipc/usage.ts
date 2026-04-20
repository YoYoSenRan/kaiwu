/**
 * @Handle("usage:*" | "budget:*" | "inspect:*") 处理器集中地。
 *
 * 三类只读 RPC 合并到一个文件:都是会话粒度的状态/统计读取。
 *
 * usage:    openclaw `sessions.list` 取 token / context window / cost(无本地累加)
 * budget:   kaiwu 本地 `chat_budget_state` 行的 maxRounds / 已用次数
 * inspect:  会话详情聚合(session + members + messages + turns)
 */

import { scope } from "../../../infra/logger"
import { getGateway } from "../../openclaw/runtime"
import type { GatewaySessionRow, SessionsListResult } from "../../openclaw/contracts/rpc"
import { getBudgetState, getSession, getTurn, listMembers, listMessages, listTurns, resetBudgetState } from "../repository"
import type { BudgetState, ChatSessionDetail, ChatTurn, SessionUsage } from "../types"

const log = scope("chat:ipc:usage")

// ---------- usage:* ----------

export async function get(sessionId: string): Promise<SessionUsage | null> {
  const members = listMembers(sessionId)
  const member = members[0]
  if (!member) return null
  return fetchSessionUsage(member.openclawKey)
}

export async function getMembers(sessionId: string): Promise<Record<string, SessionUsage>> {
  const members = listMembers(sessionId)
  if (members.length === 0) return {}
  const keyMap = await fetchManySessionUsages(members.map((m) => m.openclawKey))
  const out: Record<string, SessionUsage> = {}
  for (const m of members) {
    const u = keyMap[m.openclawKey]
    if (u) out[m.id] = u
  }
  return out
}

async function fetchSessionUsage(openclawKey: string): Promise<SessionUsage | null> {
  try {
    const resp = await getGateway().call<SessionsListResult>("sessions.list", { includeGlobal: true })
    const needle = openclawKey.toLowerCase()
    const row = resp.sessions.find((s) => s.key.toLowerCase() === needle)
    return row ? rowToUsage(row) : null
  } catch (err) {
    log.warn(`fetchSessionUsage failed openclawKey=${openclawKey}: ${(err as Error).message}`)
    return null
  }
}

async function fetchManySessionUsages(openclawKeys: string[]): Promise<Record<string, SessionUsage>> {
  if (openclawKeys.length === 0) return {}
  try {
    const resp = await getGateway().call<SessionsListResult>("sessions.list", { includeGlobal: true })
    const map = new Map<string, GatewaySessionRow>()
    for (const r of resp.sessions) map.set(r.key.toLowerCase(), r)
    const out: Record<string, SessionUsage> = {}
    for (const key of openclawKeys) {
      const row = map.get(key.toLowerCase())
      if (row) out[key] = rowToUsage(row)
    }
    return out
  } catch (err) {
    log.warn(`fetchManySessionUsages failed: ${(err as Error).message}`)
    return {}
  }
}

function rowToUsage(row: GatewaySessionRow): SessionUsage {
  return {
    totalTokens: row.totalTokens ?? null,
    contextTokens: row.contextTokens ?? null,
    fresh: row.totalTokensFresh === true,
    model: row.model ?? null,
    estimatedCostUsd: row.estimatedCostUsd ?? null,
    latestCompactionAt: row.latestCompactionCheckpoint?.at ?? null,
  }
}

// ---------- budget:* ----------

export async function budgetGet(sessionId: string): Promise<BudgetState | null> {
  return getBudgetState(sessionId)
}

export async function budgetReset(sessionId: string): Promise<void> {
  resetBudgetState(sessionId)
}

// ---------- inspect:* ----------

export async function inspectSessionDetail(sessionId: string): Promise<ChatSessionDetail | null> {
  const session = getSession(sessionId)
  if (!session) return null
  return {
    session,
    members: listMembers(sessionId),
    messages: listMessages(sessionId),
    turns: listTurns(sessionId),
  }
}

export async function inspectTurn(turnRunId: string): Promise<ChatTurn | null> {
  return getTurn(turnRunId)
}
