/**
 * 本机 OpenClaw 安装信息契约。
 *
 * discovery 层扫描的结构化结果,跨 gateway / bridge / status 共享。
 */

/** 本机扫描 OpenClaw 的结果(不含 kaiwu 插件安装状态,后者由 contracts/status.ts 的 OpenClawStatus 扩展)。 */
export interface ScanResult {
  installed: boolean
  running: boolean
  version: string | null
  configDir: string | null
  /** `<configDir>/extensions` */
  extensionsDir: string | null
  gatewayPort: number | null
  detectedBy: "lock" | "port" | "path" | "cli" | null
  deployment: DeploymentKind
  capabilities: Capabilities
}

/** OpenClaw 部署形态推断结果。 */
export type DeploymentKind = "local" | "docker" | "remote" | "unknown"

/** 当前部署形态下 kaiwu 各功能的可用性。 */
export interface Capabilities {
  /** gateway RPC 与事件推送始终可用(gateway 本身连不上则整体不可用)。 */
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
