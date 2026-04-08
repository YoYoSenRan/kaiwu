import { ipcRenderer } from "electron"
import { updaterChannels } from "./channels"
import type { ProgressInfo } from "electron-updater"
import type { UpdateAvailability, UpdaterBridge, UpdaterError } from "./types"

/**
 * 订阅一个 ipcRenderer 事件，返回取消订阅函数。
 * 通用辅助函数，消除 4 个 on* 方法的重复代码。
 */
function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const handler = (_event: unknown, payload: T) => listener(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.off(channel, handler)
}

export const updaterBridge: UpdaterBridge = {
  check: () => ipcRenderer.invoke(updaterChannels.check),
  startDownload: () => ipcRenderer.invoke(updaterChannels.startDownload),
  quitAndInstall: () => ipcRenderer.invoke(updaterChannels.quitAndInstall),

  onCanAvailable: (listener) => subscribe<UpdateAvailability>(updaterChannels.canAvailable, listener),
  onDownloadProgress: (listener) => subscribe<ProgressInfo>(updaterChannels.downloadProgress, listener),
  onDownloaded: (listener) => subscribe<void>(updaterChannels.downloaded, () => listener()),
  onError: (listener) => subscribe<UpdaterError>(updaterChannels.error, listener),
}
