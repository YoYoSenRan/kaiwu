/**
 * Gateway WebSocket 消息类型与连接状态定义
 * 基于 OpenClaw Gateway v3 协议
 */

/** Gateway 连接状态 */
export type GatewayStatus = "disconnected" | "connecting" | "connected" | "reconnecting"

/** 请求帧：客户端 → Gateway */
export interface GatewayRequest {
  type: "req"
  method: string
  id: string
  params?: Record<string, unknown>
}

/** 响应帧：Gateway → 客户端 */
export interface GatewayResponse {
  type: "res"
  id: string
  result?: unknown
  error?: GatewayError
}

/** 事件帧：Gateway → 客户端（广播） */
export interface GatewayEvent {
  type: "event"
  method: string
  params?: Record<string, unknown>
  seq?: number
}

/** Gateway 错误结构 */
export interface GatewayError {
  code: string
  message: string
  details?: Record<string, unknown>
}

/** Gateway 协议帧（联合类型） */
export type GatewayMessage = GatewayRequest | GatewayResponse | GatewayEvent

/** 握手请求参数 */
export interface HandshakeParams {
  minProtocol: number
  maxProtocol: number
  client: { id: string; displayName: string; version: string; platform: string; mode: string; instanceId: string }
  role: string
  scopes: string[]
  caps: string[]
  auth: { token: string }
  deviceToken?: string
}

/** Gateway 连接成功后返回的信息 */
export interface GatewayInfo {
  protocol: number
  deviceToken?: string
}

/** 不可恢复的错误码，遇到这些错误应停止重连 */
export const NON_RETRYABLE_ERROR_CODES = new Set(["AUTH_TOKEN_MISSING", "AUTH_TOKEN_MISMATCH", "ORIGIN_NOT_ALLOWED"])
