/**
 * 共享上下文拼装(扩展点 2)。
 *
 * 被 group loop 在 chat.send 前调用:
 *   1. 拉 session 内历史消息构造结构化 history entries
 *   2. 拉在群成员构造花名册
 *   3. 拼成 plugin.context.set 要推的 payload
 *
 * sharedHistory 对齐 openclaw discord plugin 格式(inbound-meta.ts:269-280):
 * 结构化 array of {sender, body, timestamp_ms},plugin hook 渲染为 untrusted JSON block。
 */

import { renderRoster, type RosterEntry } from "../../../agent/context"
import { listMembers, listMessages } from "../repository"
import type { ChatMember, ChatMessage } from "../types"

/** 能调 kaiwu_hand_off 的调度型 agent。和 plugins/kaiwu/src/tools/hand-off.ts 的 ALLOWED_AGENTS 保持一致。 */
const ORCHESTRATOR_AGENTS = new Set<string>(["minion"])

export interface SharedHistoryEntry {
  sender: string
  body: string
  timestamp_ms: number
}

export interface ContextPayload {
  sessionKey: string
  instruction: string
  knowledge: string[]
  sharedHistory?: SharedHistoryEntry[]
}

/**
 * 为 target member 构造 context.set 的 payload。
 * @param sessionId kaiwu chat session id
 * @param target 本轮被调度的成员
 * @param opts.agentDisplayName 成员的展示名(从 openclaw.agents.list 拉来,调用者传入)
 */
export function buildSharedContext(sessionId: string, target: ChatMember, opts: { agentDisplayName?: string; includeHistory: boolean }): ContextPayload {
  const all = listMembers(sessionId)
  const roster: RosterEntry[] = all
    .filter((m) => m.leftAt === null)
    .map((m) => ({ agentId: m.agentId, displayName: m.agentId, replyMode: m.replyMode, isSelf: m.id === target.id }))

  const selfName = opts.agentDisplayName ?? target.agentId
  const isOrchestrator = ORCHESTRATOR_AGENTS.has(target.agentId)
  // 极简 instruction(对齐 discord 模型):只告知身份 + 群成员 + 基本规则。
  // 告诉 agent 群聊结构 + 给出最关键的几个工具提示。其他工具用法在 workspace 文档里细讲。
  const routingRule = isOrchestrator
    ? [
        `**交接发言权**:要让群里其他成员接话,必须调用 \`kaiwu_hand_off(agent_id, reason)\` 工具,紧接着调 \`kaiwu_end_turn\` 结束本轮。`,
        `正文里写 "@<name>" 只用于引用/提及,**不会触发对方回复**。`,
        `不想继续交接就直接正常回复文字,不必调任何工具。`,
      ].join(" ")
    : [
        `**本轮只在被 @ / 交接到你时回复。**`,
        `完成自己的任务后直接写回复即可,不需要 @ 别人也不需要调度工具(你无权交接发言权)。`,
        `正文里写 "@<name>" 只用于引用/提及,不会触发对方回复。`,
      ].join(" ")
  const instruction = [
    `你是群聊中的 ${selfName}。这是一个多 agent 群聊,参与者如下:`,
    renderRoster(roster),
    routingRule,
    `如需要用户介入(做决策/提供信息),调用 kaiwu_ask_user(question) 工具;否则正常写回复即可。`,
  ].join("\n\n")

  let sharedHistory: SharedHistoryEntry[] | undefined
  if (opts.includeHistory) {
    const msgs = listMessages(sessionId)
    const entries = msgs.map(messageToHistoryEntry)
    sharedHistory = entries.length > 0 ? entries : undefined
  }

  return {
    sessionKey: target.openclawKey,
    instruction,
    knowledge: [],
    sharedHistory,
  }
}

function messageToHistoryEntry(m: ChatMessage): SharedHistoryEntry {
  const sender = m.senderType === "user" ? "user" : (m.senderId ?? m.senderType)
  const body = extractText(m.content)
  return { sender, body, timestamp_ms: m.createdAtLocal }
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content
  if (content && typeof content === "object") {
    const c = content as { text?: string; content?: unknown }
    if (typeof c.text === "string") return c.text
  }
  return ""
}
