/**
 * Gateway WebSocket 传输层。
 * 职责:连接 + 帧收发 + 触发握手。
 * 心跳逻辑下沉到 ./heartbeat.ts,重连排期下沉到 ./reconnect.ts,5 个订阅源走 ./signal.ts。
 * 帧内容语义不在这里——RPC 匹配走 caller.ts,事件路由走 emitter.ts。
 */

import WebSocket from "ws"
import { scope } from "../../../infra/logger"
import type { ConnectChallenge, InboundFrame, RequestFrame } from "./contract"
import { buildConnectParams } from "./handshake"
import { cacheDeviceToken } from "./auth"
import type { HelloOk } from "./contract"
import { Heartbeat } from "./heartbeat"
import { Reconnector } from "./reconnect"
import { Signal } from "./signal"

const log = scope("openclaw:gateway:socket")

const CHALLENGE_TIMEOUT_MS = 10_000

/** 心跳与重连时的客户端指标。 */
export interface SocketMetrics {
  pingLatencyMs?: number | null
  nextRetryAt?: number | null
}

/**
 * Gateway WebSocket 连接。
 * 5 个 Signal 暴露给上层订阅:frames / connection / connectError / metrics / reconnecting。
 */
export class GatewaySocket {
  /** 入站帧(res + event)。 */
  readonly frames = new Signal<InboundFrame>()
  /** 连接状态变化(true/false)。 */
  readonly connection = new Signal<boolean>()
  /** 握手或运行时连接错误。 */
  readonly connectError = new Signal<Error>()
  /** 心跳延迟 / 下次重连时间等指标。 */
  readonly metrics = new Signal<SocketMetrics>()
  /** 自动重连排期已排好,外层应切到 connecting 状态。 */
  readonly reconnecting = new Signal<void>()

  private ws: WebSocket | null = null
  private connected = false
  private currentUrl = ""
  private currentAuth: { token?: string; password?: string } = {}

  private readonly heartbeat = new Heartbeat({
    onLatency: (ms) => this.metrics.emit({ pingLatencyMs: ms }),
    onTimeout: () => this.ws?.terminate(),
  })

  private readonly reconnector = new Reconnector({
    onSchedule: (nextRetryAt) => {
      this.metrics.emit({ nextRetryAt, pingLatencyMs: null })
      this.reconnecting.emit(undefined)
    },
    attempt: async () => {
      try {
        await this.doConnect(this.currentUrl, this.currentAuth)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        this.connectError.emit(error)
        this.reconnector.schedule()
      }
    },
  })

  /** 连接到 gateway。 */
  async connect(url: string, auth: { token?: string; password?: string }): Promise<void> {
    this.reconnector.resume()
    this.currentUrl = url
    this.currentAuth = auth
    try {
      await this.doConnect(url, auth)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.connectError.emit(error)
      throw error
    }
  }

  /** 断开连接并停止重连。 */
  disconnect(): void {
    this.reconnector.stop()
    this.heartbeat.stop()
    try {
      this.ws?.terminate()
    } catch {
      /* ignore */
    }
    this.ws = null
    this.setConnected(false)
  }

  /** 当前是否已连接。 */
  isConnected(): boolean {
    return this.connected
  }

  /** 发送请求帧。WS 未 open 抛错。 */
  send(frame: RequestFrame): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new Error("gateway socket not open")
    }
    this.ws.send(JSON.stringify(frame))
  }

  // ---------- 内部 ----------

  private setConnected(value: boolean): void {
    if (this.connected === value) return
    this.connected = value
    this.connection.emit(value)
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

  private handleRawMessage(raw: string): void {
    let frame: InboundFrame
    try {
      frame = JSON.parse(raw) as InboundFrame
    } catch {
      return
    }
    this.frames.emit(frame)
  }

  private async doHandshake(auth: { token?: string; password?: string }): Promise<void> {
    const challenge = await this.waitForChallenge()
    const params = buildConnectParams(challenge, auth)
    const helloOk = (await this.handshakeCall("connect", params)) as HelloOk

    this.reconnector.reset()
    if (this.ws) this.heartbeat.start(this.ws)
    this.setConnected(true)
    log.info(`已连接, protocol=${helloOk.protocol}`)

    if (helloOk.auth?.deviceToken && params.device?.id) {
      cacheDeviceToken(helloOk.auth.deviceToken, params.device.id)
    }
  }

  /** 握手专用的一次性 RPC 调用(还没有 caller 实例时使用)。 */
  private handshakeCall(method: string, params: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = `hs_${Date.now()}`
      const timer = setTimeout(() => reject(new Error("handshake RPC timeout")), CHALLENGE_TIMEOUT_MS)

      const off = this.frames.subscribe((frame) => {
        if (frame.type === "res" && frame.id === id) {
          clearTimeout(timer)
          off()
          if (frame.ok) resolve(frame.payload)
          else {
            const err = new Error(frame.error?.message ?? "handshake error")
            // 携带 gateway error code,供 manager 判断错误类型(避免字符串匹配)
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
      const timer = setTimeout(() => reject(new Error("challenge timeout")), CHALLENGE_TIMEOUT_MS)

      const off = this.frames.subscribe((frame) => {
        if (frame.type === "event" && frame.event === "connect.challenge") {
          clearTimeout(timer)
          off()
          resolve(frame.payload as ConnectChallenge)
        }
      })
    })
  }

  private onClose(code: number): void {
    this.heartbeat.stop()
    this.ws = null
    this.setConnected(false)

    if (code === 4001) {
      log.warn("gateway auth changed (4001), 停止重连")
      this.reconnector.stop()
      const err = new Error("gateway auth changed") as Error & { code?: string }
      err.code = "4001"
      this.connectError.emit(err)
      return
    }

    log.info(`断开连接, code=${code}`)
    this.reconnector.schedule()
  }
}
