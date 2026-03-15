/**
 * Gateway WebSocket 客户端
 * 纯逻辑层，不依赖 React，可独立测试
 */

import type { GatewayStatus, GatewayRequest, GatewayEvent, GatewayError, GatewayInfo, HandshakeParams } from "@/types/gateway"
import { NON_RETRYABLE_ERROR_CODES } from "@/types/gateway"
import { saveDeviceToken } from "./credentials"

/** Gateway 协议版本 */
const PROTOCOL_VERSION = 3

/** 心跳间隔 30 秒 */
const PING_INTERVAL_MS = 30_000

/** 连续未响应上限 */
const MAX_MISSED_PONGS = 3

/** 重连最大次数 */
const MAX_RECONNECT_ATTEMPTS = 10

/** 重连退避上限 15 秒 */
const MAX_BACKOFF_MS = 15_000

/** 客户端版本 */
const CLIENT_VERSION = "0.1.0"

/** 事件回调接口 */
export interface GatewayCallbacks {
  onStatusChange: (status: GatewayStatus) => void
  onMessage: (message: GatewayEvent) => void
  onError: (error: string) => void
  onLatency: (ms: number) => void
  onReconnectAttempt: (attempt: number) => void
  onGatewayInfo: (info: GatewayInfo) => void
}

/**
 * 规范化用户输入的 URL 为 WebSocket 地址
 * - localhost/127.0.0.1/::1 -> ws://
 * - 远程地址 -> wss://
 * - 默认端口 18789
 */
export function normalizeGatewayUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return "ws://127.0.0.1:18789"

  // 补全协议前缀以便 URL 解析
  const withProtocol =
    trimmed.startsWith("ws://") || trimmed.startsWith("wss://") || trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `placeholder://${trimmed}`

  let parsed: URL
  try {
    parsed = new URL(withProtocol)
  } catch {
    // URL 无法解析，原样返回，让 WebSocket 构造函数报错
    return trimmed
  }

  const hostname = parsed.hostname.toLowerCase()
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"

  // 协议：本地 ws，远程 wss
  const protocol = isLocal ? "ws:" : "wss:"

  // 端口：没有显式指定则用默认端口
  const port = parsed.port || "18789"

  // 路径：保留用户自定义路径（如反向代理 /gw），但去掉末尾斜杠
  const pathname = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "")

  return `${protocol}//${parsed.hostname}:${port}${pathname}`
}

/**
 * 计算指数退避延迟
 * base * 1.7^attempt，上限 15 秒
 */
function calculateBackoff(attempt: number): number {
  return Math.min(1000 * Math.pow(1.7, attempt), MAX_BACKOFF_MS)
}

/**
 * 从 GatewayError 中提取错误码
 */
function extractErrorCode(error: GatewayError | undefined): string | null {
  if (!error) return null
  if (error.details?.["code"] && typeof error.details["code"] === "string") {
    return error.details["code"] as string
  }
  return error.code || null
}

/**
 * Gateway WebSocket 客户端
 *
 * 负责连接建立、challenge-response 握手、心跳、自动重连。
 * 不依赖 React，通过回调函数通知外部状态变化。
 */
export class GatewayWebSocket {
  private ws: WebSocket | null = null
  private url = ""
  private token = ""
  private deviceToken: string | undefined
  private callbacks: GatewayCallbacks

  // 状态
  private status: GatewayStatus = "disconnected"
  private handshakeComplete = false
  private manualDisconnect = false

  // 心跳
  private pingInterval: ReturnType<typeof setInterval> | undefined
  private missedPongs = 0
  private pingCounter = 0
  private pingSentTimestamps = new Map<string, number>()

  // 重连
  private reconnectTimeout: ReturnType<typeof setTimeout> | undefined
  private reconnectAttempt = 0

  // 请求 ID 计数器
  private requestSeq = 0

  constructor(callbacks: GatewayCallbacks) {
    this.callbacks = callbacks
  }

  /** 生成唯一请求 ID */
  private nextRequestId(): string {
    this.requestSeq += 1
    return `kaiwu-${this.requestSeq}`
  }

  /** 更新状态并通知外部 */
  private setStatus(newStatus: GatewayStatus): void {
    this.status = newStatus
    this.callbacks.onStatusChange(newStatus)
  }

  /** 建立 WebSocket 连接 */
  connect(url: string, token: string, deviceToken?: string): void {
    // 防止重复连接
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      console.log("[GatewayWS] 跳过连接：已有活跃连接, readyState:", this.ws.readyState)
      return
    }
    console.log("[GatewayWS] connect() 被调用, url:", url, "token长度:", token.length)

    this.url = normalizeGatewayUrl(url)
    this.token = token
    this.deviceToken = deviceToken
    this.handshakeComplete = false
    this.manualDisconnect = false
    this.reconnectAttempt = 0

    this.setStatus("connecting")
    this.createConnection()
  }

  /** 主动断开连接 */
  disconnect(): void {
    this.manualDisconnect = true
    this.reconnectAttempt = 0
    this.clearReconnectTimeout()
    this.stopHeartbeat()

    if (this.ws) {
      this.ws.close(1000, "Manual disconnect")
      this.ws = null
    }

    this.handshakeComplete = false
    this.setStatus("disconnected")
  }

  /** 发送消息（握手完成后才能发送） */
  send(message: GatewayRequest): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.handshakeComplete) {
      return false
    }

    try {
      this.ws.send(JSON.stringify(message))
      return true
    } catch {
      return false
    }
  }

  /** 当前是否已连接且握手完成 */
  get isConnected(): boolean {
    return this.status === "connected" && this.handshakeComplete
  }

  /** 销毁客户端，清理所有资源 */
  destroy(): void {
    this.disconnect()
  }

  // --- 内部方法 ---

  private createConnection(): void {
    try {
      console.log("[GatewayWS] 正在连接:", this.url)
      const ws = new WebSocket(this.url)
      this.ws = ws

      ws.onopen = () => {
        console.log("[GatewayWS] WebSocket 已打开，等待 challenge")
      }

      ws.onmessage = (event: MessageEvent) => {
        console.log("[GatewayWS] 收到消息:", (event.data as string).slice(0, 200))
        this.handleRawMessage(event.data as string)
      }

      ws.onclose = (event: CloseEvent) => {
        console.log("[GatewayWS] 连接关闭:", event.code, event.reason)
        this.handleClose(event)
      }

      ws.onerror = () => {
        console.log("[GatewayWS] 连接错误")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "WebSocket 初始化失败"
      console.error("[GatewayWS] 创建失败:", message)
      this.callbacks.onError(message)
      this.setStatus("disconnected")
    }
  }

  /** 解析并路由收到的消息 */
  private handleRawMessage(data: string): void {
    let frame: Record<string, unknown>
    try {
      frame = JSON.parse(data) as Record<string, unknown>
    } catch {
      this.callbacks.onError("收到无法解析的消息")
      return
    }

    const type = frame["type"] as string | undefined

    if (type === "event") {
      this.handleEventFrame(frame)
    } else if (type === "res") {
      this.handleResponseFrame(frame)
    }
  }

  /** 处理事件帧 */
  private handleEventFrame(frame: Record<string, unknown>): void {
    // 兼容两种字段名：event/method（实际 Gateway 用 event），payload/params
    const method = (frame["event"] ?? frame["method"]) as string | undefined
    const payload = (frame["payload"] ?? frame["params"]) as Record<string, unknown> | undefined

    // challenge-response 握手
    if (method === "connect.challenge") {
      this.sendHandshake()
      return
    }

    // 握手完成后的业务事件，转发给外部
    if (this.handshakeComplete) {
      const event: GatewayEvent = { type: "event", method: method ?? "unknown", params: payload, seq: typeof frame["seq"] === "number" ? (frame["seq"] as number) : undefined }
      this.callbacks.onMessage(event)
    }
  }

  /** 处理响应帧 */
  private handleResponseFrame(frame: Record<string, unknown>): void {
    const id = frame["id"] as string | undefined
    const ok = frame["ok"] as boolean | undefined
    const error = frame["error"] as GatewayError | undefined
    const result = (frame["result"] ?? frame["payload"]) as Record<string, unknown> | undefined
    const hasError = ok === false || (error !== undefined && error !== null)

    // Pong 响应（ping 请求的回复）
    if (id?.startsWith("kaiwu-ping-")) {
      this.handlePong(id)
      return
    }

    // 握手响应
    if (!this.handshakeComplete) {
      if (hasError && error) {
        this.handleHandshakeError(error)
      } else {
        this.handleHandshakeSuccess(result)
      }
      return
    }

    // 握手后的普通响应——目前不需要特殊处理
  }

  /** 发送握手请求 */
  private sendHandshake(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    const params: HandshakeParams = {
      minProtocol: PROTOCOL_VERSION,
      maxProtocol: PROTOCOL_VERSION,
      client: { id: "openclaw-control-ui", displayName: "Kaiwu Console", version: CLIENT_VERSION, platform: "web", mode: "ui", instanceId: `kaiwu-${Date.now()}` },
      role: "operator",
      scopes: ["operator.admin"],
      caps: ["tool-events"],
      auth: { token: this.token },
      deviceToken: this.deviceToken,
    }

    const request: GatewayRequest = { type: "req", method: "connect", id: this.nextRequestId(), params: { ...params } }

    this.ws.send(JSON.stringify(request))
  }

  /** 握手成功 */
  private handleHandshakeSuccess(result: Record<string, unknown> | undefined): void {
    this.handshakeComplete = true
    this.reconnectAttempt = 0
    this.setStatus("connected")
    this.startHeartbeat()

    const protocol = typeof result?.["protocol"] === "number" ? (result["protocol"] as number) : PROTOCOL_VERSION
    const deviceToken = typeof result?.["deviceToken"] === "string" ? (result["deviceToken"] as string) : undefined

    // 缓存 Gateway 返回的设备令牌
    if (deviceToken) {
      this.deviceToken = deviceToken
      saveDeviceToken(deviceToken)
    }

    this.callbacks.onGatewayInfo({ protocol, deviceToken })
  }

  /** 握手失败 */
  private handleHandshakeError(error: GatewayError): void {
    const code = extractErrorCode(error)
    const message = error.message || "握手失败"
    const isNonRetryable = (code !== null && NON_RETRYABLE_ERROR_CODES.has(code)) || NON_RETRYABLE_ERROR_CODES.has(error.code)

    this.callbacks.onError(`Gateway 握手错误: ${message} (${error.code})`)

    if (isNonRetryable) {
      // 不可恢复的错误，停止重连
      this.manualDisconnect = true // 阻止 onclose 触发重连
      this.stopHeartbeat()
      this.ws?.close(4001, "Non-retryable handshake error")
    }
  }

  /** 处理连接关闭 */
  private handleClose(_event: CloseEvent): void {
    const wasConnected = this.handshakeComplete
    this.handshakeComplete = false
    this.stopHeartbeat()

    // 手动断开不触发重连
    if (this.manualDisconnect) return

    // 从未成功握手过（首次连接失败），不重连，直接报错
    if (!wasConnected && this.reconnectAttempt === 0) {
      this.callbacks.onError("无法连接到 Gateway，请检查地址和认证信息")
      this.setStatus("disconnected")
      return
    }

    // 已成功连接过后断线，尝试自动重连
    if (this.reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
      this.setStatus("reconnecting")
      const base = calculateBackoff(this.reconnectAttempt)
      // 添加 +-25% 的抖动
      const jitter = base * (0.75 + Math.random() * 0.5)
      const delay = Math.round(jitter)

      this.reconnectAttempt += 1
      this.callbacks.onReconnectAttempt(this.reconnectAttempt)

      this.reconnectTimeout = setTimeout(() => {
        this.createConnection()
      }, delay)
    } else {
      this.callbacks.onError(`已达最大重连次数 (${MAX_RECONNECT_ATTEMPTS})，请手动重新连接`)
      this.setStatus("disconnected")
    }
  }

  // --- 心跳 ---

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.missedPongs = 0
    this.pingSentTimestamps.clear()

    this.pingInterval = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.handshakeComplete) return

      // 检查未响应次数
      if (this.missedPongs >= MAX_MISSED_PONGS) {
        this.callbacks.onError(`连续 ${MAX_MISSED_PONGS} 次心跳未响应，触发重连`)
        this.ws.close(4000, "Heartbeat timeout")
        return
      }

      this.pingCounter += 1
      const pingId = `kaiwu-ping-${this.pingCounter}`

      // 防止 map 无限增长
      if (this.pingSentTimestamps.size >= 10) {
        const oldest = this.pingSentTimestamps.keys().next().value
        if (oldest !== undefined) this.pingSentTimestamps.delete(oldest)
      }

      this.pingSentTimestamps.set(pingId, Date.now())
      this.missedPongs += 1

      try {
        this.ws.send(JSON.stringify({ type: "req", method: "ping", id: pingId }))
      } catch {
        // 发送失败，onclose 会触发重连
      }
    }, PING_INTERVAL_MS)
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = undefined
    }
    this.missedPongs = 0
    this.pingSentTimestamps.clear()
  }

  private handlePong(id: string): void {
    const sentAt = this.pingSentTimestamps.get(id)
    if (sentAt !== undefined) {
      const rtt = Date.now() - sentAt
      this.pingSentTimestamps.delete(id)
      this.missedPongs = 0
      this.callbacks.onLatency(rtt)
    }
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = undefined
    }
  }
}
