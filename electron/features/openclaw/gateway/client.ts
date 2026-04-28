import type { GatewaySocket } from "../transport/socket"
import type { GatewayCaller } from "../transport/caller"
import type { EventStream } from "../transport/stream"
import type { ConnectParams, ConnectionMode, ConnectionState } from "../contracts/connection"
import type { EventFrame } from "./contract"

import { scope } from "../../../infra/logger"
import { createGatewayManager } from "../transport/manager"
import { readGatewayAuth } from "../discovery/credentials"
import { scanner } from "../runtime"
import { Pipeline, type Middleware } from "../kernel/pipeline"
import { INITIAL_STATE, reduce, type GatewayAction } from "./state"

const gatewayLog = scope("openclaw:gateway")

/** 扫描模式轮询间隔(ms)。10 秒平衡响应速度和资源消耗。 */
const POLL_INTERVAL_MS = 10_000

/** GatewayClient 构造器依赖。用两个具名回调替代原来的通用 EmitEvent,意图更清晰。 */
export interface GatewayClientDeps {
  onStatus: (state: ConnectionState) => void
  onEvent: (frame: EventFrame) => void
  /** 连接成功后回调,用于上层注册 event key extractor 等业务配置。 */
  onStreamReady?: (stream: EventStream) => void
}

/**
 * Gateway 客户端。
 *
 * 封装 socket / caller / stream 三件套 + 状态机 + 扫描轮询,对外暴露
 * connect / disconnect / getState / call / getStream。
 * 状态转移逻辑在 ./state.ts,本类只编排。
 */
export class GatewayClient {
  private socket: GatewaySocket | null = null
  private caller: GatewayCaller | null = null
  private stream: EventStream | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private isConnecting = false
  private state: ConnectionState = INITIAL_STATE
  private readonly pipeline = new Pipeline()

  constructor(private readonly deps: GatewayClientDeps) {}

  /** 获取当前 gateway 连接状态。 */
  getState(): ConnectionState {
    return this.state
  }

  /** 追加 RPC 调用中间件(埋点/重试/鉴权刷新 等)。按注册顺序执行。 */
  use(middleware: Middleware): this {
    this.pipeline.use(middleware)
    return this
  }

  /** 发起 RPC 调用。未连接时直接抛错,让 IPC 层冒泡给 renderer,避免各调用点重复 guard。 */
  call<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.caller) throw new Error("gateway 未连接")
    const caller = this.caller
    return this.pipeline.run({ method, params }, () => caller.call<T>(method, params))
  }

  /** 获取已连接的事件路由器。未连接时返回 null。 */
  getStream(): EventStream | null {
    return this.stream
  }

  /**
   * 连接 gateway。
   * 无 params 走扫描模式(扫描本机 + 轮询),有 params 走手动模式(直连,失败不轮询)。
   */
  async connect(params?: ConnectParams): Promise<void> {
    if (this.isConnecting || this.pollTimer || this.socket?.isConnected()) return
    this.isConnecting = true

    try {
      const mode: ConnectionMode = params ? "manual" : "scan"
      this.dispatch({ type: "startDetect", mode, url: params?.url ?? null })

      if (params) {
        await this.connectManual(params)
      } else {
        await this.autoConnect()
        this.pollTimer = setInterval(() => {
          if (this.socket) return
          void this.autoConnect()
        }, POLL_INTERVAL_MS)
      }
    } finally {
      this.isConnecting = false
    }
  }

  /** 断开 gateway 连接并停止轮询,状态回到 idle。 */
  disconnect(): void {
    this.close()
    this.dispatch({ type: "reset" })
  }

  // ---------- 内部 ----------

  private dispatch(action: GatewayAction): void {
    const next = reduce(this.state, action)
    if (next !== this.state) {
      this.state = next
      this.deps.onStatus(this.state)
    }
  }

  /** 只拆 socket 三件套,保留 pollTimer(transient error 时 scan 模式继续重试)。 */
  private closeSocket(): void {
    this.isConnecting = false
    this.socket?.disconnect()
    this.socket = null
    this.caller = null
    this.stream = null
  }

  /** 完全清理:socket + pollTimer。auth error 或用户主动 disconnect 时使用。 */
  private close(): void {
    this.closeSocket()
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  /** 手动模式:直连指定地址,失败直接报错不轮询。 */
  private async connectManual(params: ConnectParams): Promise<void> {
    const { url } = params
    gatewayLog.info(`手动连接至 ${url}`)
    this.dispatch({ type: "startConnect", url })

    try {
      this.setupSocket()
      await this.socket!.connect(url, { token: params.token, password: params.password })
    } catch (err) {
      gatewayLog.warn(`手动连接失败: ${(err as Error).message}`)
      this.dispatch({ type: "error", message: `连接失败: ${(err as Error).message}` })
      this.closeSocket()
    }
  }

  /** 扫描模式:扫描本机 gateway + 读配置文件 auth + 连接。 */
  private async autoConnect(): Promise<void> {
    const gateway = await scanner.scan()
    if (!gateway.running || !gateway.gatewayPort) {
      gatewayLog.debug("服务未运行,稍后重试")
      if (this.state.status === "detecting") this.dispatch({ type: "reset" })
      return
    }

    const auth = await readGatewayAuth(gateway.configDir)
    const url = `ws://127.0.0.1:${gateway.gatewayPort}/ws`

    gatewayLog.info(`扫描连接至 ${url}`)
    this.dispatch({ type: "startConnect", url })

    try {
      this.setupSocket()
      await this.socket!.connect(url, { token: auth.token ?? undefined, password: auth.password ?? undefined })
    } catch (err) {
      gatewayLog.warn(`扫描连接失败: ${(err as Error).message}`)
      this.dispatch({ type: "error", message: `连接失败: ${(err as Error).message}` })
      this.closeSocket()
    }
  }

  /** 装配 socket + caller + stream 三件套并注册通用监听。 */
  private setupSocket(): void {
    const manager = createGatewayManager({
      onConnected: () => {
        if (this.state.status !== "connected") {
          this.dispatch({ type: "connected" })
        }
      },
      onDisconnected: () => {
        if (this.state.status === "connected") {
          this.dispatch({ type: "disconnected" })
        }
      },
      onReconnecting: () => {
        this.dispatch({ type: "reconnecting" })
      },
      onMetrics: (metrics) => {
        this.dispatch({ type: "metrics", ...metrics })
      },
      onAuthError: (message) => {
        this.close()
        gatewayLog.warn(`认证失败: ${message}`)
        this.dispatch({ type: "authError", message })
      },
      onError: (message) => {
        this.closeSocket()
        gatewayLog.warn(`连接错误: ${message}`)
        this.dispatch({ type: "error", message })
      },
      onEvent: (frame) => this.deps.onEvent(frame),
    })

    this.socket = manager.socket
    this.caller = manager.caller
    this.stream = manager.stream
    this.deps.onStreamReady?.(this.stream)
  }
}
