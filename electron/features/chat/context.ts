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

import { renderRoster, type RosterEntry } from "../../agent/context"
import { listMembers, listMessages } from "./repository"
import type { ChatMember, ChatMessage } from "./types"

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
  // 极简 instruction(对齐 discord 模型):只告知身份 + 群成员 + 基本规则。
  // 不教 agent 做"路由决策",让它像 discord bot 一样正常写回复。若它想让别人接话,
  // 就在回复里自然写 `@<agent_id>`,kaiwu decideTargets 解析文本 @ 完成路由。
  // 把 mention_next / 角色纪律 / 禁止扮演 等规则全删 — 越复杂 LLM 越不稳。
  const instruction = [
    `你是群聊中的 ${selfName}。这是一个多 agent 群聊,参与者如下:`,
    renderRoster(roster),
    `如需要用户介入(做决策/提供信息),调用 ask_user(question) 工具;否则正常写回复即可。`,
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
