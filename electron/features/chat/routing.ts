/**
 * 路由决策（扩展点 1）：给定最新消息 + 在群成员列表，决定本轮给谁发 chat.send。
 *
 * 规则：
 * - 消息含显式 @ → 只路由给被 @ 的 auto/mention 成员
 * - 无 @ → 路由给所有 auto 成员（mention 成员静默）
 *
 * 未来升级：β 阶段在这里加 silent-token 过滤；α 阶段可改为全广播让 openclaw 自己 gate。
 */

import type { ChatMember, ChatMention } from "./types"

export function decideTargets(members: ChatMember[], mentions: ChatMention[]): ChatMember[] {
  const active = members.filter((m) => m.leftAt === null)
  if (mentions.length > 0) {
    const mentionedIds = new Set(mentions.map((m) => m.agentId))
    return active.filter((m) => mentionedIds.has(m.agentId))
  }
  return active.filter((m) => m.replyMode === "auto")
}
