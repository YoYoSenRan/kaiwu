import type { PluginLogger } from "../../api.js"
import type { BridgeConfig } from "./handshake.js"
import type { BridgeOutboundMessage } from "./envelope.js"

/** 首次重连延迟（ms）。指数退避起点。 */
const INITIAL_RECONNECT_MS = 500
/** 重连最长延迟（ms）。到达此值后恒定等待。 */
const MAX_RECONNECT_MS = 30_000
/** 连接空闲时的心跳间隔（ms）。 */
const HEARTBEAT_MS = 15_000

export interface BridgeClient {
  start(): void
  stop(reason?: string): void
  send(message: BridgeOutboundMessage): void
  isConnected(): boolean
}

/**
 * 创建插件 → kaiwu 的 WebSocket 客户端。
 * 断线自动指数退避重连；kaiwu 未启动时不会抛错，静默重试。
 * configFactory 在**每次重连前**被调用，这样 kaiwu 重启写入新 handshake 后，
 * 插件能自动采用新的 port/token，无需重启 OpenClaw。
 * @param params.configFactory 返回当前有效配置，无配置返回 null
 */
export function createBridgeClient(params: {
  configFactory: () => BridgeConfig | null
  logger: PluginLogger
  onOpen?: () => void
  onClose?: (reason: string) => void
}): BridgeClient {
  const { configFactory, logger } = params
  let ws: WebSocket | null = null
  let stopped = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectDelay = INITIAL_RECONNECT_MS
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  const outbox: BridgeOutboundMessage[] = []

  function buildUrl(config: BridgeConfig): string {
    return `ws://127.0.0.1:${config.port}/kaiwu-bridge?token=${encodeURIComponent(config.token)}`
  }

  function connect(): void {
    if (stopped) return
    const config = configFactory()
    if (!config) {
      logger.debug?.("[kaiwu-bridge] no config yet, retrying later")
      scheduleReconnect()
      return
    }
    const url = buildUrl(config)
    logger.debug?.(`[kaiwu-bridge] connecting ${url}`)
    try {
      ws = new WebSocket(url)
    } catch (err) {
      logger.warn?.(`[kaiwu-bridge] ws construct failed: ${(err as Error).message}`)
      scheduleReconnect()
      return
    }

    ws.addEventListener("open", () => {
      logger.info?.("[kaiwu-bridge] connected to kaiwu")
      reconnectDelay = INITIAL_RECONNECT_MS
      flushOutbox()
      startHeartbeat()
      params.onOpen?.()
    })

    ws.addEventListener("close", (ev) => {
      stopHeartbeat()
      logger.debug?.(`[kaiwu-bridge] ws closed code=${ev.code}`)
      params.onClose?.(`close:${ev.code}`)
      ws = null
      scheduleReconnect()
    })

    ws.addEventListener("error", () => {
      // 错误事件后紧跟 close，统一在 close 里处理重连
    })
  }

  function scheduleReconnect(): void {
    if (stopped || reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_MS)
      connect()
    }, reconnectDelay)
  }

  function flushOutbox(): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    while (outbox.length > 0) {
      const msg = outbox.shift()!
      safeSend(msg)
    }
  }

  function safeSend(message: BridgeOutboundMessage): void {
    try {
      ws?.send(JSON.stringify(message))
    } catch (err) {
      logger.warn?.(`[kaiwu-bridge] ws send failed: ${(err as Error).message}`)
    }
  }

  function startHeartbeat(): void {
    stopHeartbeat()
    heartbeatTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        // WebSocket ping frame 无法从浏览器 API 层面主动发送，用空对象代替
        safeSend({ type: "custom", ts: Date.now(), payload: { channel: "heartbeat", data: 0 } })
      }
    }, HEARTBEAT_MS)
  }

  function stopHeartbeat(): void {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  return {
    start(): void {
      stopped = false
      connect()
    },
    stop(reason?: string): void {
      stopped = true
      stopHeartbeat()
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      try {
        ws?.close(1000, reason ?? "plugin-stop")
      } catch {
        // ignore
      }
      ws = null
    },
    send(message: BridgeOutboundMessage): void {
      if (ws?.readyState === WebSocket.OPEN) {
        safeSend(message)
      } else {
        outbox.push(message)
      }
    },
    isConnected(): boolean {
      return ws?.readyState === WebSocket.OPEN
    },
  }
}
