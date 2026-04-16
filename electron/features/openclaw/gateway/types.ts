/**
 * gateway 域本地类型:连接状态机、手动连接参数、event 帧。
 *
 * `GatewayStatus`(探测结果)和 `GatewayConnStatus`(WS 连接状态)是两个不同概念,不要混淆。
 */

/** gateway 本机探测结果:不包含 kaiwu 插件字段,由 plugin/types.OpenClawStatus 扩展。 */
export interface GatewayStatus {
  /** 是否检测到 OpenClaw 安装(目录存在 / CLI 可用 / lock 文件 / 端口监听)。 */
  installed: boolean
  /** 是否正在运行(lock 文件有效 pid 或端口可连)。 */
  running: boolean
  /** host 版本号,拿不到时为 null。 */
  version: string | null
  /** OpenClaw 配置根目录(~/.openclaw 或 %APPDATA%\.openclaw)。 */
  configDir: string | null
  /** extensions 根目录,等于 <configDir>/extensions。 */
  extensionsDir: string | null
  /** gateway 监听端口,正在运行时非 null。 */
  gatewayPort: number | null
  /** 触发成功探测的层级。 */
  detectedBy: "lock" | "port" | "path" | "cli" | null
  /** 推断出的部署形态。 */
  deployment: DeploymentKind
  /** 当前部署形态下的功能可用性。 */
  capabilities: OpenClawCapabilities
}

/** gateway WebSocket 连接状态枚举。 */
export type GatewayConnStatus = "idle" | "detecting" | "connecting" | "connected" | "disconnected" | "auth-error" | "error"

/** gateway 连接模式。 */
export type GatewayMode = "scan" | "manual"

/** gateway 连接状态快照。 */
export interface GatewayState {
  status: GatewayConnStatus
  mode: GatewayMode | null
  url: string | null
  error: string | null
  /** 最近一次 ping/pong 往返延迟(ms)。null 表示尚未完成首次心跳测量。 */
  pingLatencyMs: number | null
  /** 下次重连的绝对时间戳(ms since epoch)。null 表示当前没有排期的重连。 */
  nextRetryAt: number | null
}

/** 手动连接参数。无参数时走本机扫描模式。 */
export interface GatewayConnectParams {
  url: string
  token?: string
  password?: string
}

/** gateway event 帧(镜像 gateway/contract.ts 的 EventFrame)。 */
export interface GatewayEventFrame {
  type: "event"
  event: string
  payload?: unknown
  seq?: number
}

/** OpenClaw 部署形态推断结果。 */
export type DeploymentKind = "local" | "docker" | "remote" | "unknown"

/** 当前部署形态下 kaiwu 各功能的可用性。 */
export interface OpenClawCapabilities {
  /** gateway RPC 与事件推送始终可用（如果连不上 gateway 则整体不可用）。 */
  gatewayRpc: boolean
  /** 本地插件桥接 WS（需要插件与 kaiwu 网络可达）。 */
  pluginBridge: boolean
  /** 插件文件同步到 extensions 目录（需要共享文件系统）。 */
  pluginSync: boolean
  /** 通过 gateway HTTP 调用插件路由（local/docker 需端口映射）。 */
  pluginInvoke: boolean
  /** 直接读写 agent workspace 本地文件（需要共享文件系统）。 */
  agentWorkspaceLocal: boolean
  /** 能否调用 openclaw CLI 重启 gateway 进程。 */
  canRestart: boolean
}
