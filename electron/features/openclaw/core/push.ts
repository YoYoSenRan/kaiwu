import type { BridgeEvent, GatewayState, OpenClawStatus } from "../types"

import log from "../../../core/logger"
import { getMainWindow } from "../../../core/window"
import { openclawChannels } from "../channels"

/**
 * 向 renderer 推送插件桥接事件。
 * @param event 插件通过 bridge WS 发来的事件
 */
export function pushBridgeEvent(event: BridgeEvent): void {
  const win = getMainWindow()
  if (!win) return
  win.webContents.send(openclawChannels.bridge.event, event)
}

/**
 * 向 renderer 推送 OpenClaw 状态变化。
 * @param status 最新探测到的状态快照
 */
export function pushStatusChanged(status: OpenClawStatus): void {
  const win = getMainWindow()
  if (!win) return
  win.webContents.send(openclawChannels.bridge.status, status)
}

/**
 * 向 renderer 推送 gateway 连接状态变化。
 * @param state 最新连接状态快照
 */
export function pushGatewayState(state: GatewayState): void {
  const win = getMainWindow()
  if (!win) return
  win.webContents.send(openclawChannels.gateway.status, state)
}

/**
 * 向 renderer 推送 gateway event 帧。
 * @param frame gateway 推送的事件帧
 */
export function pushGatewayEvent(frame: unknown): void {
  log.debug(`[gateway] event: ${(frame as { event?: string }).event}`)
  const win = getMainWindow()
  if (!win) return
  win.webContents.send(openclawChannels.gateway.event, frame)
}
