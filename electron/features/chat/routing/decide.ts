/**
 * 路由决策（扩展点 1）：给定最新消息 + 在群成员列表，决定本轮给谁发 chat.send。
 *
 * 规则（对齐 discord 插件 allowBots="mentions" 默认）：
 *
 *   ┌───────────────┬───────────┬──────────────────────────────────┐
 *   │ sender        │ 有 @      │ 无 @                             │
 *   ├───────────────┼───────────┼──────────────────────────────────┤
 *   │ user          │ 只回被 @  │ 所有 auto 成员全员回             │
 *   │ agent/system  │ 只回被 @  │ 停（避免 agent↔agent 死循环）    │
 *   └───────────────┴───────────┴──────────────────────────────────┘
 *
 * 为什么 agent 消息无 @ 就停：
 *   群聊下若 agent 回复继续广播给其他 auto 成员，A→B→A→B 会无限循环。
 *   discord 默认 allowBots=off/mentions，本实现取 mentions 档：
 *   agent 想串话必须显式 @。
 *
 * 未来升级：β 阶段可在 session 上加 agentReplyMode 字段（off/mentions/all）三档可选。
 */

import type { ChatMember, ChatMention, SenderType } from "./types"

export function decideTargets(members: ChatMember[], mentions: ChatMention[], senderType: SenderType): ChatMember[] {
  const active = members.filter((m) => m.leftAt === null)

  // agent / tool / system 消息：仅 @ 驱动。无 @ 停，防死循环。
  if (senderType !== "user") {
    if (mentions.length === 0) return []
    const mentionedIds = new Set(mentions.map((m) => m.agentId))
    return active.filter((m) => mentionedIds.has(m.agentId))
  }

  // user 消息：原规则
  if (mentions.length > 0) {
    const mentionedIds = new Set(mentions.map((m) => m.agentId))
    return active.filter((m) => mentionedIds.has(m.agentId))
  }
  return active.filter((m) => m.replyMode === "auto")
}
