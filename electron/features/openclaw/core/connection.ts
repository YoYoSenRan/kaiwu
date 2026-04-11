import type { GatewayConnectParams, GatewayMode, GatewayState } from "../types"

import log from "../../../core/logger"
import { GatewayClient } from "../gateway/client"
import { readGatewayAuth } from "./config"
import { detectGateway } from "./gateway"
import { pushGatewayEvent, pushGatewayState } from "./push"

/** 扫描模式轮询间隔（ms）。10 秒平衡响应速度和资源消耗。 */
const POLL_INTERVAL_MS = 10_000

let client: GatewayClient | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let connecting = false
let state: GatewayState = { status: "idle", mode: null, url: null, error: null }

function setState(patch: Partial<GatewayState>): void {
  state = { ...state, ...patch }
  pushGatewayState(state)
}

/** 获取当前 gateway 连接状态。 */
export function getGatewayState(): GatewayState {
  return state
}

/**
 * 获取已连接的 GatewayClient 实例。
 * 未连接时抛错，调用方应在 safeHandle 内使用。
 */
export function requireClient(): GatewayClient {
  if (!client) throw new Error("gateway 未连接")
  return client
}

/**
 * 启动 gateway 连接。
 * 无 params 走扫描模式（探测本机 + 轮询），有 params 走手动模式（直连，失败不轮询）。
 * @param params 手动连接参数，省略时走扫描模式
 */
export async function startGatewayConnection(params?: GatewayConnectParams): Promise<void> {
  if (connecting || pollTimer || client?.isConnected()) return
  connecting = true

  try {
    const mode: GatewayMode = params ? "manual" : "scan"
    setState({ status: "detecting", mode, url: params?.url ?? null, error: null })

    if (params) {
      await connectDirect(params)
    } else {
      await connectByDetection()
      // 扫描模式 pollTimer 只守"gateway 进程尚未启动"的等待期：
      // 一旦 client 创建（无论当前连上没），WS 层的断线重连完全交给 GatewayClient.scheduleReconnect
      // 指数退避处理，避免和 client 自身重连机制互掐（见 principles.md#9）。
      pollTimer = setInterval(() => {
        if (client) return
        void connectByDetection()
      }, POLL_INTERVAL_MS)
    }
  } finally {
    connecting = false
  }
}

/** 停止 gateway 连接与轮询。 */
export function stopGatewayConnection(): void {
  connecting = false
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  client?.disconnect()
  client = null
  setState({ status: "idle", mode: null, url: null, error: null })
}

// ---------- 内部连接逻辑 ----------

/** 手动模式：直连指定地址，失败直接报错不轮询。 */
async function connectDirect(params: GatewayConnectParams): Promise<void> {
  const { url } = params
  log.info(`[gateway] manual connecting to ${url}`)
  setState({ status: "connecting", url })

  try {
    const c = createClient(url)
    await c.connect(url, { token: params.token, password: params.password })
    client = c
  } catch (err) {
    log.warn(`[gateway] manual connection failed: ${(err as Error).message}`)
    setState({ status: "error", error: `连接失败: ${(err as Error).message}` })
    client = null
  }
}

/** 扫描模式：探测本机 gateway + 读配置文件 auth + 连接。 */
async function connectByDetection(): Promise<void> {
  const gateway = await detectGateway()
  if (!gateway.running || !gateway.gatewayPort) {
    log.debug("[gateway] not running, will retry later")
    return
  }

  const auth = await readGatewayAuth(gateway.configDir)
  const url = `ws://127.0.0.1:${gateway.gatewayPort}/ws`

  log.info(`[gateway] scan connecting to ${url}`)
  setState({ status: "connecting", url })

  try {
    const c = createClient(url)
    await c.connect(url, { token: auth.token ?? undefined, password: auth.password ?? undefined })
    client = c
  } catch (err) {
    log.warn(`[gateway] scan connection failed: ${(err as Error).message}`)
    setState({ status: "error", url, error: `连接失败: ${(err as Error).message}` })
    client = null
  }
}

/** 创建 GatewayClient 并注册通用监听（连接状态、错误、事件桥接）。 */
function createClient(url: string): GatewayClient {
  const c = new GatewayClient()

  c.onConnectionChange((connected) => {
    if (connected && state.status !== "connected") {
      setState({ status: "connected", url, error: null })
    } else if (!connected && state.status === "connected") {
      setState({ status: "disconnected" })
    }
  })

  c.onConnectError((err) => {
    const msg = err.message.toLowerCase()
    const isAuth = msg.includes("auth") || msg.includes("token") || msg.includes("password") || msg.includes("mismatch") || msg.includes("unauthorized") || msg.includes("forbidden")

    if (isAuth) {
      log.warn(`[gateway] auth failed: ${err.message}`)
      setState({ status: "auth-error", error: `认证失败: ${err.message}` })
    } else {
      log.warn(`[gateway] connect error: ${err.message}`)
      setState({ status: "error", error: `连接错误: ${err.message}` })
    }
    stopGatewayConnection()
  })

  // 所有 gateway event 帧直接推给 renderer
  c.onEvent((frame) => pushGatewayEvent(frame))

  return c
}
