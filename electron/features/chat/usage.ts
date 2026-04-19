/**
 * Session usage 读取层。
 *
 * 所有 token / context 数据都来自 openclaw gateway(`sessions.list`)。
 * kaiwu 不本地累加,不持久化,纯转发读。
 *
 * 字段语义对齐 openclaw `deriveSessionTotalTokens`:
 *   - `totalTokens` 是 prompt 侧快照(input + cacheRead + cacheWrite),不含 output
 *   - `contextTokens` 是当前模型的 context window 容量
 *   - `fresh=false` 时 UI 应降级显示(灰化/stale 标记)
 */

import { scope } from "../../infra/logger"
import { getGateway } from "../openclaw/runtime"
import type { GatewaySessionRow, SessionsListResult } from "../openclaw/contracts/rpc"
import type { SessionUsage } from "./types"

const log = scope("chat:usage")

/**
 * 按 openclawKey 查一次 `sessions.list`,筛出对应 row 的 usage 快照。
 * 未命中或 RPC 失败返 null。openclaw 对 sessionKey 做 lowercase 归一化,这里也比对 lowercase。
 */
export async function fetchSessionUsage(openclawKey: string): Promise<SessionUsage | null> {
  try {
    const resp = await getGateway().call<SessionsListResult>("sessions.list", { includeGlobal: true })
    const needle = openclawKey.toLowerCase()
    const row = resp.sessions.find((s) => s.key.toLowerCase() === needle)
    if (!row) {
      log.warn(`fetchSessionUsage no row openclawKey=${openclawKey} totalRows=${resp.sessions.length} sampleKeys=${resp.sessions.slice(0, 3).map((s) => s.key).join(",")}`)
      return null
    }
    log.info(`fetchSessionUsage row openclawKey=${openclawKey} totalTokens=${row.totalTokens} contextTokens=${row.contextTokens} fresh=${row.totalTokensFresh} model=${row.model}`)
    return rowToUsage(row)
  } catch (err) {
    log.warn(`fetchSessionUsage failed openclawKey=${openclawKey}: ${(err as Error).message}`)
    return null
  }
}

/**
 * 一次 sessions.list 取全,按 lowercase openclawKey 建查询表。
 * 群聊 N 个 member 共享一次 RPC,避免 N 次 round-trip。
 */
export async function fetchManySessionUsages(openclawKeys: string[]): Promise<Record<string, SessionUsage>> {
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
