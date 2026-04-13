import type { GatewayState, OpenClawStatus, PluginEvent } from "../types"

import { scope } from "../../core/logger"
import { getMainWindow } from "../../core/window"
import { openclawChannels } from "../channels"

const pushLog = scope("openclaw:push")

/**
 * 向 renderer 推送插件事件。
 * @param event 插件通过 WS 发来的事件
 */
export function pushPluginEvent(event: PluginEvent): void {
  const win = getMainWindow()
  if (!win) return
  win.webContents.send(openclawChannels.plugin.event, event)
}

/**
 * 向 renderer 推送 OpenClaw 状态变化。
 * @param status 最新探测到的状态快照
 */
export function pushStatusChanged(status: OpenClawStatus): void {
  const win = getMainWindow()
  if (!win) return
  win.webContents.send(openclawChannels.plugin.status, status)
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
  pushLog.debug(`gateway 事件: ${(frame as { event?: string }).event}`)
  const win = getMainWindow()
  if (!win) return
  win.webContents.send(openclawChannels.gateway.event, frame)
}
