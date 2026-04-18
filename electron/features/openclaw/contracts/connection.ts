/**
 * gateway 连接状态机对外契约。
 *
 * 这里定义"从 renderer 视角看到的连接快照",与 contracts/frames.ts 的 wire 帧无关。
 */

/** WS 连接状态枚举。 */
export type ConnectionStatus = "idle" | "detecting" | "connecting" | "connected" | "disconnected" | "auth-error" | "error"

/** 连接模式。scan = 本机扫描轮询,manual = 手动指定 URL 单次连接。 */
export type ConnectionMode = "scan" | "manual"

/** 连接状态快照。 */
export interface ConnectionState {
  status: ConnectionStatus
  mode: ConnectionMode | null
  url: string | null
  error: string | null
  /** 最近一次 ping/pong 往返延迟(ms)。null 表示尚未完成首次心跳测量。 */
  pingLatencyMs: number | null
  /** 下次重连的绝对时间戳(ms since epoch)。null 表示当前没有排期的重连。 */
  nextRetryAt: number | null
}

/** 手动连接参数。无参数时走本机扫描模式。 */
export interface ConnectParams {
  url: string
  token?: string
  password?: string
}
