/**
 * 从 BridgeServer 的事件流中过滤出 monitor 事件，推送到 renderer。
 *
 * 插件侧通过 custom 通道（channel="monitor"）发送 MonitorEvent，
 * 本模块将其从通用的 BridgeEvent 流中摘出来，走独立 IPC 通道推送，
 * renderer 不用从混杂的 bridgeEvent 里自己过滤。
 */

import { getMainWindow } from "../../../core/window"
import { openclawChannels } from "../channels"
import type { BridgeEvent } from "../types"

/** monitor 事件在 custom 通道中的 channel 标识，与插件侧 MONITOR_CHANNEL 一致。 */
const MONITOR_CHANNEL = "monitor"

/**
 * 判断 BridgeEvent 是否为 monitor 事件。
 * @param event 来自 BridgeServer 的事件
 */
export function isMonitorEvent(event: BridgeEvent): boolean {
  if (event.type !== "custom") return false
  const payload = event.payload as { channel?: string } | undefined
  return payload?.channel === MONITOR_CHANNEL
}

/**
 * 从 monitor BridgeEvent 中提取 MonitorEvent data 并推给 renderer。
 * @param event 已通过 isMonitorEvent 校验的 BridgeEvent
 */
export function dispatchMonitorEvent(event: BridgeEvent): void {
  const win = getMainWindow()
  if (!win) return
  const payload = event.payload as { data?: unknown }
  win.webContents.send(openclawChannels.bridge.monitor, payload.data)
}
