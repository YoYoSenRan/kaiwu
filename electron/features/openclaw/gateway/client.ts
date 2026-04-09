/**
 * OpenClaw gateway WS RPC 客户端。
 *
 * 协议流程：
 * 1. WS 连接打开 → 服务器发 connect.challenge 事件（带 nonce）
 * 2. 客户端发 connect 请求（带设备签名或 token）
 * 3. 服务器返回 hello-ok → 进入就绪状态
 * 4. 后续通过 req/res 帧收发 RPC，通过 event 帧接收流式事件
 */

import WebSocket from "ws"
import log from "../../../core/logger"
import { cacheDeviceToken } from "./auth"
import { buildConnectParams } from "./handshake"
import type { ConnectChallenge, EventFrame, HelloOk, InboundFrame, RequestFrame, ResponseFrame } from "./contract"

/** 等待 challenge 的超时（ms）。 */
const CHALLENGE_TIMEOUT_MS = 10_000
/** RPC 请求默认超时（ms）。 */
const REQUEST_TIMEOUT_MS = 15_000
/** 重连参数。 */
const RECONNECT_BASE_MS = 1_000
const RECONNECT_MAX_MS = 15_000

type ConnectionListener = (connected: boolean) => void
type ConnectErrorListener = (err: Error) => void
type PendingReq = { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }
type EventListener = (frame: EventFrame) => void

export interface GatewayClient {
  connect: (url: string, auth: { token?: string; password?: string }) => Promise<void>
  disconnect: () => void
  call: (method: string, params?: unknown, timeoutMs?: number) => Promise<unknown>
  onConnectionChange: (listener: ConnectionListener) => () => void
  onConnectError: (listener: ConnectErrorListener) => () => void
  onEvent: (listener: EventListener) => () => void
  isConnected: () => boolean
}

/**
 * 创建 gateway WS RPC 客户端。
 */
export function createGatewayClient(): GatewayClient {
  let ws: WebSocket | null = null
  let connected = false
  let stopped = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempt = 0
  let currentUrl = ""
  let currentAuth: { token?: string; password?: string } = {}
  let idCounter = 0

  const connectionListeners = new Set<ConnectionListener>()
  const connectErrorListeners = new Set<ConnectErrorListener>()
  const eventListeners = new Set<EventListener>()
  const pending = new Map<string, PendingReq>()
  let challengeResolver: ((c: ConnectChallenge) => void) | null = null

  function send(frame: RequestFrame): void {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(frame))
    } else {
      throw new Error("gateway socket not open")
    }
  }

  function handleFrame(raw: string): void {
    let frame: InboundFrame
    try {
      frame = JSON.parse(raw) as InboundFrame
    } catch {
      return
    }
    if (frame.type === "res") handleResponse(frame)
    else if (frame.type === "event") handleEvent(frame)
  }

  function handleResponse(frame: ResponseFrame): void {
    const req = pending.get(frame.id)
    if (!req) return
    pending.delete(frame.id)
    clearTimeout(req.timer)
    if (frame.ok) req.resolve(frame.payload)
    else req.reject(new Error(frame.error?.message ?? "RPC error"))
  }

  function handleEvent(frame: EventFrame): void {
    if (frame.event === "connect.challenge" && challengeResolver) {
      challengeResolver(frame.payload as ConnectChallenge)
      return
    }
    for (const fn of eventListeners) fn(frame)
  }

  function call(method: string, params?: unknown, timeoutMs = REQUEST_TIMEOUT_MS): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = `k${++idCounter}`
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new Error(`RPC timeout: ${method}`))
      }, timeoutMs)
      pending.set(id, { resolve, reject, timer })
      try {
        send({ type: "req", id, method, params })
      } catch (err) {
        pending.delete(id)
        clearTimeout(timer)
        reject(err)
      }
    })
  }

  async function doConnect(url: string, auth: { token?: string; password?: string }): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url)
      ws = socket
      const timer = setTimeout(() => {
        socket.close()
        reject(new Error("WS open timeout"))
      }, CHALLENGE_TIMEOUT_MS)

      socket.on("open", () => {
        clearTimeout(timer)
        doHandshake(auth)
          .then(resolve)
          .catch((err) => {
            socket.close()
            reject(err)
          })
      })
      socket.on("message", (data) => handleFrame(data.toString("utf-8")))
      socket.on("close", (code) => onClose(code))
      socket.on("error", (err) => log.warn(`[gateway] ws error: ${err.message}`))
    })
  }

  async function doHandshake(auth: { token?: string; password?: string }): Promise<void> {
    const challenge = await waitForChallenge()
    const params = buildConnectParams(challenge, auth)
    const helloOk = (await call("connect", params)) as HelloOk

    connected = true
    reconnectAttempt = 0
    for (const fn of connectionListeners) fn(true)
    log.info(`[gateway] connected, protocol=${helloOk.protocol}`)

    if (helloOk.auth?.deviceToken && params.device?.id) {
      cacheDeviceToken(helloOk.auth.deviceToken, params.device.id)
    }
  }

  function waitForChallenge(): Promise<ConnectChallenge> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        challengeResolver = null
        reject(new Error("challenge timeout"))
      }, CHALLENGE_TIMEOUT_MS)
      challengeResolver = (c) => {
        clearTimeout(timer)
        challengeResolver = null
        resolve(c)
      }
    })
  }

  function onClose(code: number): void {
    ws = null
    const wasConnected = connected
    connected = false
    for (const [, req] of pending) {
      clearTimeout(req.timer)
      req.reject(new Error("connection closed"))
    }
    pending.clear()
    if (wasConnected) {
      for (const fn of connectionListeners) fn(false)
    }
    if (stopped) return
    log.info(`[gateway] disconnected code=${code}`)
    scheduleReconnect()
  }

  function scheduleReconnect(): void {
    if (stopped || reconnectTimer) return
    const delay = Math.min(RECONNECT_BASE_MS * Math.pow(1.7, reconnectAttempt), RECONNECT_MAX_MS)
    const jitter = Math.random() * delay * 0.3
    reconnectAttempt++
    log.info(`[gateway] reconnect in ${Math.round(delay + jitter)}ms (attempt ${reconnectAttempt})`)
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      void doConnect(currentUrl, currentAuth).catch((err) => {
        const error = err instanceof Error ? err : new Error(String(err))
        for (const fn of connectErrorListeners) fn(error)
      })
    }, delay + jitter)
  }

  return {
    connect(url, auth) {
      stopped = false
      currentUrl = url
      currentAuth = auth
      return doConnect(url, auth).catch((err) => {
        const error = err instanceof Error ? err : new Error(String(err))
        for (const fn of connectErrorListeners) fn(error)
        throw error
      })
    },
    disconnect() {
      stopped = true
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      for (const [, req] of pending) {
        clearTimeout(req.timer)
        req.reject(new Error("disconnected"))
      }
      pending.clear()
      try {
        ws?.close(1000)
      } catch {
        /* ignore */
      }
      ws = null
      connected = false
    },
    call,
    onConnectionChange(listener) {
      connectionListeners.add(listener)
      return () => connectionListeners.delete(listener)
    },
    onConnectError(listener) {
      connectErrorListeners.add(listener)
      return () => connectErrorListeners.delete(listener)
    },
    onEvent(listener) {
      eventListeners.add(listener)
      return () => eventListeners.delete(listener)
    },
    isConnected: () => connected,
  }
}
