import type { EventFrame } from "../gateway/contract"

import { GatewaySocket } from "./socket"
import { GatewayCaller } from "./caller"
import { EventStream } from "./stream"

/** 创建 GatewayManager 时的生命周期钩子。 */
export interface GatewayManagerHooks {
  /** WebSocket 已连接且握手通过。 */
  onConnected: () => void
  /** WebSocket 从 connected 状态断开。 */
  onDisconnected: () => void
  /** 自动重连排期已排好(socket 内部),外部应切到 connecting 状态。 */
  onReconnecting: () => void
  /** 心跳延迟或重连计划时间变化。 */
  onMetrics: (metrics: { pingLatencyMs?: number | null; nextRetryAt?: number | null }) => void
  /** 认证相关错误。 */
  onAuthError: (message: string) => void
  /** 其他连接错误。 */
  onError: (message: string) => void
  /** 收到任意 gateway event 帧。 */
  onEvent: (frame: EventFrame) => void
}

/** Gateway 三件套(socket + caller + stream)的聚合对象。 */
export interface GatewayManager {
  socket: GatewaySocket
  caller: GatewayCaller
  stream: EventStream
}

/**
 * 创建并配置一套 Gateway 连接对象。
 * 只做传输层 wiring:注册连接状态、指标、错误、事件的通用监听。
 * 业务层的事件名 + key extractor 由上层通过 stream.registerKeyExtractor 注册。
 */
export function createGatewayManager(hooks: GatewayManagerHooks): GatewayManager {
  const s = new GatewaySocket()
  const c = new GatewayCaller(s)
  const e = new EventStream(s)

  s.connection.subscribe((connected) => {
    if (connected) hooks.onConnected()
    else hooks.onDisconnected()
  })

  s.metrics.subscribe((metrics) => hooks.onMetrics(metrics))

  s.reconnecting.subscribe(() => hooks.onReconnecting())

  s.connectError.subscribe((err) => {
    const code = (err as Error & { code?: string }).code ?? ""
    const isAuth = code.startsWith("AUTH_") || code.startsWith("DEVICE_AUTH_") || code === "4001" || (!code && /auth|token|password|unauthorized|forbidden/i.test(err.message))

    if (isAuth) hooks.onAuthError(err.message)
    else hooks.onError(err.message)
  })

  e.onAny((frame) => hooks.onEvent(frame as EventFrame))

  return { socket: s, caller: c, stream: e }
}
