import { openclawChannels } from "../channels"
import { getMainWindow } from "../../../core/window"
import type { BridgeEvent, OpenClawStatus } from "../types"

/**
 * 向 renderer 推送插件桥接事件。
 * @param event 插件通过 bridge WS 发来的事件
 */
export function pushBridgeEvent(event: BridgeEvent): void {
  const win = getMainWindow()
  if (!win) return
  win.webContents.send(openclawChannels.bridgeEvent, event)
}

/**
 * 向 renderer 推送 OpenClaw 状态变化。
 * @param status 最新探测到的状态快照
 */
export function pushStatusChanged(status: OpenClawStatus): void {
  const win = getMainWindow()
  if (!win) return
  win.webContents.send(openclawChannels.statusChanged, status)
}
