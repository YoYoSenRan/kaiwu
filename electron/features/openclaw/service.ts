import type { GatewayConnectParams, GatewayMode, GatewayState } from "./types"
import type { ChatAbortParams, ChatSendParams, SessionCreateParams, SessionDeleteParams, SessionListParams, SessionPatchParams } from "./gateway/contract"

import { promises as fs } from "node:fs"
import { join } from "node:path"
import log from "../../core/logger"
import { detectGateway } from "./core/gateway"
import { pushGatewayEvent, pushGatewayState } from "./core/push"
import { GatewayClient } from "./gateway/client"

const POLL_INTERVAL_MS = 10_000

let client: GatewayClient | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let state: GatewayState = { status: "idle", mode: null, url: null, error: null }

function setState(patch: Partial<GatewayState>): void {
  state = { ...state, ...patch }
  pushGatewayState(state)
}

// ---------- 连接管理（对外 API）----------

/** 获取当前 gateway 连接状态。 */
export function getGatewayState(): GatewayState {
  return state
}

/**
 * 启动 gateway 连接。
 * 无 params 走扫描模式（探测本机 + 轮询），有 params 走手动模式（直连，失败不轮询）。
 * @param params 手动连接参数，省略时走扫描模式
 */
export async function startGatewayConnection(params?: GatewayConnectParams): Promise<void> {
  if (pollTimer || client?.isConnected()) return

  const mode: GatewayMode = params ? "manual" : "scan"
  setState({ status: "detecting", mode, url: params?.url ?? null, error: null })

  if (params) {
    await connectDirect(params)
  } else {
    await connectByDetection()
    // 扫描模式：未连上时轮询等待上线
    pollTimer = setInterval(() => {
      if (client?.isConnected()) return
      client?.disconnect()
      client = null
      void connectByDetection()
    }, POLL_INTERVAL_MS)
  }
}

/** 停止 gateway 连接与轮询。 */
export function stopGatewayConnection(): void {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  client?.disconnect()
  client = null
  setState({ status: "idle", mode: null, url: null, error: null })
}

// ---------- chat / session 透传 ----------

/** 获取已连接的 client，未连接时抛错。 */
function requireClient(): GatewayClient {
  if (!client) throw new Error("gateway 未连接")
  return client
}

/**
 * 发送聊天消息。
 * @param params 聊天参数
 */
export function chatSend(params: ChatSendParams): Promise<unknown> {
  return requireClient().chatSend(params)
}

/**
 * 中止聊天。
 * @param params 中止参数
 */
export function chatAbort(params: ChatAbortParams): Promise<unknown> {
  return requireClient().chatAbort(params)
}

/**
 * 创建会话。
 * @param params 会话参数
 */
export function sessionCreate(params: SessionCreateParams): Promise<unknown> {
  return requireClient().sessionCreate(params)
}

/**
 * 列出会话。
 * @param params 查询参数
 */
export function sessionList(params?: SessionListParams): Promise<unknown> {
  return requireClient().sessionList(params)
}

/**
 * 更新会话。
 * @param params 补丁参数
 */
export function sessionPatch(params: SessionPatchParams): Promise<unknown> {
  return requireClient().sessionPatch(params)
}

/**
 * 删除会话。
 * @param params 删除参数
 */
export function sessionDelete(params: SessionDeleteParams): Promise<unknown> {
  return requireClient().sessionDelete(params)
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

// ---------- auth 读取 ----------

interface GatewayAuth {
  mode: string | null
  token: string | null
  password: string | null
}

function resolveSecretInput(value: string | { env?: string } | null | undefined): string | null {
  if (typeof value === "string") return value
  if (typeof value === "object" && value !== null) {
    const envRef = (value as { env?: string }).env
    if (envRef) return process.env[envRef] ?? null
  }
  return null
}

async function readGatewayAuth(configDir: string | null): Promise<GatewayAuth> {
  if (!configDir) return { mode: null, token: null, password: null }
  const configPath = join(configDir, "openclaw.json")
  try {
    const raw = await fs.readFile(configPath, "utf-8")
    const config = JSON.parse(raw) as {
      gateway?: {
        auth?: {
          mode?: string
          token?: string | { env?: string }
          password?: string | { env?: string }
        }
      }
    }
    const auth = config.gateway?.auth
    return {
      mode: auth?.mode ?? null,
      token: resolveSecretInput(auth?.token),
      password: resolveSecretInput(auth?.password),
    }
  } catch {
    return { mode: null, token: null, password: null }
  }
}
