/**
 * 路由决策(扩展点 1):给定最新消息 + 在群成员列表 + session,决定本轮给谁发 chat.send。
 *
 * 心智模型:kaiwu = IM 平台,decideTargets = "平台决定哪个 bot 该收到推送"。
 *
 * 规则矩阵:
 *
 * ┌─────────────┬──────────────────┬────────────────────────────────────────┐
 * │ sender      │ 角色             │ 路由策略                                 │
 * ├─────────────┼──────────────────┼────────────────────────────────────────┤
 * │ user        │ -                │ 有 mention → 被 @;否则 reply-to → 该 │
 * │             │                  │ agent;再否则广播给 auto 成员            │
 * │ agent       │ supervisor       │ 全 mention 参与路由(plain @ 也算)     │
 * │ agent       │ worker           │ 仅 tool/structured;无则 fallback 回   │
 * │             │                  │ supervisor(除非自己就是)                │
 * │ system/tool │ -                │ 不路由                                   │
 * └─────────────┴──────────────────┴────────────────────────────────────────┘
 *
 * 设计要点:
 *   - supervisor 由 session.supervisorId 配置,UI 创建群时让用户选(默认 minion)
 *   - worker 的 plain @ 不路由,防 LLM 引用名字造成连锁误触
 *   - worker 完成任务自动 fallback 回 supervisor,让主持人决定下一步(集中式调度)
 *   - 排除 sender 自己(防自循环);排除 replyMode="off" 成员(显式静默)
 */

import type { ChatMember, ChatMention, ChatSession, SenderType } from "../types"

export interface DecideContext {
  members: ChatMember[]
  mentions: ChatMention[]
  senderType: SenderType
  /** sender 自己的 member.id(agent 消息必填,user 消息忽略)。用于排除自己 + 判 supervisor。 */
  senderMemberId?: string | null
  /** 用户回复的目标 agentId(in_reply_to 解析,user 消息隐式路由用)。 */
  replyToAgentId?: string | null
  /** 当前 session(读 supervisorId 字段)。 */
  session: Pick<ChatSession, "supervisorId">
}

export function decideTargets(ctx: DecideContext): ChatMember[] {
  const active = ctx.members.filter((m) => m.leftAt === null && m.replyMode !== ("off" as ChatMember["replyMode"]))
  const supervisorId = ctx.session.supervisorId

  // ---------- user 消息 ----------
  if (ctx.senderType === "user") {
    if (ctx.mentions.length > 0) {
      const ids = new Set(ctx.mentions.map((m) => m.agentId))
      return active.filter((m) => ids.has(m.agentId))
    }
    if (ctx.replyToAgentId) {
      const target = active.find((m) => m.agentId === ctx.replyToAgentId)
      if (target) return [target]
    }
    return active.filter((m) => m.replyMode === "auto")
  }

  // ---------- agent 消息 ----------
  if (ctx.senderType !== "agent") return []

  const senderIsSupervisor = !!supervisorId && ctx.senderMemberId === supervisorId
  const exclude = (m: ChatMember) => m.id !== ctx.senderMemberId

  if (senderIsSupervisor) {
    // 主持人:任何来源 mention 都路由
    if (ctx.mentions.length === 0) return []
    const ids = new Set(ctx.mentions.map((m) => m.agentId))
    return active.filter((m) => ids.has(m.agentId) && exclude(m))
  }

  // worker:只认 tool/structured(显式工具调用 / 结构化标记)
  const routable = ctx.mentions.filter((m) => m.source === "tool" || m.source === "structured")
  if (routable.length > 0) {
    const ids = new Set(routable.map((m) => m.agentId))
    return active.filter((m) => ids.has(m.agentId) && exclude(m))
  }

  // worker 无 mention → fallback 回 supervisor 汇报(集中式调度)。
  // 但 supervisor 自己不存在或就是 sender 时,不 fallback(避免自循环)。
  if (supervisorId && supervisorId !== ctx.senderMemberId) {
    const supervisor = active.find((m) => m.id === supervisorId)
    if (supervisor) return [supervisor]
  }
  return []
}
