/**
 * Chat 域事件契约 — 插件通过 bridge 推给控制端。
 *
 * 全部走 bridge WS 的 `custom` channel(CHAT_CHANNEL = "chat"),
 * 控制端按 `kind` 判别并处理。
 *
 * 事件分类:
 *   路由类:  hand_off / end_turn
 *   挂起类:  ask_user
 *   展示类:  show_card / set_status / report_progress
 *
 * 事件 kind = 工具 name 去掉 `kaiwu_` 前缀。
 */

export const CHAT_CHANNEL = "chat"

export type ChatPluginEvent = HandOffEvent | AskUserEvent | EndTurnEvent | ShowCardEvent | SetStatusEvent | ReportProgressEvent

// ---------- 路由:agent 主动转交发言权 ----------

export interface HandOffEvent {
  kind: "hand_off"
  sessionKey: string
  agentId: string
  reason?: string
  ts: number
}

/** agent 显式结束本轮,无后续动作。对齐宿主 sessions_yield 语义。 */
export interface EndTurnEvent {
  kind: "end_turn"
  sessionKey: string
  reason?: string
  ts: number
}

// ---------- 挂起:等待用户输入 ----------

export interface AskUserEvent {
  kind: "ask_user"
  sessionKey: string
  question: string
  options?: string[]
  ts: number
}

// ---------- 展示:UI 富交互 ----------

export interface CardOption {
  label: string
  /** 点击后作为新用户消息发回 agent 的文本。 */
  value: string
  style?: "primary" | "default" | "danger"
}

export interface ShowCardEvent {
  kind: "show_card"
  sessionKey: string
  title?: string
  description?: string
  options: CardOption[]
  ts: number
}

/** agent 主动标记自身状态,UI 可显 typing indicator / progress spinner。 */
export interface SetStatusEvent {
  kind: "set_status"
  sessionKey: string
  status: "thinking" | "working" | "waiting" | "idle"
  /** 可选提示文案("正在读取文件"、"分析中"等)。 */
  hint?: string
  ts: number
}

/** 长任务分步进度。current/total 可用于进度条,step 是当前步骤描述。 */
export interface ReportProgressEvent {
  kind: "report_progress"
  sessionKey: string
  step: string
  current: number
  total?: number
  ts: number
}
