import { ipcMain } from "electron"
import { updaterChannels } from "./channels"
import { bindAutoUpdaterEvents, checkForUpdate, quitAndInstall, startDownload } from "./service"

/**
 * 注册 updater feature 的所有 IPC handler 并初始化 autoUpdater 事件。
 * 必须在 app.whenReady() 之后调用。
 */
export function setupUpdater(): void {
  bindAutoUpdaterEvents()

  ipcMain.handle(updaterChannels.action.check, () => checkForUpdate())
  ipcMain.handle(updaterChannels.action.download, () => startDownload())
  ipcMain.handle(updaterChannels.action.install, () => quitAndInstall())
}
