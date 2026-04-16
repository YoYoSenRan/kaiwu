/**
 * chat.* RPC 契约类型。
 *
 * 镜像 openclaw/src/gateway 侧 chat 方法的入参/出参/事件结构。
 */

/** chat.send 的请求参数。 */
export interface ChatSendParams {
  sessionKey: string
  message: string
  thinking?: string
  attachments?: unknown[]
  timeoutMs?: number
  idempotencyKey: string
}

/** chat.abort 的请求参数。 */
export interface ChatAbortParams {
  sessionKey: string
  runId?: string
}

/** chat.history 的请求参数。 */
export interface ChatHistoryParams {
  sessionKey: string
  limit?: number
  maxChars?: number
}

/** chat.send 返回后，通过 event 帧推送的流式事件。 */
export interface ChatEvent {
  runId: string
  sessionKey: string
  seq: number
  state: "delta" | "final" | "aborted" | "error"
  /** assistant 消息对象，delta/final 时为 { role, content: [{type:"text", text}], timestamp }。 */
  message?: ChatEventMessage
  errorMessage?: string
  errorKind?: "refusal" | "timeout" | "rate_limit" | "context_length" | "unknown"
  usage?: {
    input?: number
    output?: number
    cacheRead?: number
    cacheWrite?: number
    total?: number
  }
  stopReason?: string
}

/** gateway 推送的 chat 事件中的 message 结构。 */
export interface ChatEventMessage {
  role: string
  content: Array<{ type: string; text?: string }>
  timestamp?: number
  model?: string
  provider?: string
  usage?: {
    input?: number
    output?: number
    cacheRead?: number
    cacheWrite?: number
    totalTokens?: number
    cost?: { total?: number }
  }
  stopReason?: string
}

/** chat.history 返回的消息条目。 */
export interface ChatHistoryMessage {
  role: string
  content: unknown
  timestamp?: number
  model?: string
  provider?: string
  stopReason?: string
  usage?: {
    input?: number
    output?: number
    cacheRead?: number
    cacheWrite?: number
    totalTokens?: number
    cost?: { total?: number }
  }
  /** OpenClaw 附加的元数据。 */
  __openclaw?: { id?: string; seq?: number }
}
