/**
 * 从 PluginServer 的事件流中过滤出 monitor 事件，推送到 renderer。
 *
 * 插件侧通过 custom 通道（channel="monitor"）发送 MonitorEvent，
 * 本模块将其从通用的 PluginEvent 流中摘出来，走独立 IPC 通道推送，
 * renderer 不用从混杂的 pluginEvent 里自己过滤。
 */

import type { MonitorEvent, PluginEvent } from "../types"
import type { OpenclawEmitter } from "../push"

/** monitor 事件在 custom 通道中的 channel 标识，与插件侧 MONITOR_CHANNEL 一致。 */
const MONITOR_CHANNEL = "monitor"

/**
 * 判断 PluginEvent 是否为 monitor 事件。
 * @param event 来自 PluginServer 的事件
 */
export function isMonitorEvent(event: PluginEvent): boolean {
  if (event.type !== "custom") return false
  const payload = event.payload as { channel?: string } | undefined
  return payload?.channel === MONITOR_CHANNEL
}

/**
 * 从 monitor PluginEvent 中提取 MonitorEvent data 并推给 renderer。
 * @param event 已通过 isMonitorEvent 校验的 PluginEvent
 * @param push 由 OpenclawService 注入的事件推送门面
 */
export function dispatchMonitorEvent(event: PluginEvent, push: OpenclawEmitter): void {
  // data 的运行时结构由插件侧 MonitorEvent 契约保证，这里是跨进程信任边界
  const payload = event.payload as { data?: MonitorEvent }
  if (payload.data) push.pluginMonitor(payload.data)
}
