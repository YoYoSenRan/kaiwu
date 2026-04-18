/**
 * gateway 连接状态机。
 *
 * 纯函数 reduce + 动作类型 + 初始状态。GatewayClient 只消费,不拥有逻辑。
 * 7 种动作覆盖:扫描开始 / 连接开始 / 连上 / 断开 / 重连排期 / 错误 / 认证错误 / 心跳指标 / 重置。
 */

import type { ConnectionMode, ConnectionState } from "../contracts/connection"

/** 状态机动作。Discriminated union,reduce 里 switch 各 case 各自 return,靠 TS 控制流守门。 */
export type GatewayAction =
  | { type: "startDetect"; mode: ConnectionMode; url: string | null }
  | { type: "startConnect"; url: string }
  | { type: "connected" }
  | { type: "disconnected" }
  | { type: "reconnecting" }
  | { type: "error"; message: string }
  | { type: "authError"; message: string }
  | { type: "metrics"; pingLatencyMs?: number | null; nextRetryAt?: number | null }
  | { type: "reset" }

/** 初始状态:idle 未触发任何扫描/连接。 */
export const INITIAL_STATE: ConnectionState = {
  status: "idle",
  mode: null,
  url: null,
  error: null,
  pingLatencyMs: null,
  nextRetryAt: null,
}

/**
 * 应用一个动作到当前状态,返回新状态(或同一引用表示无变化)。
 * 不 fire 副作用,所有转移都在这里内聚。
 */
export function reduce(state: ConnectionState, action: GatewayAction): ConnectionState {
  switch (action.type) {
    case "startDetect":
      return { status: "detecting", mode: action.mode, url: action.url, error: null, pingLatencyMs: null, nextRetryAt: null }
    case "startConnect":
      return { ...state, status: "connecting", url: action.url }
    case "connected":
      return { ...state, status: "connected", error: null, nextRetryAt: null }
    case "disconnected":
      return state.status === "connected" ? { ...state, status: "disconnected", pingLatencyMs: null } : state
    case "reconnecting":
      return state.status === "disconnected" || state.status === "connected" ? { ...state, status: "connecting" } : state
    case "error":
      return { ...state, status: "error", error: action.message, pingLatencyMs: null, nextRetryAt: null }
    case "authError":
      return { status: "auth-error", error: `认证失败: ${action.message}`, pingLatencyMs: null, nextRetryAt: null, mode: null, url: null }
    case "metrics": {
      const next: ConnectionState = { ...state }
      if (action.pingLatencyMs !== undefined) next.pingLatencyMs = action.pingLatencyMs
      if (action.nextRetryAt !== undefined) next.nextRetryAt = action.nextRetryAt
      return next
    }
    case "reset":
      return INITIAL_STATE
  }
}
