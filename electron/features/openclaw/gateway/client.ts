/**
 * OpenClaw gateway WS RPC 客户端。
 *
 * 协议流程：
 * 1. WS 连接打开 → 服务器发 connect.challenge 事件（带 nonce）
 * 2. 客户端发 connect 请求（带设备签名或 token）
 * 3. 服务器返回 hello-ok → 进入就绪状态
 * 4. 后续通过 req/res 帧收发 RPC，通过 event 帧接收流式事件
 */

import type {
  ChatAbortParams,
  ChatEvent,
  ChatSendParams,
  ConnectChallenge,
  EventFrame,
  HelloOk,
  InboundFrame,
  RequestFrame,
  ResponseFrame,
  SessionCreateParams,
  SessionDeleteParams,
  SessionListParams,
  SessionPatchParams,
} from "./contract"
import WebSocket from "ws"
import log from "../../../core/logger"
import { cacheDeviceToken } from "./auth"
import { buildConnectParams } from "./handshake"

/** 等待 challenge 的超时（ms）。 */
const CHALLENGE_TIMEOUT_MS = 10_000
/** RPC 请求默认超时（ms）。 */
const REQUEST_TIMEOUT_MS = 15_000
/** 重连参数。 */
const RECONNECT_BASE_MS = 1_000
const RECONNECT_MAX_MS = 15_000

type ConnectionListener = (connected: boolean) => void
type ConnectErrorListener = (err: Error) => void
type EventListener = (frame: EventFrame) => void
type ChatEventListener = (event: ChatEvent) => void
type PendingReq = { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }

/**
 * Gateway WS RPC 客户端。
 * 封装连接管理、帧收发、RPC 调用、ChatEvent 按 session 分发。
 */
export class GatewayClient {
  private ws: WebSocket | null = null
  private stopped = false
  private connected = false
  private idCounter = 0
  private currentUrl = ""
  private currentAuth: { token?: string; password?: string } = {}
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempt = 0

  private readonly pending = new Map<string, PendingReq>()
  private readonly eventListeners = new Set<EventListener>()
  private readonly connectionListeners = new Set<ConnectionListener>()
  private readonly connectErrorListeners = new Set<ConnectErrorListener>()
  private challengeResolver: ((c: ConnectChallenge) => void) | null = null

  // ChatEvent 按 session 分发
  private readonly chatBySession = new Map<string, Set<ChatEventListener>>()
  private readonly chatAnyListeners = new Set<ChatEventListener>()

  /**
   * 连接到 gateway。
   * @param url WebSocket URL
   * @param auth 认证凭据（token 或 password）
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
    this.rejectAllPending("disconnected")
    try {
      this.ws?.close(1000)
    } catch {
      /* ignore */
    }
    this.ws = null
    this.connected = false
    this.chatBySession.clear()
    this.chatAnyListeners.clear()
  }

  /** 当前是否已连接。 */
  isConnected(): boolean {
    return this.connected
  }

  // ---------- RPC ----------

  /**
   * 发送 RPC 请求。
   * @param method RPC 方法名
   * @param params 请求参数
   * @param timeoutMs 超时时间（ms）
   */
  call(method: string, params?: unknown, timeoutMs = REQUEST_TIMEOUT_MS): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = `k${++this.idCounter}`
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`RPC timeout: ${method}`))
      }, timeoutMs)
      this.pending.set(id, { resolve, reject, timer })
      try {
        this.send({ type: "req", id, method, params })
      } catch (err) {
        this.pending.delete(id)
        clearTimeout(timer)
        reject(err)
      }
    })
  }

  /**
   * 发送聊天消息。
   * @param params 聊天参数
   */
  chatSend(params: ChatSendParams): Promise<unknown> {
    return this.call("chat.send", params)
  }

  /**
   * 中止聊天。
   * @param params 中止参数
   */
  chatAbort(params: ChatAbortParams): Promise<unknown> {
    return this.call("chat.abort", params)
  }

  /**
   * 创建会话。
   * @param params 会话参数
   */
  sessionCreate(params: SessionCreateParams): Promise<unknown> {
    return this.call("sessions.create", params)
  }

  /**
   * 列出会话。
   * @param params 查询参数
   */
  sessionList(params?: SessionListParams): Promise<unknown> {
    return this.call("sessions.list", params)
  }

  /**
   * 更新会话。
   * @param params 补丁参数
   */
  sessionPatch(params: SessionPatchParams): Promise<unknown> {
    return this.call("sessions.patch", params)
  }

  /**
   * 删除会话。
   * @param params 删除参数
   */
  sessionDelete(params: SessionDeleteParams): Promise<unknown> {
    return this.call("sessions.delete", params)
  }

  // ---------- 事件订阅 ----------

  /**
   * 订阅连接状态变化。
   * @param listener 状态回调
   * @returns 取消订阅函数
   */
  onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener)
    return () => this.connectionListeners.delete(listener)
  }

  /**
   * 订阅连接错误。
   * @param listener 错误回调
   * @returns 取消订阅函数
   */
  onConnectError(listener: ConnectErrorListener): () => void {
    this.connectErrorListeners.add(listener)
    return () => this.connectErrorListeners.delete(listener)
  }

  /**
   * 订阅所有 event 帧（底层接口）。
   * @param listener 事件帧回调
   * @returns 取消订阅函数
   */
  onEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  /**
   * 订阅指定 session 的 ChatEvent。
   * @param sessionKey 目标会话
   * @param listener 事件回调
   * @returns 取消订阅函数
   */
  subscribeChatEvent(sessionKey: string, listener: ChatEventListener): () => void {
    let set = this.chatBySession.get(sessionKey)
    if (!set) {
      set = new Set()
      this.chatBySession.set(sessionKey, set)
    }
    set.add(listener)
    return () => {
      set!.delete(listener)
      if (set!.size === 0) this.chatBySession.delete(sessionKey)
    }
  }

  /**
   * 订阅所有 session 的 ChatEvent（调试/监控用）。
   * @param listener 事件回调
   * @returns 取消订阅函数
   */
  onAnyChatEvent(listener: ChatEventListener): () => void {
    this.chatAnyListeners.add(listener)
    return () => this.chatAnyListeners.delete(listener)
  }

  // ---------- 内部实现 ----------

  private send(frame: RequestFrame): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(frame))
    } else {
      throw new Error("gateway socket not open")
    }
  }

  private handleFrame(raw: string): void {
    let frame: InboundFrame
    try {
      frame = JSON.parse(raw) as InboundFrame
    } catch {
      return
    }
    if (frame.type === "res") this.handleResponse(frame)
    else if (frame.type === "event") this.handleEvent(frame)
  }

  private handleResponse(frame: ResponseFrame): void {
    const req = this.pending.get(frame.id)
    if (!req) return
    this.pending.delete(frame.id)
    clearTimeout(req.timer)
    if (frame.ok) req.resolve(frame.payload)
    else req.reject(new Error(frame.error?.message ?? "RPC error"))
  }

  private handleEvent(frame: EventFrame): void {
    // challenge 握手拦截
    if (frame.event === "connect.challenge" && this.challengeResolver) {
      this.challengeResolver(frame.payload as ConnectChallenge)
      return
    }

    // 通用事件监听
    for (const fn of this.eventListeners) fn(frame)

    // ChatEvent 按 session 分发
    if (frame.event === "chat.event") {
      const chatEvent = frame.payload as ChatEvent | undefined
      if (chatEvent?.sessionKey) {
        const listeners = this.chatBySession.get(chatEvent.sessionKey)
        if (listeners) {
          for (const fn of listeners) fn(chatEvent)
        }
        for (const fn of this.chatAnyListeners) fn(chatEvent)
      }
    }
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
      socket.on("message", (data) => this.handleFrame(data.toString("utf-8")))
      socket.on("close", (code) => this.onClose(code))
      socket.on("error", (err) => log.warn(`[gateway] ws error: ${err.message}`))
    })
  }

  private async doHandshake(auth: { token?: string; password?: string }): Promise<void> {
    const challenge = await this.waitForChallenge()
    const params = buildConnectParams(challenge, auth)
    const helloOk = (await this.call("connect", params)) as HelloOk

    this.connected = true
    this.reconnectAttempt = 0
    for (const fn of this.connectionListeners) fn(true)
    log.info(`[gateway] connected, protocol=${helloOk.protocol}`)

    if (helloOk.auth?.deviceToken && params.device?.id) {
      cacheDeviceToken(helloOk.auth.deviceToken, params.device.id)
    }
  }

  private waitForChallenge(): Promise<ConnectChallenge> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.challengeResolver = null
        reject(new Error("challenge timeout"))
      }, CHALLENGE_TIMEOUT_MS)
      this.challengeResolver = (c) => {
        clearTimeout(timer)
        this.challengeResolver = null
        resolve(c)
      }
    })
  }

  private onClose(code: number): void {
    this.ws = null
    const wasConnected = this.connected
    this.connected = false
    this.rejectAllPending("connection closed")
    if (wasConnected) {
      for (const fn of this.connectionListeners) fn(false)
    }
    if (this.stopped) return
    log.info(`[gateway] disconnected code=${code}`)
    this.scheduleReconnect()
  }

  private rejectAllPending(reason: string): void {
    for (const [, req] of this.pending) {
      clearTimeout(req.timer)
      req.reject(new Error(reason))
    }
    this.pending.clear()
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return
    const delay = Math.min(RECONNECT_BASE_MS * Math.pow(1.7, this.reconnectAttempt), RECONNECT_MAX_MS)
    const jitter = Math.random() * delay * 0.3
    this.reconnectAttempt++
    log.info(`[gateway] reconnect in ${Math.round(delay + jitter)}ms (attempt ${this.reconnectAttempt})`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.doConnect(this.currentUrl, this.currentAuth).catch((err) => {
        const error = err instanceof Error ? err : new Error(String(err))
        for (const fn of this.connectErrorListeners) fn(error)
      })
    }, delay + jitter)
  }
}
