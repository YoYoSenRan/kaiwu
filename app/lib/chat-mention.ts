/**
 * 聊天 @mention 相关纯函数,无 React 依赖。
 *
 * - wrapMentionsWithTag: 把 `@agentId` 包成 `<mention agent_id="...">@id</mention>`,供 Streamdown 渲染 chip
 * - relocateMentions:   在文本中重新定位每个 agentId 首次出现的位置,返回带 range 的 structured mentions
 */

import type { ChatMention } from "../../electron/features/chat/types"

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * 把 `@agentId` 包成 Streamdown 自定义 HTML tag。
 * 仅匹配 agentIds 中登记的成员;跳过 fenced code block / inline code。
 */
export function wrapMentionsWithTag(text: string, agentIds: string[]): string {
  if (!text || agentIds.length === 0) return text
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]*`)/)
  for (let i = 0; i < parts.length; i += 2) {
    let seg = parts[i]
    for (const id of agentIds) {
      const re = new RegExp(`@${escapeRegex(id)}(?![\\w-])`, "g")
      seg = seg.replace(re, `<mention agent_id="${id}">@${id}</mention>`)
    }
    parts[i] = seg
  }
  return parts.join("")
}

/**
 * 在文本里重新定位每个 agentId 的首个 `@<id>` 位置,返回带 range 的 structured mentions。
 * 文本里已不存在对应 `@<id>` 的条目自动丢弃。
 */
export function relocateMentions(text: string, agentIds: string[]): ChatMention[] {
  const out: ChatMention[] = []
  const seen = new Set<string>()
  for (const id of agentIds) {
    if (seen.has(id)) continue
    const re = new RegExp(`@${escapeRegex(id)}(?![\\w-])`, "i")
    const m = re.exec(text)
    if (!m) continue
    out.push({ agentId: id, source: "structured", range: [m.index, m.index + m[0].length] })
    seen.add(id)
  }
  return out
}
