/**
 * 事件 payload (main → renderer)。
 *
 * 全部经 IPC `chat.<event-name>` 广播,对应 ChatEvents 映射表。
 */

import type { ChatMessage } from "./domain"

export interface LoopPausedEvent {
  sessionId: string
  kind: "ask_user"
  pendingId: string
  question: string
  options?: string[]
  byAgentId: string
}

export type LoopEndedReason = "no_target" | "budget_max_rounds" | "stop_phrase" | "error"

export interface LoopEvent {
  sessionId: string
  kind: "started" | "ended"
  reason?: LoopEndedReason
}

/** 流式 delta:增量内容吐字。按 sessionId + idempotencyKey 分流。 */
export interface StreamDeltaEvent {
  sessionId: string
  idempotencyKey: string
  /** 本轮对应的 openclaw sessionKey —— UI 反查发言 member/agent。 */
  openclawSessionKey: string
  /** 本次累积内容(overwrite 模式,不是增量拼接)。 */
  content: string
}

/** 流式结束:final / aborted / error 都触发,UI 清对应 streaming buffer。 */
export interface StreamEndEvent {
  sessionId: string
  idempotencyKey: string
  openclawSessionKey: string
}

/** 通知 renderer 该 session 的消息列表需要 re-fetch(对账后外部消息入库、旁路监听等)。 */
export interface MessagesRefreshEvent {
  sessionId: string
  reason: "reconcile" | "external" | "meta"
}

/**
 * 多 agent 投递态:user 消息发给各成员后,每成员独立的处理进度。transient,不入 DB。
 *
 * 状态语义(来源 → 状态):
 *   kaiwu sendToMember 入口 → queued   (已登记,未收到任何事件)
 *   openclaw agent.reasoning → thinking (模型在思考,尚未吐字)
 *   openclaw agent.tool start → tool    (正在调用工具)
 *   openclaw chat.delta → replying      (开始吐字)
 *   openclaw chat.final → done          (终态)
 *   openclaw chat.error / RPC 抛错 → error   (终态)
 *   openclaw chat.aborted → aborted     (终态)
 */
export type DeliveryStatus = "queued" | "thinking" | "tool" | "replying" | "done" | "error" | "aborted"

export interface DeliveryUpdateEvent {
  sessionId: string
  /** 触发本次投递的消息 id(通常是 user msg)。UI 按此绑定 chip 到消息气泡下。 */
  anchorMsgId: string
  memberId: string
  status: DeliveryStatus
  /** status=error 时的错误文本。 */
  errorMsg?: string
  /** status=tool 时的工具名(如 "web_search" / "read_file"),用于 UI 展示。 */
  toolName?: string
  at: number
}

/** 运行期错误(非对话内容,不入 DB)。对齐 openclaw UI 的 lastError banner 语义。 */
export interface ChatErrorEvent {
  sessionId: string
  /** 本次失败 run 的 idempotencyKey(可选,UI 可用于 retry)。 */
  idempotencyKey?: string
  /** 失败 run 的 openclaw sessionKey(group 多 agent 时定位是谁出错)。 */
  openclawSessionKey?: string
  /** 失败原因文本。 */
  message: string
  /**
   * 错误分类:
   *   "disconnected" - kaiwu 合成(gateway 断线)
   *   "error"        - 未分类默认值
   *   龙虾原生 errorKind: "timeout" / "rate_limit" / "refusal" / "context_length" / "unknown"
   */
  kind?: string
}

export interface ChatEvents {
  "message:new": ChatMessage
  "messages:refresh": MessagesRefreshEvent
  "loop:event": LoopEvent
  "loop:paused": LoopPausedEvent
  "stream:delta": StreamDeltaEvent
  "stream:end": StreamEndEvent
  "chat:error": ChatErrorEvent
  "delivery:update": DeliveryUpdateEvent
}
