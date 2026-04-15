import { create } from "zustand"

export type GatewayStatus = "idle" | "detecting" | "connecting" | "connected" | "disconnected" | "auth-error" | "error"
export type GatewayMode = "scan" | "manual" | null

interface GatewayState {
  status: GatewayStatus
  mode: GatewayMode
  url: string | null
  error: string | null
  /** 最近一次 ping/pong 往返延迟（ms）。null 表示尚未完成首次心跳测量。 */
  pingLatencyMs: number | null
  /** 下次重连的绝对时间戳（ms since epoch）。null 表示当前没有排期的重连。 */
  nextRetryAt: number | null
}

interface GatewayStore extends GatewayState {
  /** 用主进程推送的状态快照更新 store。 */
  set: (state: GatewayState) => void
}

/** gateway 连接状态 store。不持久化——连接是运行时状态，重启后需重连。 */
export const useGatewayStore = create<GatewayStore>()((set) => ({
  status: "idle",
  mode: null,
  url: null,
  error: null,
  pingLatencyMs: null,
  nextRetryAt: null,
  set: (state) => set(state),
}))
