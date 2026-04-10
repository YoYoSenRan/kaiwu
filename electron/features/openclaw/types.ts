/** OpenClaw 本机侦测状态。 */
export interface OpenClawStatus {
  /** 是否检测到 OpenClaw 安装（目录存在 / CLI 可用 / lock 文件 / 端口监听）。 */
  installed: boolean
  /** 是否正在运行（lock 文件有效 pid 或端口可连）。 */
  running: boolean
  /** host 版本号，拿不到时为 null。 */
  version: string | null
  /** OpenClaw 配置根目录（~/.openclaw 或 %APPDATA%\.openclaw）。 */
  configDir: string | null
  /** extensions 根目录，等于 <configDir>/extensions。 */
  extensionsDir: string | null
  /** gateway 监听端口，正在运行时非 null。 */
  gatewayPort: number | null
  /** 触发成功探测的层级。 */
  detectedBy: "lock" | "port" | "path" | "cli" | null
  /** 插件是否已同步到 extensionsDir。 */
  bridgeInstalled: boolean
  /** 已安装插件的版本（读 目标路径 package.json）。 */
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

/** gateway 连接状态枚举。 */
export type GatewayStatus = "idle" | "detecting" | "connecting" | "connected" | "disconnected" | "auth-error" | "error"

/** gateway 连接模式。 */
export type GatewayMode = "scan" | "manual"

/** gateway 连接状态快照。 */
export interface GatewayState {
  status: GatewayStatus
  mode: GatewayMode | null
  url: string | null
  error: string | null
}

/** 手动连接参数。无参数时走本机扫描模式。 */
export interface GatewayConnectParams {
  url: string
  token?: string
  password?: string
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

/** 来自 kaiwu 插件的桥接事件（镜像 plugins/kaiwu/src/protocol.ts）。 */
export interface BridgeEvent {
  type: string
  id?: string
  ts: number
  payload: unknown
}

/** 插件采集的运行时监控事件，镜像 plugins/kaiwu/src/monitor/contract.ts 的 MonitorEvent。 */
export interface MonitorEvent {
  hookName: string
  event: unknown
  ctx: { sessionKey?: string; agentId?: string; runId?: string }
  ts: number
}

/** gateway event 帧（镜像 gateway/contract.ts 的 EventFrame）。 */
export interface GatewayEventFrame {
  type: "event"
  event: string
  payload?: unknown
  seq?: number
}

/** renderer ↔ main 的 openclaw feature 桥接接口。 */
export interface OpenClawBridge {
  detect: () => Promise<OpenClawStatus>
  check: () => Promise<CompatResult>
  install: () => Promise<OpenClawStatus>
  uninstall: () => Promise<OpenClawStatus>
  restart: () => Promise<{ ok: boolean; error?: string }>
  invoke: (args: InvokeArgs) => Promise<InvokeResult>

  /** 事件订阅。 */
  on: {
    /** 来自插件的桥接事件。 */
    event: (listener: (event: BridgeEvent) => void) => () => void
    /** OpenClaw 状态变化。 */
    status: (listener: (status: OpenClawStatus) => void) => () => void
    /** 运行时监控事件（llm_input/output、tool_call 等）。 */
    monitor: (listener: (event: MonitorEvent) => void) => () => void
  }

  /** gateway 连接管理。 */
  gateway: {
    state: () => Promise<GatewayState>
    connect: (params?: GatewayConnectParams) => Promise<void>
    disconnect: () => Promise<void>
    on: {
      /** 连接状态变化。 */
      status: (listener: (state: GatewayState) => void) => () => void
      /** gateway event 帧推送。 */
      event: (listener: (frame: GatewayEventFrame) => void) => () => void
    }
  }

  /** 聊天。 */
  chat: {
    send: (params: { sessionKey: string; message: string; thinking?: string }) => Promise<unknown>
    abort: (params: { sessionKey: string; runId?: string }) => Promise<unknown>
  }

  /** 会话管理。 */
  session: {
    create: (params: { agentId?: string; label?: string; model?: string; key?: string }) => Promise<unknown>
    list: (params?: { limit?: number; agentId?: string; search?: string }) => Promise<unknown>
    patch: (params: { key: string; label?: string | null; model?: string | null }) => Promise<unknown>
    delete: (params: { key: string }) => Promise<unknown>
  }
}
