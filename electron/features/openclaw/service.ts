import { join } from "node:path"
import { promises as fs } from "node:fs"
import log from "../../core/logger"
import { detectGateway } from "./core/gateway"
import { createGatewayConnection, type GatewayConnection } from "./gateway/connect"

const POLL_INTERVAL_MS = 10_000

export type GatewayStatus = "idle" | "detecting" | "connecting" | "connected" | "disconnected" | "auth-error" | "error"

export interface GatewayState {
  status: GatewayStatus
  url: string | null
  error: string | null
}

let connection: GatewayConnection | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let state: GatewayState = { status: "idle", url: null, error: null }
let stateListener: ((s: GatewayState) => void) | null = null

function setState(next: GatewayState): void {
  state = next
  stateListener?.(state)
}

/** 获取当前 gateway 连接状态。 */
export function getGatewayState(): GatewayState {
  return state
}

/**
 * 启动 gateway 自动连接。
 * 检测 gateway 在线后立即连接；未在线时定期轮询等待上线。
 * @param onStateChange 状态变化回调
 */
export async function startGatewayConnection(onStateChange?: (s: GatewayState) => void): Promise<void> {
  if (pollTimer || connection?.isConnected()) return
  stateListener = onStateChange ?? null
  setState({ status: "detecting", url: null, error: null })

  await tryConnect()

  pollTimer = setInterval(() => {
    if (connection?.isConnected()) return
    connection?.disconnect()
    connection = null
    void tryConnect()
  }, POLL_INTERVAL_MS)
}

/** 停止 gateway 连接与轮询。 */
export function stopGatewayConnection(): void {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  connection?.disconnect()
  connection = null
  setState({ status: "idle", url: null, error: null })
  stateListener = null
}

async function tryConnect(): Promise<void> {
  const gateway = await detectGateway()
  if (!gateway.running || !gateway.gatewayPort) {
    log.debug("[gateway] not running, will retry later")
    return
  }

  const auth = await readGatewayAuth(gateway.configDir)
  const url = `ws://127.0.0.1:${gateway.gatewayPort}/ws`

  log.info(`[gateway] connecting to ${url}`)
  setState({ status: "connecting", url, error: null })

  try {
    const conn = await createGatewayConnection(url, { token: auth.token ?? undefined, password: auth.password ?? undefined })
    connection = conn

    conn.client.onConnectionChange((connected) => {
      if (connected && state.status !== "connected") {
        setState({ status: "connected", url, error: null })
      } else if (!connected && state.status === "connected") {
        setState({ status: "disconnected", url, error: null })
      }
    })

    conn.client.onConnectError((err) => {
      const msg = err.message.toLowerCase()
      const isAuth =
        msg.includes("auth") || msg.includes("token") || msg.includes("password") || msg.includes("mismatch") || msg.includes("unauthorized") || msg.includes("forbidden")

      if (isAuth) {
        log.warn(`[gateway] auth failed: ${err.message}`)
        setState({ status: "auth-error", url, error: `认证失败: ${err.message}，请检查 ~/.openclaw/openclaw.json 中的 gateway.auth 配置` })
      } else {
        log.warn(`[gateway] connect error: ${err.message}`)
        setState({ status: "error", url, error: `连接错误: ${err.message}` })
      }
      stopGatewayConnection()
    })
  } catch (err) {
    log.warn(`[gateway] initial connection failed: ${(err as Error).message}`)
    setState({ status: "error", url, error: `连接失败: ${(err as Error).message}` })
    connection = null
  }
}

export interface GatewayAuth {
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
