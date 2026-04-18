import { createBridge } from "../../app/bridge"
import type { Capabilities } from "./contracts/install"
import type { ConnectParams, ConnectionState } from "./contracts/connection"
import type { EventFrame } from "./gateway/contract"
import type { InvokeArgs, InvokeResult, MonitorEvent, PluginEvent } from "./contracts/plugin"
import type { CompatibilityResult, OpenClawStatus } from "./contracts/status"
import type {
  AgentsCreateParams,
  AgentsCreateResult,
  AgentsDeleteParams,
  AgentsDeleteResult,
  AgentsListResult,
  AgentsUpdateParams,
  AgentsUpdateResult,
  ChatAbortParams,
  ChatSendParams,
  ModelsListResult,
  SessionCreateParams,
  SessionDeleteParams,
  SessionListParams,
  SessionPatchParams,
} from "./contracts/rpc"

/** renderer ↔ main 的 openclaw feature 桥接接口。7 个能力域对齐主进程 7 个 Controller。 */
export interface OpenClawBridge {
  /** 安装扫描 / 兼容性 / 重启 / 能力矩阵。`on.change` 订阅完整的 OpenClawStatus 变化。 */
  status: {
    detect: () => Promise<OpenClawStatus>
    capabilities: () => Promise<Capabilities>
    check: () => Promise<CompatibilityResult>
    restart: () => Promise<void>
    on: {
      change: (listener: (status: OpenClawStatus) => void) => () => void
    }
  }
  /** kaiwu bridge 插件:同步/卸载/远程 invoke + 插件事件订阅。 */
  plugin: {
    install: () => Promise<OpenClawStatus>
    uninstall: () => Promise<OpenClawStatus>
    invoke: (args: InvokeArgs) => Promise<InvokeResult>
    on: {
      event: (listener: (event: PluginEvent) => void) => () => void
      monitor: (listener: (event: MonitorEvent) => void) => () => void
    }
  }
  /** Gateway WebSocket 连接管理:状态查询/连接控制/事件帧订阅。 */
  gateway: {
    getState: () => Promise<ConnectionState>
    connect: (params?: ConnectParams) => Promise<void>
    disconnect: () => Promise<void>
    on: {
      status: (listener: (state: ConnectionState) => void) => () => void
      event: (listener: (frame: EventFrame) => void) => () => void
    }
  }
  /** 聊天 RPC (chat.send / chat.abort)。流式 chunk 走 gateway.on.event 订阅。 */
  chat: {
    send: (params: ChatSendParams) => Promise<unknown>
    abort: (params: ChatAbortParams) => Promise<unknown>
  }
  /** 会话管理 RPC,方法名 1:1 映射 gateway 的 sessions.*。 */
  sessions: {
    list: (params?: SessionListParams) => Promise<unknown>
    create: (params: SessionCreateParams) => Promise<unknown>
    patch: (params: SessionPatchParams) => Promise<unknown>
    delete: (params: SessionDeleteParams) => Promise<unknown>
  }
  /** Agent 管理 RPC,方法名 1:1 映射 gateway 的 agents.*。 */
  agents: {
    list: () => Promise<AgentsListResult>
    create: (params: AgentsCreateParams) => Promise<AgentsCreateResult>
    update: (params: AgentsUpdateParams) => Promise<AgentsUpdateResult>
    delete: (params: AgentsDeleteParams) => Promise<AgentsDeleteResult>
  }
  /** 可用模型清单(按 provider 分组)。 */
  models: {
    list: () => Promise<ModelsListResult>
  }
}

/** 纯 RPC 域(无 emit 事件)的 Events 占位类型。让所有 createBridge 调用形态一致。 */
type NoEvents = Record<string, never>

/** status 域可订阅事件。 */
type StatusEvents = { change: OpenClawStatus }

/** plugin 域可订阅事件。 */
type PluginEvents = { event: PluginEvent; monitor: MonitorEvent }

/** gateway 域可订阅事件。 */
type GatewayEvents = { status: ConnectionState; event: EventFrame }

const chatBridge = createBridge<NoEvents>("openclaw.chat")
const modelsBridge = createBridge<NoEvents>("openclaw.models")
const agentsBridge = createBridge<NoEvents>("openclaw.agents")
const sessionsBridge = createBridge<NoEvents>("openclaw.sessions")
const pluginBridge = createBridge<PluginEvents>("openclaw.plugin")
const gatewayBridge = createBridge<GatewayEvents>("openclaw.gateway")
const statusBridge = createBridge<StatusEvents>("openclaw.status")

/** 全局唯一的 openclaw 桥接实例,通过 contextBridge 暴露到 window.electron.openclaw。 */
export const openclaw: OpenClawBridge = {
  status: {
    detect: () => statusBridge.invoke("detect"),
    capabilities: () => statusBridge.invoke("capabilities"),
    check: () => statusBridge.invoke("check"),
    restart: () => statusBridge.invoke("restart"),
    on: {
      change: (l) => statusBridge.on("change", l),
    },
  },
  plugin: {
    install: () => pluginBridge.invoke("install"),
    uninstall: () => pluginBridge.invoke("uninstall"),
    invoke: (args) => pluginBridge.invoke("invoke", args),
    on: {
      event: (l) => pluginBridge.on("event", l),
      monitor: (l) => pluginBridge.on("monitor", l),
    },
  },
  gateway: {
    getState: () => gatewayBridge.invoke("state"),
    connect: (params) => gatewayBridge.invoke("connect", params),
    disconnect: () => gatewayBridge.invoke("disconnect"),
    on: {
      status: (l) => gatewayBridge.on("status", l),
      event: (l) => gatewayBridge.on("event", l),
    },
  },
  chat: {
    send: (params) => chatBridge.invoke("send", params),
    abort: (params) => chatBridge.invoke("abort", params),
  },
  sessions: {
    list: (params) => sessionsBridge.invoke("list", params),
    create: (params) => sessionsBridge.invoke("create", params),
    patch: (params) => sessionsBridge.invoke("patch", params),
    delete: (params) => sessionsBridge.invoke("delete", params),
  },
  agents: {
    list: () => agentsBridge.invoke("list"),
    create: (params) => agentsBridge.invoke("create", params),
    update: (params) => agentsBridge.invoke("update", params),
    delete: (params) => agentsBridge.invoke("delete", params),
  },
  models: {
    list: () => modelsBridge.invoke("list"),
  },
}
