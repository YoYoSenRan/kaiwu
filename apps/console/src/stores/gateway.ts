/**
 * Gateway 连接状态 Zustand Store
 * 作为 React 组件与 WebSocket 客户端之间的桥梁
 */

import { create } from "zustand"
import type { GatewayStatus } from "@/types/gateway"

export interface GatewayState {
  /** 连接状态 */
  status: GatewayStatus
  /** 当前连接的 Gateway URL */
  url: string | null
  /** 最近一次心跳延迟（毫秒） */
  latency: number | null
  /** 当前重连尝试次数 */
  reconnectAttempt: number
  /** 错误信息 */
  error: string | null

  // --- 操作 ---
  setStatus: (status: GatewayStatus) => void
  setUrl: (url: string | null) => void
  setLatency: (ms: number) => void
  setReconnectAttempt: (attempt: number) => void
  setError: (error: string | null) => void
  /** 重置为初始状态 */
  reset: () => void
}

const initialState = { status: "disconnected" as GatewayStatus, url: null, latency: null, reconnectAttempt: 0, error: null }

export const useGatewayStore = create<GatewayState>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status, error: status === "connected" ? null : undefined }),
  setUrl: (url) => set({ url }),
  setLatency: (ms) => set({ latency: ms }),
  setReconnectAttempt: (attempt) => set({ reconnectAttempt: attempt }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}))
