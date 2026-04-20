/**
 * @mention 文本处理:user 输入里的 @agentId 是 kaiwu 内部路由标识,
 * 不应带到真正发给 agent 的消息体里(agent 通过 context 感知"被 at")。
 *
 * UI 展示(chat_messages.content_json)保留原文带 @,发给 openclaw chat.send
 * 的 message 参数走 stripMentionsForAgent 清洗。
 */

import type { ChatMember, ChatMention } from "../types"

/**
 * 从文本里移除所有匹配 member.agentId 的 @ 标记,保留其余内容。
 *
 * 规则:
 *   - 匹配 `@<agentId>` + 可选尾部空白,整体删除
 *   - 不匹配未登记 agent(防用户手滑删掉无关文本)
 *   - 末尾单个 @ 标记删除后不留多余空格
 *   - 大小写不敏感,对齐 parseMentionsFromText
 *
 * 例:
 *   stripMentionsForAgent("@Alice 你好,@bob 也来看看", [Alice,bob])
 *     → "你好,也来看看"
 *   stripMentionsForAgent("hi @Alice", [Alice]) → "hi"
 */
export function stripMentionsForAgent(text: string, members: Pick<ChatMember, "agentId">[]): string {
  if (!text || members.length === 0) return text
  let out = text
  for (const m of members) {
    const escaped = m.agentId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    // 匹配 @agentId 后可选空白(多个),整体吃掉
    const re = new RegExp(`@${escaped}\\b\\s*`, "gi")
    out = out.replace(re, "")
  }
  // 收尾:多余空白压单空格 + trim
  return out.replace(/[ \t]+/g, " ").trim()
}

/**
 * 从文本里解析出所有 @<agentId> 标记,返回对应 ChatMention 数组,带 range。
 * user/agent 消息都用同一套解析,保证文本 @ 路由一致。
 *
 * @param excludeSelfAgentId 排除的 sender 自己的 agentId,避免 agent @ 自己导致死循环
 */
export function parseMentionsFromText(text: string, members: Pick<ChatMember, "agentId">[], excludeSelfAgentId?: string): ChatMention[] {
  if (!text) return []
  const found: ChatMention[] = []
  const seen = new Set<string>()
  for (const m of members) {
    if (excludeSelfAgentId && m.agentId === excludeSelfAgentId) continue
    if (seen.has(m.agentId)) continue
    const escaped = m.agentId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const re = new RegExp(`@${escaped}\\b`, "gi")
    let match: RegExpExecArray | null
    while ((match = re.exec(text)) !== null) {
      if (!seen.has(m.agentId)) {
        found.push({ agentId: m.agentId, source: "plain", range: [match.index, match.index + match[0].length] })
        seen.add(m.agentId)
        break
      }
    }
  }
  return found
}

/**
 * 校验结构化 mentions:
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

/**
 * 合并结构化 + 文本解析 mentions:结构化优先,文本解析仅补充未覆盖的 agentId。
 * agent 回复没有结构化来源时,文本解析结果直接当主路径(所有 source="plain")。
 */
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
