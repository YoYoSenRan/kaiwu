import type { GatewaySocket } from "../gateway/socket"
import type { GatewayCaller } from "../gateway/caller"
import type { EventEmitter } from "../gateway/emitter"
import type { GatewayConnectParams, GatewayMode, GatewayState } from "../types"

import { scope } from "../../core/logger"
import { createGatewayManager } from "../gateway/manager"
import { readGatewayAuth } from "./config"
import { detectGateway } from "./gateway"
import { pushGatewayEvent, pushGatewayState } from "../push"

const gatewayLog = scope("openclaw:gateway")

/** 扫描模式轮询间隔（ms）。10 秒平衡响应速度和资源消耗。 */
const POLL_INTERVAL_MS = 10_000

let socket: GatewaySocket | null = null
let caller: GatewayCaller | null = null
let emitter: EventEmitter | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let connecting = false
let state: GatewayState = { status: "idle", mode: null, url: null, error: null, pingLatencyMs: null, nextRetryAt: null }

function setState(patch: Partial<GatewayState>): void {
  state = { ...state, ...patch }
  pushGatewayState(state)
}

/** 获取当前 gateway 连接状态。 */
export function getGatewayState(): GatewayState {
  return state
}

/**
 * 获取已连接的 RPC 调用器。
 * 未连接时抛错，调用方应在 safeHandle 内使用。
 */
export function requireCaller(): GatewayCaller {
  if (!caller) throw new Error("gateway 未连接")
  return caller
}

/**
 * 获取已连接的事件路由器。
 * 未连接时抛错。
 */
export function requireEmitter(): EventEmitter {
  if (!emitter) throw new Error("gateway 未连接")
  return emitter
}

/**
 * 启动 gateway 连接。
 * 无 params 走扫描模式（探测本机 + 轮询），有 params 走手动模式（直连，失败不轮询）。
 * @param params 手动连接参数，省略时走扫描模式
 */
export async function startGatewayConnection(params?: GatewayConnectParams): Promise<void> {
  if (connecting || pollTimer || socket?.isConnected()) return
  connecting = true

  try {
    const mode: GatewayMode = params ? "manual" : "scan"
    setState({ status: "detecting", mode, url: params?.url ?? null, error: null })

    if (params) {
      await connectDirect(params)
    } else {
      await connectByDetection()
      // 扫描模式 pollTimer 只守"gateway 进程尚未启动"的等待期：
      // 一旦 socket 创建，WS 层的断线重连完全交给 GatewaySocket 内部的 scheduleReconnect
      pollTimer = setInterval(() => {
        if (socket) return
        void connectByDetection()
      }, POLL_INTERVAL_MS)
    }
  } finally {
    connecting = false
  }
}

/** 停止 gateway 连接与轮询，状态回到 idle。 */
export function stopGatewayConnection(): void {
  clearConnection()
  setState({ status: "idle", mode: null, url: null, error: null, pingLatencyMs: null, nextRetryAt: null })
}

/**
 * 清理 socket / caller / emitter / pollTimer / connecting 标记，但不动 state。
 * 供 onConnectError 等需要保留错误态的路径使用。
 */
function clearConnection(): void {
  connecting = false
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  socket?.disconnect()
  socket = null
  caller = null
  emitter = null
}

// ---------- 内部连接逻辑 ----------

/** 手动模式：直连指定地址，失败直接报错不轮询。 */
async function connectDirect(params: GatewayConnectParams): Promise<void> {
  const { url } = params
  gatewayLog.info(`手动连接至 ${url}`)
  setState({ status: "connecting", url })

  try {
    createGateway(url)
    await socket!.connect(url, { token: params.token, password: params.password })
  } catch (err) {
    gatewayLog.warn(`手动连接失败: ${(err as Error).message}`)
    setState({ status: "error", error: `连接失败: ${(err as Error).message}` })
    clearConnection()
  }
}

/** 扫描模式：探测本机 gateway + 读配置文件 auth + 连接。 */
async function connectByDetection(): Promise<void> {
  const gateway = await detectGateway()
  if (!gateway.running || !gateway.gatewayPort) {
    gatewayLog.debug("服务未运行，稍后重试")
    return
  }

  const auth = await readGatewayAuth(gateway.configDir)
  const url = `ws://127.0.0.1:${gateway.gatewayPort}/ws`

  gatewayLog.info(`扫描连接至 ${url}`)
  setState({ status: "connecting", url })

  try {
    createGateway(url)
    await socket!.connect(url, { token: auth.token ?? undefined, password: auth.password ?? undefined })
  } catch (err) {
    gatewayLog.warn(`扫描连接失败: ${(err as Error).message}`)
    setState({ status: "error", url, error: `连接失败: ${(err as Error).message}` })
    clearConnection()
  }
}

/** 创建 socket + caller + emitter 三件套并注册通用监听。 */
function createGateway(url: string): void {
  const manager = createGatewayManager({
    onConnected: () => {
      if (state.status !== "connected") {
        setState({ status: "connected", url, error: null, nextRetryAt: null })
      }
    },
    onDisconnected: () => {
      if (state.status === "connected") {
        setState({ status: "disconnected", pingLatencyMs: null })
      }
    },
    onMetrics: (metrics) => {
      const patch = Object.fromEntries(Object.entries(metrics).filter(([, v]) => v !== undefined))
      if (Object.keys(patch).length > 0) setState(patch)
    },
    onAuthError: (message) => {
      clearConnection()
      gatewayLog.warn(`认证失败: ${message}`)
      setState({ status: "auth-error", error: `认证失败: ${message}`, pingLatencyMs: null, nextRetryAt: null })
    },
    onError: (message) => {
      clearConnection()
      gatewayLog.warn(`连接错误: ${message}`)
      setState({ status: "error", error: `连接错误: ${message}`, pingLatencyMs: null, nextRetryAt: null })
    },
    onEvent: (frame) => pushGatewayEvent(frame),
  })

  socket = manager.socket
  caller = manager.caller
  emitter = manager.emitter
}
