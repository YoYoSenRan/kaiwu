/**
 * @mention 文本处理:从消息文本中提取被 @ 的成员 + 清洗发给 agent 的副本。
 *
 * 心智模型:
 *   - chat_messages.content 保留原文(含 @),用于 UI 展示和审计
 *   - 真正发给 openclaw chat.send 的 message 走 cleaned 副本(剥掉 @,因为路由已通过 mentions 数组传达)
 *
 * 单次扫描设计:scanMentions 一次正则遍历同时输出 mentions + cleaned text,
 * 避免 parseMentionsFromText / stripMentionsForAgent 各自再扫一遍。
 */

import type { ChatMember, ChatMention } from "../types"

/** scan 输出。 */
export interface MentionScanResult {
  /** 解析到的 mention(去重,首次出现即记录,source="plain")。 */
  mentions: ChatMention[]
  /** 剥掉 @ 后的干净文本(用于发给 agent)。 */
  stripped: string
}

/**
 * 单次扫描:遍历 text,把 @<agentId>(member 列表中的)同时收集 + 删除。
 * - 大小写不敏感
 * - 同 agentId 多次出现只保留第一次的 range
 * - 排除 sender 自己
 */
export function scanMentions(text: string, members: Pick<ChatMember, "agentId">[], excludeSelfAgentId?: string): MentionScanResult {
  if (!text || members.length === 0) return { mentions: [], stripped: text.replace(/[ \t]+/g, " ").trim() }

  const idsByLower = new Map<string, string>()
  for (const m of members) {
    if (excludeSelfAgentId && m.agentId.toLowerCase() === excludeSelfAgentId.toLowerCase()) continue
    idsByLower.set(m.agentId.toLowerCase(), m.agentId)
  }

  // 单 regex 匹配所有候选 @,按出现顺序处理。
  const re = /@([\w-]+)\b\s*/g
  const mentions: ChatMention[] = []
  const seen = new Set<string>()
  let stripped = ""
  let lastEnd = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    const lower = match[1].toLowerCase()
    const agentId = idsByLower.get(lower)
    if (!agentId) continue // 未登记的 @ 名字保留在文本里(不识别为 mention)
    // 收集 mention(去重)
    if (!seen.has(agentId)) {
      seen.add(agentId)
      mentions.push({ agentId, source: "plain", range: [match.index, match.index + match[0].trimEnd().length] })
    }
    // 把 [lastEnd, match.index) 拼到 stripped,跳过 match 整体
    stripped += text.slice(lastEnd, match.index)
    lastEnd = match.index + match[0].length
  }
  stripped += text.slice(lastEnd)
  stripped = stripped.replace(/[ \t]+/g, " ").trim()
  return { mentions, stripped }
}

/** 从文本里仅提取 mentions(常见调用方:agent 回复落库时不需要 stripped)。 */
export function parseMentionsFromText(text: string, members: Pick<ChatMember, "agentId">[], excludeSelfAgentId?: string): ChatMention[] {
  return scanMentions(text, members, excludeSelfAgentId).mentions
}

/** 从文本里仅获取剥 @ 后的干净文本(发给 agent 的消息体)。 */
export function stripMentionsForAgent(text: string, members: Pick<ChatMember, "agentId">[]): string {
  return scanMentions(text, members).stripped
}

/**
 * 校验结构化 mentions(来自 composer 的 user 输入):
 *   - agentId 必须是 members 之一
 *   - range 在 text 范围内,且字串与 `@<agentId>` 匹配
 *   - 同一 agentId 去重保留首个
 * 不合法条目被丢弃(防 renderer 传入脏数据)。
 */
export function sanitizeStructuredMentions(text: string, mentions: ChatMention[], members: Pick<ChatMember, "agentId">[]): ChatMention[] {
  if (mentions.length === 0) return []
  const memberIds = new Set(members.map((m) => m.agentId))
  const out: ChatMention[] = []
  const seen = new Set<string>()
  for (const m of mentions) {
    if (!memberIds.has(m.agentId)) continue
    if (seen.has(m.agentId)) continue
    if (m.source === "tool") {
      out.push({ agentId: m.agentId, source: "tool" })
      seen.add(m.agentId)
      continue
    }
    if (!m.range) continue
    const [s, e] = m.range
    if (s < 0 || e > text.length || s >= e) continue
    const slice = text.slice(s, e)
    if (!/^@/.test(slice)) continue
    if (slice.slice(1).toLowerCase() !== m.agentId.toLowerCase()) continue
    out.push({ agentId: m.agentId, source: "structured", range: [s, e] })
    seen.add(m.agentId)
  }
  return out
}

/** 合并结构化 + 文本解析 mentions:结构化优先,文本解析仅补充未覆盖的 agentId。 */
export function mergeMentions(primary: ChatMention[], fallback: ChatMention[]): ChatMention[] {
  const out: ChatMention[] = []
  const seen = new Set<string>()
  for (const m of [...primary, ...fallback]) {
    if (seen.has(m.agentId)) continue
    seen.add(m.agentId)
    out.push(m)
  }
  return out
}
