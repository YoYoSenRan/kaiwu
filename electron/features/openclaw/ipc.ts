import { ipcMain } from "electron"
import type { InvokeArgs } from "./types"
import { getMainWindow } from "../../core/window"
import { openclawChannels } from "./channels"
import { checkCompat, detect, installBridge, invokePlugin, restartOpenclaw, startBridge, uninstallBridge } from "./core/lifecycle"
import { getGatewayState, startGatewayConnection, stopGatewayConnection, type GatewayState } from "./service"

function pushGatewayState(state: GatewayState): void {
  const win = getMainWindow()
  if (!win) return
  win.webContents.send(openclawChannels.gateway.status, state)
}

/**
 * 注册 openclaw feature 的所有 IPC handler，并启动本地 bridge server 与 gateway WS 连接。
 * 必须在 app.whenReady() 之后、创建主窗口之前调用，以便事件能推到 renderer。
 */
export function setupOpenclaw(): void {
  // 立即启动 plugin bridge server，handler 内部依赖其 token/port
  // 不 await：避免阻塞 whenReady 主流程，内部失败仅记日志
  void startBridge()

  // 启动 gateway WS 自动连接，状态变化推给 renderer
  void startGatewayConnection(pushGatewayState)

  ipcMain.handle(openclawChannels.lifecycle.detect, () => detect())
  ipcMain.handle(openclawChannels.lifecycle.check, () => checkCompat())
  ipcMain.handle(openclawChannels.plugin.install, () => installBridge())
  ipcMain.handle(openclawChannels.plugin.uninstall, () => uninstallBridge())
  ipcMain.handle(openclawChannels.lifecycle.restart, () => restartOpenclaw())
  ipcMain.handle(openclawChannels.bridge.invoke, (_event, args: InvokeArgs) => invokePlugin(args))
  ipcMain.handle(openclawChannels.gateway.state, () => getGatewayState())
  ipcMain.handle(openclawChannels.gateway.connect, () => startGatewayConnection(pushGatewayState))
  ipcMain.handle(openclawChannels.gateway.disconnect, () => {
    stopGatewayConnection()
  })
}
