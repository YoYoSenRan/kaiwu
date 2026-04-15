import type { GatewayEventFrame } from "../types"

import { GatewaySocket } from "./socket"
import { GatewayCaller } from "./caller"
import { EventEmitter } from "./emitter"

/** 创建 GatewayManager 时的生命周期钩子。 */
export interface GatewayManagerHooks {
  /** WebSocket 已连接且握手通过。 */
  onConnected: () => void
  /** WebSocket 从 connected 状态断开。 */
  onDisconnected: () => void
  /** 心跳延迟或重连计划时间变化。 */
  onMetrics: (metrics: { pingLatencyMs?: number | null; nextRetryAt?: number | null }) => void
  /** 认证相关错误。 */
  onAuthError: (message: string) => void
  /** 其他连接错误。 */
  onError: (message: string) => void
  /** 收到任意 gateway event 帧。 */
  onEvent: (frame: GatewayEventFrame) => void
}

/** Gateway 三件套（socket + caller + emitter）的聚合对象。 */
export interface GatewayManager {
  socket: GatewaySocket
  caller: GatewayCaller
  emitter: EventEmitter
}

/**
 * 创建并配置一套 Gateway 连接对象。
 * 注册连接状态、指标、错误和事件的通用监听，具体行为通过 hooks 外化。
 */
export function createGatewayManager(hooks: GatewayManagerHooks): GatewayManager {
  const s = new GatewaySocket()
  const c = new GatewayCaller(s)
  const e = new EventEmitter(s)

  // 按 sessionKey 定向分发 chat/agent 事件
  const sessionKeyExtractor = (payload: unknown) => {
    const p = payload as { sessionKey?: string }
    return p.sessionKey
  }
  e.registerKeyExtractor("chat", sessionKeyExtractor)
  e.registerKeyExtractor("agent", sessionKeyExtractor)

  s.onConnectionChange((connected) => {
    if (connected) hooks.onConnected()
    else hooks.onDisconnected()
  })

  s.onMetrics((metrics) => hooks.onMetrics(metrics))

  s.onConnectError((err) => {
    const msg = err.message.toLowerCase()
    const isAuth =
      msg.includes("auth") || msg.includes("token") || msg.includes("password") || msg.includes("mismatch") || msg.includes("unauthorized") || msg.includes("forbidden")

    if (isAuth) hooks.onAuthError(err.message)
    else hooks.onError(err.message)
  })

  e.onAny((frame) => hooks.onEvent(frame as GatewayEventFrame))

  return { socket: s, caller: c, emitter: e }
}
