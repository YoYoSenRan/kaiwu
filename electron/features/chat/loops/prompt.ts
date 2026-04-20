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
import { getSession, listMembers, listMessages } from "../repository"
import type { ChatMember, ChatMessage } from "../types"

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
  // supervisor 由 session.supervisorId 决定(创建群聊时由用户选);旧数据 fallback 第一个 member。
  const session = getSession(sessionId)
  const supervisorId = session?.supervisorId ?? all[0]?.id ?? null
  const isSupervisor = target.id === supervisorId
  const supervisor = supervisorId ? all.find((m) => m.id === supervisorId) : undefined
  const supervisorName = supervisor?.agentId ?? "supervisor"
  // 极简 instruction(对齐 discord 模型):身份 + 群成员 + 路由规则。
  // 路由规则由 session.supervisorId 派生:supervisor 可路由,worker 不可。
  const routingRule = isSupervisor
    ? [
        `**你是本群主持人**,负责调度其他成员协作。`,
        `要让某成员接话,在回复正文里写 \`@<agentId>\` 即可触发对方(例:"@xalt 请你来分析")。`,
        `不希望某次 @ 触发路由(只是引用名字)? 不要写 @,直接写名字即可。`,
        `完成调度任务后直接写收尾文字,无需调任何工具。`,
      ].join(" ")
    : [
        `**你是 worker**,只在被点名时回复。`,
        `完成自己的任务后直接写答复即可。**正文里 @ 别人不会触发对方**(只主持人 ${supervisorName} 才能调度)。`,
        `如需让其他成员介入,在回复结尾向 ${supervisorName} 汇报需求,${supervisorName} 会决定下一步。`,
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
