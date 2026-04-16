/**
 * gateway 域本地类型:连接状态机、手动连接参数、event 帧。
 */

/** gateway 连接状态枚举。 */
export type GatewayStatus = "idle" | "detecting" | "connecting" | "connected" | "disconnected" | "auth-error" | "error"

/** gateway 连接模式。 */
export type GatewayMode = "scan" | "manual"

/** gateway 连接状态快照。 */
export interface GatewayState {
  status: GatewayStatus
  mode: GatewayMode | null
  url: string | null
  error: string | null
  /** 最近一次 ping/pong 往返延迟(ms)。null 表示尚未完成首次心跳测量。 */
  pingLatencyMs: number | null
  /** 下次重连的绝对时间戳(ms since epoch)。null 表示当前没有排期的重连。 */
  nextRetryAt: number | null
}

/** 手动连接参数。无参数时走本机扫描模式。 */
export interface GatewayConnectParams {
  url: string
  token?: string
  password?: string
}

/** gateway event 帧(镜像 gateway/contract.ts 的 EventFrame)。 */
export interface GatewayEventFrame {
  type: "event"
  event: string
  payload?: unknown
  seq?: number
}
