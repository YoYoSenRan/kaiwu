import type { GatewayState } from "./service"
import type { InvokeArgs } from "./types"

import { safeHandle } from "../../core/ipc"
import { getMainWindow } from "../../core/window"
import { openclawChannels } from "./channels"
import { checkCompat, detect, installBridge, invokePlugin, restartOpenclaw, startBridge, uninstallBridge } from "./core/lifecycle"
import { getGatewayState, startGatewayConnection, stopGatewayConnection } from "./service"

function pushGatewayState(state: GatewayState): void {
  const win = getMainWindow()
  if (!win) return
  win.webContents.send(openclawChannels.gateway.status, state)
}

/**
 * 注册 openclaw feature 的所有 IPC handler，并启动本地 bridge server。
 * 必须在 app.whenReady() 之后、创建主窗口之前调用，以便事件能推到 renderer。
 */
export function setupOpenclaw(): void {
  // 立即启动 plugin bridge server，handler 内部依赖其 token/port
  // 不 await：避免阻塞 whenReady 主流程，内部失败仅记日志
  void startBridge()

  safeHandle(openclawChannels.lifecycle.detect, () => detect())
  safeHandle(openclawChannels.lifecycle.check, () => checkCompat())
  safeHandle(openclawChannels.plugin.install, () => installBridge())
  safeHandle(openclawChannels.plugin.uninstall, () => uninstallBridge())
  safeHandle(openclawChannels.lifecycle.restart, () => restartOpenclaw())
  safeHandle(openclawChannels.bridge.invoke, (args) => invokePlugin(args as InvokeArgs))
  safeHandle(openclawChannels.gateway.state, () => getGatewayState())
  safeHandle(openclawChannels.gateway.connect, () => startGatewayConnection(pushGatewayState))
  safeHandle(openclawChannels.gateway.disconnect, () => stopGatewayConnection())
}
