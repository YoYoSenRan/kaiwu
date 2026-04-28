/**
 * 向 renderer 推送领域事件的类型化 helper。
 *
 * 当前阶段直接写 webContents,后续步骤会改为"订阅 runtime.bus,fan out 到 IPC channel"的声明式路由。
 * 对调用方而言接口稳定 —— publisher 只负责"推",谁发、谁订阅由上层决定。
 */

import { resolveIpcEmitTarget } from "../../../framework"
import type { ConnectionState } from "../contracts/connection"
import type { EventFrame } from "../gateway/contract"
import type { MonitorEvent, PluginEvent } from "../contracts/plugin"
import type { OpenClawStatus } from "../contracts/status"
import { channels } from "./channels"

const send = (channel: string, data: unknown): void => {
  resolveIpcEmitTarget()?.send(channel, data)
}

/** 推送 gateway 连接状态。 */
export const publishGatewayStatus = (state: ConnectionState): void => send(channels.gateway.status, state)

/** 推送 gateway 事件帧(业务事件,如 chat.chunk)。 */
export const publishGatewayEvent = (frame: EventFrame): void => send(channels.gateway.event, frame)

/** 推送 kaiwu 插件 custom/lifecycle 事件。 */
export const publishPluginEvent = (event: PluginEvent): void => send(channels.plugin.event, event)

/** 推送插件监控采样(llm_input / tool_call 等)。 */
export const publishPluginMonitor = (event: MonitorEvent): void => send(channels.plugin.monitor, event)

/** 推送 OpenClaw 整体状态变化。 */
export const publishStatus = (status: OpenClawStatus): void => send(channels.status.change, status)
