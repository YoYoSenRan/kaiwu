/**
 * Openclaw feature 顶层类型聚合。
 *
 * 只放跨域类型:
 *   1. 跨域事件表 `OpenclawEvents`
 *   2. 类型化 emit 回调 `EmitEvent`
 *   3. renderer 侧桥接接口 `OpenClawBridge`
 *
 * 域本地类型各自在 plugin/types.ts 和 gateway/types.ts,消费者直接 import 子域文件,不经此处 barrel。
 */

import type { OpenClawStatus, CompatibilityResult, InvokeArgs, InvokeResult, PluginEvent, MonitorEvent } from "./plugin/types"
import type { GatewayState, GatewayConnectParams, GatewayEventFrame, OpenClawCapabilities } from "./gateway/types"
import type { ModelsListResult } from "./model/contract"
import type { AgentsListResult, AgentsCreateParams, AgentsCreateResult, AgentsDeleteParams, AgentsDeleteResult, AgentsUpdateParams, AgentsUpdateResult } from "./agent/contract"

/** Openclaw controller 可推送的事件。 */
export interface OpenclawEvents {
  "plugin:event": PluginEvent
  "plugin:monitor": MonitorEvent
  "plugin:status": OpenClawStatus
  "gateway:status": GatewayState
  "gateway:event": GatewayEventFrame
}

/**
 * 类型化的事件发送回调。
 *
 * OpenclawService 把 `this.emit` 包成此类型,注入给 gateway / plugin host 等协作者。
 * 替代原来的 `OpenclawEmitter` 薄包装层 —— 去一层抽象,channel 名直接写在调用点。
 */
export type EmitEvent = <K extends keyof OpenclawEvents & string>(channel: K, payload: OpenclawEvents[K]) => void

/** renderer ↔ main 的 openclaw feature 桥接接口。7 个能力域对齐 channels.ts。 */
export interface OpenClawBridge {
  /** 生命周期:探测安装 / 兼容性检查 / 重启 gateway。 */
  lifecycle: {
    detect: () => Promise<OpenClawStatus>
    check: () => Promise<CompatibilityResult>
    restart: () => Promise<{ ok: boolean; error?: string }>
    capabilities: () => Promise<OpenClawCapabilities>
    on: {
      /** OpenClaw 安装 / 运行状态变化。 */
      status: (listener: (status: OpenClawStatus) => void) => () => void
    }
  }

  /** 插件:kaiwu bridge plugin 的同步 / 卸载 / 远程调用。 */
  plugin: {
    install: () => Promise<OpenClawStatus>
    uninstall: () => Promise<OpenClawStatus>
    invoke: (args: InvokeArgs) => Promise<InvokeResult>
    on: {
      /** 来自插件的桥接事件。 */
      event: (listener: (event: PluginEvent) => void) => () => void
      /** 运行时监控事件(llm_input/output、tool_call 等)。 */
      monitor: (listener: (event: MonitorEvent) => void) => () => void
    }
  }

  /** gateway 连接管理。 */
  gateway: {
    getState: () => Promise<GatewayState>
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
    update: (params: { key: string; label?: string | null; model?: string | null }) => Promise<unknown>
    delete: (params: { key: string }) => Promise<unknown>
  }

  /** Agent 管理(agents.* RPC 的类型化包装)。 */
  agents: {
    list: () => Promise<AgentsListResult>
    create: (params: AgentsCreateParams) => Promise<AgentsCreateResult>
    update: (params: AgentsUpdateParams) => Promise<AgentsUpdateResult>
    delete: (params: AgentsDeleteParams) => Promise<AgentsDeleteResult>
  }

  /** 可用模型清单。 */
  models: {
    list: () => Promise<ModelsListResult>
  }
}
