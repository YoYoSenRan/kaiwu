import { ipcMain } from "electron"
import type { InvokeArgs } from "./types"
import { openclawChannels } from "./channels"
import { checkCompat, detect, installBridge, invokePlugin, restartOpenclaw, startBridge, uninstallBridge } from "./core/lifecycle"

/**
 * 注册 openclaw feature 的所有 IPC handler，并启动本地 bridge server。
 * 必须在 app.whenReady() 之后、创建主窗口之前调用，以便插件的事件能推到 renderer。
 */
export function setupOpenclaw(): void {
  // 立即启动 bridge server，handler 内部依赖其 token/port
  // 不 await：避免阻塞 whenReady 主流程，内部失败仅记日志
  void startBridge()

  ipcMain.handle(openclawChannels.detect, () => detect())
  ipcMain.handle(openclawChannels.checkCompat, () => checkCompat())
  ipcMain.handle(openclawChannels.installBridge, () => installBridge())
  ipcMain.handle(openclawChannels.uninstallBridge, () => uninstallBridge())
  ipcMain.handle(openclawChannels.restart, () => restartOpenclaw())
  ipcMain.handle(openclawChannels.invoke, (_event, args: InvokeArgs) => invokePlugin(args))
}
