/**
 * chat 能力契约（插件侧）。
 *
 * 插件注册两个 agent 工具：
 *   - mention_next(agent_id, reason?) — agent 把发言权交给群内其他成员
 *   - ask_user(question, options?) — agent 请求用户介入
 *
 * 工具被调用时通过 bridge WS custom 通道推送事件给 kaiwu 主进程，
 * 由 kaiwu 按事件类型更新消息记录 / 挂起 loop。
 */

/** bridge WS custom 通道名。 */
export const CHAT_CHANNEL = "chat"

/** 所有 chat 域推送的事件形状（union）。 */
export type ChatPluginEvent = MentionNextEvent | AskUserEvent

export interface MentionNextEvent {
  kind: "mention_next"
  /** agent 所在的 openclaw session。 */
  sessionKey: string
  /** agent 想提及的下一个成员 agent_id。 */
  agentId: string
  /** 可选理由（用于 UI 展示）。 */
  reason?: string
  /** 事件采集时间戳。 */
  ts: number
}

export interface AskUserEvent {
  kind: "ask_user"
  sessionKey: string
  question: string
  options?: string[]
  ts: number
}
