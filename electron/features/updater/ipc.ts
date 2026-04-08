import { ipcMain } from "electron"
import { updaterChannels } from "./channels"
import { bindAutoUpdaterEvents, checkForUpdate, quitAndInstall, startDownload } from "./service"

/**
 * 注册 updater feature 的所有 IPC handler 并初始化 autoUpdater 事件。
 * 必须在 app.whenReady() 之后调用。
 */
export function setupUpdater(): void {
  bindAutoUpdaterEvents()

  ipcMain.handle(updaterChannels.check, () => checkForUpdate())
  ipcMain.handle(updaterChannels.startDownload, () => startDownload())
  ipcMain.handle(updaterChannels.quitAndInstall, () => quitAndInstall())
}
