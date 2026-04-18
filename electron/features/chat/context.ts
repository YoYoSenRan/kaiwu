/**
 * 共享上下文拼装（扩展点 2）。
 *
 * 被 group loop 在 chat.send 前调用：
 *   1. 拉 session 内历史消息渲染 transcript
 *   2. 拉在群成员渲染花名册
 *   3. 拼成 plugin.context.set 要推的 payload
 *
 * 未来 β 升级：在 instruction 里加 "If not relevant, output <SILENT>"。
 */

import { renderRoster, renderTranscript, type RosterEntry, type TranscriptEntry } from "../../agent/context"
import { listMembers, listMessages } from "./repository"
import type { ChatMember, ChatMessage } from "./types"

export interface ContextPayload {
  sessionKey: string
  instruction: string
  knowledge: string[]
  sharedHistory?: string
}

/**
 * 为 target member 构造 context.set 的 payload。
 * @param sessionId kaiwu chat session id
 * @param target 本轮被调度的成员
 * @param opts.agentDisplayName 成员的展示名（从 openclaw.agents.list 拉来，调用者传入）
 */
export function buildSharedContext(
  sessionId: string,
  target: ChatMember,
  opts: { agentDisplayName?: string; includeHistory: boolean },
): ContextPayload {
  const all = listMembers(sessionId)
  const roster: RosterEntry[] = all
    .filter((m) => m.leftAt === null)
    .map((m) => ({ agentId: m.agentId, displayName: m.agentId, replyMode: m.replyMode, isSelf: m.id === target.id }))

  const instruction = [
    `你在一个多 agent 群聊中。你的身份是 ${opts.agentDisplayName ?? target.agentId}。`,
    renderRoster(roster),
    `你可以调用 mention_next(agent_id) 把话传给群内另一位成员。`,
    `如果需要用户介入（比如需要决策、需要用户提供信息），调用 ask_user(question) 工具。`,
  ].join("\n\n")

  let sharedHistory: string | undefined
  if (opts.includeHistory) {
    const msgs = listMessages(sessionId)
    const entries = msgs.map(messageToTranscript)
    sharedHistory = entries.length > 0 ? renderTranscript(entries) : undefined
  }

  return {
    sessionKey: target.openclawKey,
    instruction,
    knowledge: [],
    sharedHistory,
  }
}

function messageToTranscript(m: ChatMessage): TranscriptEntry {
  const senderLabel = m.senderType === "user" ? "user" : m.senderId ?? m.senderType
  const text = extractText(m.content)
  return { senderLabel, content: text, ts: m.createdAtLocal }
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content
  if (content && typeof content === "object") {
    const c = content as { text?: string; content?: unknown }
    if (typeof c.text === "string") return c.text
  }
  return ""
}
