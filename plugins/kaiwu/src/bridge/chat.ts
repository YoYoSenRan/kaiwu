/**
 * Chat 域事件契约 — 插件通过 bridge 推给控制端。
 *
 * 两类事件,都走 bridge WS 的 `custom` channel(CHAT_CHANNEL = "chat"):
 *   - mention_next: agent 把发言权交给群内其他成员
 *   - ask_user:     agent 请求用户介入(暂停群聊等待回复)
 *
 * 控制端侧按 `kind` 判别并处理。
 */

export const CHAT_CHANNEL = "chat"

export type ChatPluginEvent = MentionNextEvent | AskUserEvent

export interface MentionNextEvent {
  kind: "mention_next"
  sessionKey: string
  agentId: string
  reason?: string
  ts: number
}

export interface AskUserEvent {
  kind: "ask_user"
  sessionKey: string
  question: string
  options?: string[]
  ts: number
}
