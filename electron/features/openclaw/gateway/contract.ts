/**
 * OpenClaw gateway WS 协议类型定义。
 *
 * 帧格式对齐 openclaw/src/gateway/protocol/schema/frames.ts（PROTOCOL_VERSION = 3）。
 * 自定义帧协议，非标准 JSON-RPC：三种帧类型 req / res / event。
 */

// ---------- 协议版本 ----------

export const PROTOCOL_VERSION = 3

// ---------- 帧结构 ----------

/** 客户端 → 服务器的请求帧。 */
export interface RequestFrame {
  type: "req"
  id: string
  method: string
  params?: unknown
}

/** 服务器 → 客户端的响应帧。 */
export interface ResponseFrame {
  type: "res"
  id: string
  ok: boolean
  payload?: unknown
  error?: ErrorShape
}

/** 服务器 → 客户端的事件推送帧。 */
export interface EventFrame {
  type: "event"
  event: string
  payload?: unknown
  seq?: number
}

export interface ErrorShape {
  code: string
  message: string
  details?: unknown
  retryable?: boolean
  retryAfterMs?: number
}

/** 从 WS 收到的任意帧。 */
export type InboundFrame = ResponseFrame | EventFrame

// ---------- connect 握手 ----------

/** 服务器发送的 challenge 事件 payload。 */
export interface ConnectChallenge {
  nonce: string
  ts: number
}

/** 客户端发送的 connect 请求 params。 */
export interface ConnectParams {
  minProtocol: number
  maxProtocol: number
  client: {
    id: string
    displayName?: string
    version: string
    platform: string
    mode: string
  }
  auth: {
    token?: string
    deviceToken?: string
    bootstrapToken?: string
    password?: string
  }
  device?: {
    id: string
    publicKey: string
    signature: string
    signedAt: number
    nonce: string
  }
  role?: string
  scopes?: string[]
  caps?: string[]
  commands?: string[]
  permissions?: Record<string, boolean>
  pathEnv?: string
  locale?: string
  userAgent?: string
}

/** 服务器返回的 hello-ok 响应 payload。 */
export interface HelloOk {
  protocol: number
  server: { version: string; connId: string }
  features: { methods: string[]; events: string[] }
  policy: {
    maxPayload: number
    maxBufferedBytes: number
    tickIntervalMs: number
  }
  auth?: {
    deviceToken?: string
    role?: string
    scopes?: string[]
  }
}

// ---------- chat ----------

/** chat.send 的请求参数。 */
export interface ChatSendParams {
  sessionKey: string
  message: string
  thinking?: string
  attachments?: unknown[]
  timeoutMs?: number
  idempotencyKey?: string
}

/** chat.send 返回后，通过 event 帧推送的流式事件。 */
export interface ChatEvent {
  runId: string
  sessionKey: string
  seq: number
  state: "delta" | "final" | "aborted" | "error"
  message?: string
  errorMessage?: string
  usage?: {
    input?: number
    output?: number
    cacheRead?: number
    cacheWrite?: number
    total?: number
  }
  stopReason?: string
}

// ---------- sessions ----------

export interface SessionCreateParams {
  key?: string
  agentId?: string
  label?: string
  model?: string
  parentSessionKey?: string
  task?: string
  message?: string
}

export interface SessionListParams {
  limit?: number
  agentId?: string
  search?: string
  includeGlobal?: boolean
  includeDerivedTitles?: boolean
  includeLastMessage?: boolean
}

export interface SessionPatchParams {
  key: string
  label?: string | null
  model?: string | null
  thinkingLevel?: string | null
}

export interface SessionDeleteParams {
  key: string
}

/** chat.abort 的请求参数。 */
export interface ChatAbortParams {
  sessionKey: string
  runId?: string
}
