/**
 * openclaw chat.history 消息与本地 kaiwu 消息的精确匹配工具。
 *
 * 用途:live 路径只插入消息骨架(usage=null),随后拉 openclaw history 精确定位刚生成那条消息,
 * upsert 回填 usage/model/stopReason。匹配策略按可信度降序:
 *
 *   1. openclawMessageId 相等(reconcile 场景)— 最权威
 *   2. role=assistant + content 指纹相等 + 时间窗口 ±30s — live 场景
 *   3. 无匹配 → 放弃本次,等下一次对账
 *
 * content 指纹 = trim 后前 200 字符,同 sessionKey 内基本唯一(Anthropic 不会生成两条完全一样的回复)。
 */

import type { MessageUsage } from "./types"

/** openclaw chat.history messages[] 中单条的形状(只列本模块用到的字段)。 */
export interface OpenclawHistoryMessage {
  role: string
  content?: string
  model?: string
  stopReason?: string
  timestamp?: number
  usage?: {
    input?: number
    output?: number
    cacheRead?: number
    cacheWrite?: number
    totalTokens?: number
    total?: number
  }
  __openclaw?: { id?: string }
}

/** 匹配候选输入:来自 kaiwu 本地 DB 的 agent 消息线索。 */
export interface LocalMessageClue {
  openclawMessageId: string | null
  contentText: string
  createdAtLocal: number
}

/** 匹配窗口:live 路径消息和 openclaw 写入之间容忍的时间误差。 */
const TIME_WINDOW_MS = 30_000
const FINGERPRINT_LEN = 200

function fingerprint(text: string): string {
  return text.trim().slice(0, FINGERPRINT_LEN)
}

/**
 * 在 openclaw history 里找对应 local 消息的那一条。
 * 优先 id 精确匹配,否则 content 指纹 + 时间窗口模糊匹配。
 */
export function matchOpenclawMessage(local: LocalMessageClue, history: OpenclawHistoryMessage[]): OpenclawHistoryMessage | null {
  // 1. id 精确匹配
  if (local.openclawMessageId) {
    const byId = history.find((m) => m.__openclaw?.id === local.openclawMessageId)
    if (byId) return byId
  }
  // 2. 指纹 + 时间窗口 + assistant 角色
  const fp = fingerprint(local.contentText)
  if (!fp) return null
  const lo = local.createdAtLocal - TIME_WINDOW_MS
  const hi = local.createdAtLocal + TIME_WINDOW_MS
  return (
    history.find((m) => {
      if (m.role !== "assistant") return false
      if (fingerprint(m.content ?? "") !== fp) return false
      // 没 timestamp 的也算(openclaw 部分历史可能缺)
      if (m.timestamp != null && (m.timestamp < lo || m.timestamp > hi)) return false
      return true
    }) ?? null
  )
}

/** 把 openclaw usage 对象规范化为 kaiwu MessageUsage 形状。 */
export function normalizeUsage(u: OpenclawHistoryMessage["usage"] | undefined): MessageUsage | null {
  if (!u) return null
  return {
    input: u.input,
    output: u.output,
    cacheRead: u.cacheRead,
    cacheWrite: u.cacheWrite,
    total: u.total ?? u.totalTokens,
  }
}
