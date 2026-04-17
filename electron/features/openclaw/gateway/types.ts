/**
 * gateway 域本地类型:扫描结果 + 连接状态机 + wire 帧映射。
 *
 * 命名对齐原则:文件路径(`gateway/`)已经是 scope,类型名不再重复 Gateway 前缀。
 * 例如 `ScanResult` 而非 `GatewayScanResult` —— 在 `import type { ScanResult } from "./gateway/types"`
 * 的调用点上下文是明确的。
 */

/** 本机扫描 OpenClaw 的结果(不含插件安装状态,后者由 plugin/types.ts 的 OpenClawStatus 扩展)。 */
export interface ScanResult {
  installed: boolean
  running: boolean
  version: string | null
  configDir: string | null
  /** <configDir>/extensions */
  extensionsDir: string | null
  gatewayPort: number | null
  detectedBy: "lock" | "port" | "path" | "cli" | null
  deployment: DeploymentKind
  capabilities: Capabilities
}

/** WS 连接状态枚举。 */
export type ConnectionStatus = "idle" | "detecting" | "connecting" | "connected" | "disconnected" | "auth-error" | "error"

/** 连接模式:scan=本机扫描轮询, manual=手动指定 URL 单次连接。 */
export type ConnectionMode = "scan" | "manual"

/** 连接状态快照。 */
export interface ConnectionState {
  status: ConnectionStatus
  mode: ConnectionMode | null
  url: string | null
  error: string | null
  /** 最近一次 ping/pong 往返延迟(ms)。null 表示尚未完成首次心跳测量。 */
  pingLatencyMs: number | null
  /** 下次重连的绝对时间戳(ms since epoch)。null 表示当前没有排期的重连。 */
  nextRetryAt: number | null
}

/** 手动连接参数。无参数时走本机扫描模式。 */
export interface ConnectParams {
  url: string
  token?: string
  password?: string
}

/** OpenClaw 部署形态推断结果。 */
export type DeploymentKind = "local" | "docker" | "remote" | "unknown"

/** 当前部署形态下 kaiwu 各功能的可用性。 */
export interface Capabilities {
  /** gateway RPC 与事件推送始终可用(如果连不上 gateway 则整体不可用)。 */
  gatewayRpc: boolean
  /** 本地插件桥接 WS(需要插件与 kaiwu 网络可达)。 */
  pluginBridge: boolean
  /** 插件文件同步到 extensions 目录(需要共享文件系统)。 */
  pluginSync: boolean
  /** 通过 gateway HTTP 调用插件路由(local/docker 需端口映射)。 */
  pluginInvoke: boolean
  /** 直接读写 agent workspace 本地文件(需要共享文件系统)。 */
  agentWorkspaceLocal: boolean
  /** 能否调用 openclaw CLI 重启 gateway 进程。 */
  canRestart: boolean
}

/** 从 wire contract 转发,避免 gateway-域外消费者要感知 contract.ts 存在。 */
export type { EventFrame } from "./contract"
