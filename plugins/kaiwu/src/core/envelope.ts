/**
 * kaiwu ↔ kaiwu 的 JSON 消息协议契约。
 *
 * 所有消息必须带 `type` 字段。请求/响应类型复用同一个联合，通过 `type` 判别。
 * kaiwu 端在 electron/openclaw/types.ts 里应镜像这份定义。
 *
 * 纯契约文件：不含运行时副作用，host 在 discovery 阶段可直接静态读。
 */

/** 协议版本号。协议形状变更时递增并更新两端的 SUPPORTED_PROTOCOL_VERSIONS。 */
export const BRIDGE_PROTOCOL_VERSION = 1

/** 当前版本插件支持的协议版本集合（便于未来做协商）。 */
export const SUPPORTED_PROTOCOL_VERSIONS = [1] as const

// --- 公共字段 ---

export interface BridgeEnvelope<T extends string, P = unknown> {
  type: T
  /** 可选请求 id，用于关联 request/response。 */
  id?: string
  /** 毫秒时间戳。发送端填充，接收端用于日志/排序。 */
  ts: number
  payload: P
}

// --- 出站事件：plugin → kaiwu ---

/** 插件完成启动、WebSocket 鉴权成功。 */
export type PluginReadyEvent = BridgeEnvelope<"plugin.ready", { pluginVersion: string; hostGatewayPort: number; protocolVersion: number }>

/** 插件即将停止（OpenClaw gateway_stop 钩子触发）。 */
export type PluginShutdownEvent = BridgeEnvelope<"plugin.shutdown", { reason?: string }>

/** 会话开始/结束。占位，具体字段按 OpenClaw hook 补。 */
export type SessionStartedEvent = BridgeEnvelope<"session.started", { sessionId: string }>
export type SessionEndedEvent = BridgeEnvelope<"session.ended", { sessionId: string; outcome?: string }>

/** 收到外部消息。占位。 */
export type MessageReceivedEvent = BridgeEnvelope<"message.received", { sessionId: string; content: unknown }>

/** 工具被 agent 调用。占位。 */
export type ToolInvokedEvent = BridgeEnvelope<"tool.invoked", { sessionId: string; toolName: string; args: unknown }>

/** 插件内部异常上报。 */
export type ErrorOccurredEvent = BridgeEnvelope<"error.occurred", { message: string; stack?: string; context?: string }>

/** 透传业务事件，kaiwu 按 type 分发。 */
export type CustomEvent = BridgeEnvelope<"custom", { channel: string; data: unknown }>

export type BridgeOutboundMessage =
  | PluginReadyEvent
  | PluginShutdownEvent
  | SessionStartedEvent
  | SessionEndedEvent
  | MessageReceivedEvent
  | ToolInvokedEvent
  | ErrorOccurredEvent
  | CustomEvent

// --- 入站命令：kaiwu → plugin（通过 HTTP 路由）---

export interface HealthResponse {
  ok: true
  pluginId: string
  pluginVersion: string
  uptimeMs: number
  wsConnected: boolean
  protocolVersion: number
}

export interface VersionResponse {
  pluginVersion: string
  hostGatewayPort: number
  protocolVersion: number
  supportedProtocolVersions: readonly number[]
}

export interface InvokeRequest {
  action: string
  params?: unknown
}

export interface InvokeResponse {
  ok: boolean
  result?: unknown
  error?: { message: string; code?: string }
}

/** 生成单调递增的事件 id，避免依赖 crypto。 */
let idCounter = 0
export function nextEventId(): string {
  idCounter = (idCounter + 1) >>> 0
  return `${Date.now().toString(36)}-${idCounter.toString(36)}`
}

/** 构造事件，自动填充 ts 和 id。 */
export function makeEvent<T extends BridgeOutboundMessage>(type: T["type"], payload: T["payload"]): T {
  return { type, id: nextEventId(), ts: Date.now(), payload } as T
}
