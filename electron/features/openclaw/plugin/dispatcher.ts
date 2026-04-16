/**
 * 从 PluginServer 的事件流中识别并提取 monitor 事件。
 *
 * 插件侧通过 custom 通道（channel="monitor"）发送 MonitorEvent,
 * 本模块把它从通用的 PluginEvent 流里摘出来,
 * 调用端(service.ts)拿到 MonitorEvent 后走独立 IPC 通道推送给 renderer,
 * renderer 不用从混杂的 pluginEvent 里自己过滤。
 */

import type { MonitorEvent, PluginEvent } from "./types"

/** monitor 事件在 custom 通道中的 channel 标识,与插件侧 MONITOR_CHANNEL 一致。 */
const MONITOR_CHANNEL = "monitor"

/**
 * 如果 PluginEvent 是 monitor 事件,提取并返回 MonitorEvent;否则返回 null。
 *
 * 合并了原来的 isMonitorEvent + dispatchMonitorEvent 两步为一次调用:
 *   `const monitor = toMonitorEvent(event)`
 *   `if (monitor) emit("plugin:monitor", monitor) else emit("plugin:event", event)`
 */
export function toMonitorEvent(event: PluginEvent): MonitorEvent | null {
  switch (event.type) {
    case "custom": {
      const payload = event.payload as { channel?: string; data?: MonitorEvent } | undefined
      if (payload?.channel !== MONITOR_CHANNEL) return null
      return payload.data ?? null
    }
    case "lifecycle":
      return null
  }
}
