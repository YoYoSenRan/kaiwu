/**
 * 路由决策(扩展点 1):给定最新消息 + 在群成员列表,决定本轮给谁发 chat.send。
 *
 * 规则:
 *
 *   ┌───────────────┬──────────────────────────────────┬──────────────────────────────────┐
 *   │ sender        │ 有可路由 mention                  │ 无可路由 mention                  │
 *   ├───────────────┼──────────────────────────────────┼──────────────────────────────────┤
 *   │ user          │ 只回被 @(structured+plain+tool)   │ 有 replyTo → 该 agent;否则广播   │
 *   │ agent/system  │ 只回被 @(tool / structured)       │ 停(避免连锁误路由)              │
 *   └───────────────┴──────────────────────────────────┴──────────────────────────────────┘
 *
 * 为什么 agent 消息的 `plain` 来源不参与路由:
 *   LLM 正文里写 `@X` 经常是"描述"/"引用"/"条件未来",而非"呼叫 X 接话"(例:表格列成员/"交付后@X")。
 *   把 plain 当路由 → 连锁误路由爆炸。只认 tool(mention_next) + structured 即可。
 *   agent 想显式交接 → 必须调 mention_next 工具(确定性来源);正文 @ 仅 UI 展示。
 *
 * user 侧保留文本 @ 路由 + reply-to 隐式路由:
 *   - 手打 `@X` 是直觉交互,无需学工具
 *   - 点气泡"↩"回复某 agent = 结构化隐式 @,无需再输 @
 *   - 都没有时才广播给所有 auto 成员
 *
 * @param replyToAgentId 用户回复的目标 agentId(来自 in_reply_to_message_id 解析);
 *                       非空即作为隐式 structured mention,优先级低于显式 mentions。
 */

import type { ChatMember, ChatMention, SenderType } from "../types"

export function decideTargets(
  members: ChatMember[],
  mentions: ChatMention[],
  senderType: SenderType,
  replyToAgentId?: string | null,
): ChatMember[] {
  const active = members.filter((m) => m.leftAt === null)

  // agent / tool / system 消息:只认 tool + structured mention 作为路由信号。
  // plain(正文 @)仅供 UI 展示 chip,不触发路由。
  if (senderType !== "user") {
    const routable = mentions.filter((m) => m.source === "tool" || m.source === "structured")
    if (routable.length === 0) return []
    const mentionedIds = new Set(routable.map((m) => m.agentId))
    return active.filter((m) => mentionedIds.has(m.agentId))
  }

  // user 消息:显式 mention 优先。
  if (mentions.length > 0) {
    const mentionedIds = new Set(mentions.map((m) => m.agentId))
    return active.filter((m) => mentionedIds.has(m.agentId))
  }

  // 无显式 mention 但有 reply-to 指向某 agent → 隐式路由给该 agent。
  if (replyToAgentId) {
    const target = active.find((m) => m.agentId === replyToAgentId)
    if (target) return [target]
  }

  // 兜底:广播给所有 auto 成员。
  return active.filter((m) => m.replyMode === "auto")
}
