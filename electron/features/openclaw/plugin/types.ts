/**
 * plugin 域本地类型:本机侦测状态、兼容性、invoke 入出参、插件事件。
 */

/** OpenClaw 本机侦测状态。 */
export interface OpenClawStatus {
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
  /** 插件是否已同步到 extensionsDir。 */
  bridgeInstalled: boolean
  /** 已安装插件的版本(读 目标路径 package.json)。 */
  installedBridgeVersion: string | null
}

/** 兼容性检查结果。 */
export interface CompatResult {
  compatible: boolean
  /** host 版本。 */
  hostVersion: string | null
  /** 插件声明的 pluginApi 范围。 */
  pluginApiRange: string
  /** 不兼容时的人类可读原因。 */
  reason?: string
  /** 已知会影响第三方插件的 breaking change 列表。 */
  knownBreaking: { version: string; change: string }[]
}

/** 调用 /kaiwu/invoke 的参数。 */
export interface InvokeArgs {
  action: string
  params?: unknown
}

/** /kaiwu/invoke 的响应。 */
export interface InvokeResult {
  ok: boolean
  result?: unknown
  error?: { message: string; code?: string }
}

/** 来自 kaiwu 插件的事件(镜像 plugins/kaiwu/src/protocol.ts)。 */
export interface PluginEvent {
  type: string
  id?: string
  ts: number
  payload: unknown
}

/** 插件采集的运行时监控事件,镜像 plugins/kaiwu/src/monitor/contract.ts 的 MonitorEvent。 */
export interface MonitorEvent {
  hookName: string
  event: unknown
  ctx: { sessionKey?: string; agentId?: string; runId?: string }
  ts: number
}
