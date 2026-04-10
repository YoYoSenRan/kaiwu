import { create } from "zustand"

type GatewayStatus = "idle" | "detecting" | "connecting" | "connected" | "disconnected" | "auth-error" | "error"
type GatewayMode = "scan" | "manual" | null

interface GatewayState {
  status: GatewayStatus
  mode: GatewayMode
  url: string | null
  error: string | null
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
  set: (state) => set(state),
}))
