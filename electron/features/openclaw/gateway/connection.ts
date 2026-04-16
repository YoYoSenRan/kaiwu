import type { GatewaySocket } from "./socket"
import type { GatewayCaller } from "./caller"
import type { EventEmitter } from "./emitter"
import type { GatewayConnectParams, GatewayMode, GatewayState } from "../types"
import type { OpenclawEmitter } from "../push"

import { scope } from "../../../infra/logger"
import { createGatewayManager } from "./manager"
import { readGatewayAuth } from "./config"
import { detectGateway } from "./detection"

const gatewayLog = scope("openclaw:gateway")

/** 扫描模式轮询间隔（ms）。10 秒平衡响应速度和资源消耗。 */
const POLL_INTERVAL_MS = 10_000

/**
 * Gateway 连接运行时。
 *
 * 封装 socket / caller / emitter 三件套 + 状态机 + 扫描轮询，对外暴露
 * start / stop / getState / requireCaller / requireEmitter。
 *
 * 每个 OpenclawService 实例持有一个 GatewayRuntime 实例。以前这里是模块级
 * `let socket / caller / state` 等全局变量，改类化之后状态显式封装。
 */
export class GatewayRuntime {
  private socket: GatewaySocket | null = null
  private caller: GatewayCaller | null = null
  private emitter: EventEmitter | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private isConnecting = false
  private state: GatewayState = { status: "idle", mode: null, url: null, error: null, pingLatencyMs: null, nextRetryAt: null }

  constructor(private readonly push: OpenclawEmitter) {}

  /** 获取当前 gateway 连接状态。 */
  getState(): GatewayState {
    return this.state
  }

  /** 获取已连接的 RPC 调用器。未连接时抛错。 */
  requireCaller(): GatewayCaller {
    if (!this.caller) throw new Error("gateway 未连接")
    return this.caller
  }

  /** 获取已连接的事件路由器。未连接时抛错。 */
  requireEmitter(): EventEmitter {
    if (!this.emitter) throw new Error("gateway 未连接")
    return this.emitter
  }

  /**
   * 启动 gateway 连接。
   * 无 params 走扫描模式（探测本机 + 轮询），有 params 走手动模式（直连，失败不轮询）。
   */
  async start(params?: GatewayConnectParams): Promise<void> {
    if (this.isConnecting || this.pollTimer || this.socket?.isConnected()) return
    this.isConnecting = true

    try {
      const mode: GatewayMode = params ? "manual" : "scan"
      this.setState({ status: "detecting", mode, url: params?.url ?? null, error: null })

      if (params) {
        await this.connectDirect(params)
      } else {
        await this.connectByDetection()
        // 扫描模式 pollTimer 只守"gateway 进程尚未启动"的等待期：
        // 一旦 socket 创建，WS 层的断线重连完全交给 GatewaySocket 内部的 scheduleReconnect
        this.pollTimer = setInterval(() => {
          if (this.socket) return
          void this.connectByDetection()
        }, POLL_INTERVAL_MS)
      }
    } finally {
      this.isConnecting = false
    }
  }

  /** 停止 gateway 连接与轮询，状态回到 idle。 */
  stop(): void {
    this.clear()
    this.setState({ status: "idle", mode: null, url: null, error: null, pingLatencyMs: null, nextRetryAt: null })
  }

  // ---------- 内部 ----------

  private setState(patch: Partial<GatewayState>): void {
    this.state = { ...this.state, ...patch }
    this.push.gatewayState(this.state)
  }

  /** 只清 socket 三件套，保留 pollTimer（transient error 时 scan 模式继续重试）。 */
  private clearSocket(): void {
    this.isConnecting = false
    this.socket?.disconnect()
    this.socket = null
    this.caller = null
    this.emitter = null
  }

  /** 完全清理：socket + pollTimer。auth error 或用户主动 stop 时使用。 */
  private clear(): void {
    this.clearSocket()
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  /** 手动模式：直连指定地址，失败直接报错不轮询。 */
  private async connectDirect(params: GatewayConnectParams): Promise<void> {
    const { url } = params
    gatewayLog.info(`手动连接至 ${url}`)
    this.setState({ status: "connecting", url })

    try {
      this.createGateway(url)
      await this.socket!.connect(url, { token: params.token, password: params.password })
    } catch (err) {
      gatewayLog.warn(`手动连接失败: ${(err as Error).message}`)
      this.setState({ status: "error", error: `连接失败: ${(err as Error).message}` })
      this.clearSocket()
    }
  }

  /** 扫描模式：探测本机 gateway + 读配置文件 auth + 连接。 */
  private async connectByDetection(): Promise<void> {
    const gateway = await detectGateway()
    if (!gateway.running || !gateway.gatewayPort) {
      gatewayLog.debug("服务未运行，稍后重试")
      // 回落到 idle，避免 "detecting" 状态长期挂着
      if (this.state.status === "detecting") this.setState({ status: "idle" })
      return
    }

    const auth = await readGatewayAuth(gateway.configDir)
    const url = `ws://127.0.0.1:${gateway.gatewayPort}/ws`

    gatewayLog.info(`扫描连接至 ${url}`)
    this.setState({ status: "connecting", url })

    try {
      this.createGateway(url)
      await this.socket!.connect(url, { token: auth.token ?? undefined, password: auth.password ?? undefined })
    } catch (err) {
      gatewayLog.warn(`扫描连接失败: ${(err as Error).message}`)
      this.setState({ status: "error", url, error: `连接失败: ${(err as Error).message}` })
      this.clearSocket()
    }
  }

  /** 创建 socket + caller + emitter 三件套并注册通用监听。 */
  private createGateway(url: string): void {
    const manager = createGatewayManager({
      onConnected: () => {
        if (this.state.status !== "connected") {
          this.setState({ status: "connected", url, error: null, nextRetryAt: null })
        }
      },
      onDisconnected: () => {
        if (this.state.status === "connected") {
          this.setState({ status: "disconnected", pingLatencyMs: null })
        }
      },
      onMetrics: (metrics) => {
        const patch = Object.fromEntries(Object.entries(metrics).filter(([, v]) => v !== undefined))
        if (Object.keys(patch).length > 0) this.setState(patch)
      },
      onAuthError: (message) => {
        this.clear()
        gatewayLog.warn(`认证失败: ${message}`)
        this.setState({ status: "auth-error", error: `认证失败: ${message}`, pingLatencyMs: null, nextRetryAt: null })
      },
      onError: (message) => {
        // transient error：只清 socket，保留 pollTimer 继续重试
        this.clearSocket()
        gatewayLog.warn(`连接错误: ${message}`)
        this.setState({ status: "error", error: `连接错误: ${message}`, pingLatencyMs: null, nextRetryAt: null })
      },
      onEvent: (frame) => this.push.gatewayEvent(frame),
    })

    this.socket = manager.socket
    this.caller = manager.caller
    this.emitter = manager.emitter
  }
}
