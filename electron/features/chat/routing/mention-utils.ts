/**
 * @mention 文本处理:user 输入里的 @agentId 是 kaiwu 内部路由标识,
 * 不应带到真正发给 agent 的消息体里(agent 通过 context 感知"被 at")。
 *
 * UI 展示(chat_messages.content_json)保留原文带 @,发给 openclaw chat.send
 * 的 message 参数走 stripMentionsForAgent 清洗。
 */

import type { ChatMember } from "./types"

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
