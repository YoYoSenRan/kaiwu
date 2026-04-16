/**
 * Gateway WebSocket 传输层。
 * 职责：连接管理、帧收发、自动重连、心跳保活。
 * 不关心帧内容语义——RPC 匹配和事件路由交给 caller.ts / emitter.ts。
 */

import WebSocket from "ws"
import { scope } from "../../../infra/logger"
import type { ConnectChallenge, InboundFrame, RequestFrame } from "./contract"
import { buildConnectParams } from "./handshake"
import { cacheDeviceToken } from "./auth"
import type { HelloOk } from "./contract"

const log = scope("openclaw:gateway:socket")

const CHALLENGE_TIMEOUT_MS = 10_000
const RECONNECT_BASE_MS = 1_000
const RECONNECT_MAX_MS = 15_000
/** 心跳 ping 间隔（ms）。 */
const PING_INTERVAL_MS = 15_000
/** 连续没收到 pong 的容忍时长（ms）。3 × ping 间隔容忍单次丢包。 */
const PONG_TIMEOUT_MS = 45_000

type FrameListener = (frame: InboundFrame) => void
type ConnectionListener = (connected: boolean) => void
type ConnectErrorListener = (err: Error) => void

/** 心跳与重连时的客户端指标。 */
export interface SocketMetrics {
  pingLatencyMs?: number | null
  nextRetryAt?: number | null
}
type MetricsListener = (metrics: SocketMetrics) => void

/**
 * Gateway WebSocket 连接。
 * 外部通过 onFrame 监听所有入站帧，通过 send 发送出站帧。
 */
export class GatewaySocket {
  private ws: WebSocket | null = null
  private stopped = false
  private connected = false
  private currentUrl = ""
  private currentAuth: { token?: string; password?: string } = {}
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempt = 0
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private lastPongAt = 0
  private lastPingSentAt = 0

  private readonly frameListeners = new Set<FrameListener>()
  private readonly connectionListeners = new Set<ConnectionListener>()
  private readonly connectErrorListeners = new Set<ConnectErrorListener>()
  private readonly metricsListeners = new Set<MetricsListener>()

  /**
   * 连接到 gateway。
   * @param url WebSocket URL
   * @param auth 认证凭据
   */
  async connect(url: string, auth: { token?: string; password?: string }): Promise<void> {
    this.stopped = false
    this.currentUrl = url
    this.currentAuth = auth
    try {
      await this.doConnect(url, auth)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      for (const fn of this.connectErrorListeners) fn(error)
      throw error
    }
  }

  /** 断开连接并停止重连。 */
  disconnect(): void {
    this.stopped = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.stopHeartbeat()
    try {
      this.ws?.terminate()
    } catch {
      /* ignore */
    }
    this.ws = null
    this.setConnected(false)
    // 防止多次 createGateway 累积旧 listeners
    this.frameListeners.clear()
    this.connectionListeners.clear()
    this.connectErrorListeners.clear()
    this.metricsListeners.clear()
  }

  /** 当前是否已连接。 */
  isConnected(): boolean {
    return this.connected
  }

  /** 发送请求帧。 */
  send(frame: RequestFrame): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(frame))
    } else {
      throw new Error("gateway socket not open")
    }
  }

  // ---------- 订阅 ----------

  /** 监听所有入站帧（res + event）。 */
  onFrame(listener: FrameListener): () => void {
    this.frameListeners.add(listener)
    return () => this.frameListeners.delete(listener)
  }

  /** 订阅连接状态变化。 */
  onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener)
    return () => this.connectionListeners.delete(listener)
  }

  /** 订阅连接错误。 */
  onConnectError(listener: ConnectErrorListener): () => void {
    this.connectErrorListeners.add(listener)
    return () => this.connectErrorListeners.delete(listener)
  }

  /** 订阅心跳延迟等指标变化。 */
  onMetrics(listener: MetricsListener): () => void {
    this.metricsListeners.add(listener)
    return () => this.metricsListeners.delete(listener)
  }

  // ---------- 内部 ----------

  private handleRawMessage(raw: string): void {
    let frame: InboundFrame
    try {
      frame = JSON.parse(raw) as InboundFrame
    } catch {
      return
    }
    for (const fn of this.frameListeners) fn(frame)
  }

  private setConnected(value: boolean): void {
    if (this.connected === value) return
    this.connected = value
    for (const fn of this.connectionListeners) fn(value)
  }

  private async doConnect(url: string, auth: { token?: string; password?: string }): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url)
      this.ws = socket
      const timer = setTimeout(() => {
        socket.close()
        reject(new Error("WS open timeout"))
      }, CHALLENGE_TIMEOUT_MS)

      socket.on("open", () => {
        clearTimeout(timer)
        this.doHandshake(auth)
          .then(resolve)
          .catch((err) => {
            socket.close()
            reject(err)
          })
      })
      socket.on("message", (data) => this.handleRawMessage(data.toString("utf-8")))
      socket.on("close", (code) => this.onClose(code))
      socket.on("error", (err) => log.warn(`WebSocket 错误: ${err.message}`))
    })
  }

  private async doHandshake(auth: { token?: string; password?: string }): Promise<void> {
    // 等待 challenge 事件
    const challenge = await this.waitForChallenge()
    const params = buildConnectParams(challenge, auth)

    // 握手期间需要临时的 RPC 能力（发 connect 请求等 hello-ok 响应）
    const helloOk = (await this.handshakeCall("connect", params)) as HelloOk

    this.reconnectAttempt = 0
    this.startHeartbeat()
    this.setConnected(true)
    log.info(`已连接, protocol=${helloOk.protocol}`)

    if (helloOk.auth?.deviceToken && params.device?.id) {
      cacheDeviceToken(helloOk.auth.deviceToken, params.device.id)
    }
  }

  /** 握手专用的一次性 RPC 调用（还没有 caller 实例时使用）。 */
  private handshakeCall(method: string, params: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = `hs_${Date.now()}`
      const timer = setTimeout(() => reject(new Error("handshake RPC timeout")), CHALLENGE_TIMEOUT_MS)

      const unsub = this.onFrame((frame) => {
        if (frame.type === "res" && frame.id === id) {
          clearTimeout(timer)
          unsub()
          if (frame.ok) resolve(frame.payload)
          else {
            const err = new Error(frame.error?.message ?? "handshake error")
            // 携带 gateway error code，供 manager 判断错误类型（避免字符串匹配）
            ;(err as Error & { code?: string }).code = frame.error?.code
            reject(err)
          }
        }
      })
      this.send({ type: "req", id, method, params })
    })
  }

  private waitForChallenge(): Promise<ConnectChallenge> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("challenge timeout"))
      }, CHALLENGE_TIMEOUT_MS)

      // challenge 通过 event 帧到达，需要在 onFrame 中拦截
      const unsub = this.onFrame((frame) => {
        if (frame.type === "event" && frame.event === "connect.challenge") {
          clearTimeout(timer)
          unsub()
          resolve(frame.payload as ConnectChallenge)
        }
      })
    })
  }

  private onClose(code: number): void {
    this.stopHeartbeat()
    this.ws = null
    this.setConnected(false)
    if (this.stopped) return

    if (code === 4001) {
      log.warn("gateway auth changed (4001), 停止重连")
      this.stopped = true
      const err = new Error("gateway auth changed") as Error & { code?: string }
      err.code = "4001"
      for (const fn of this.connectErrorListeners) fn(err)
      return
    }

    log.info(`断开连接, code=${code}`)
    this.scheduleReconnect()
  }

  private startHeartbeat(): void {
    if (!this.ws) return
    this.stopHeartbeat()
    this.lastPongAt = Date.now()
    this.lastPingSentAt = 0
    this.ws.on("pong", () => {
      this.lastPongAt = Date.now()
      if (this.lastPingSentAt > 0) {
        this.emitMetrics({ pingLatencyMs: this.lastPongAt - this.lastPingSentAt })
      }
    })
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) return
      if (Date.now() - this.lastPongAt > PONG_TIMEOUT_MS) {
        log.warn(`Pong 超时 ${PONG_TIMEOUT_MS}ms，强制重连`)
        this.ws.terminate()
        return
      }
      this.lastPingSentAt = Date.now()
      this.ws.ping()
    }, PING_INTERVAL_MS)
  }

  private stopHeartbeat(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private emitMetrics(metrics: SocketMetrics): void {
    for (const fn of this.metricsListeners) fn(metrics)
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return
    const delay = Math.min(RECONNECT_BASE_MS * Math.pow(1.7, this.reconnectAttempt), RECONNECT_MAX_MS)
    const jitter = Math.random() * delay * 0.3
    const totalDelay = delay + jitter
    this.reconnectAttempt++
    log.info(`${Math.round(totalDelay)}ms 后重连 (attempt ${this.reconnectAttempt})`)
    this.emitMetrics({ nextRetryAt: Date.now() + totalDelay, pingLatencyMs: null })
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.doConnect(this.currentUrl, this.currentAuth).catch((err) => {
        const error = err instanceof Error ? err : new Error(String(err))
        for (const fn of this.connectErrorListeners) fn(error)
      })
    }, totalDelay)
  }
}
