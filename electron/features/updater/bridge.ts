import type { UpdateAvailability, UpdaterBridge, UpdaterError } from "./types"
import type { ProgressInfo } from "electron-updater"

import { ipcRenderer } from "electron"
import { updaterChannels } from "./channels"

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
  check: () => ipcRenderer.invoke(updaterChannels.action.check),
  download: () => ipcRenderer.invoke(updaterChannels.action.download),
  install: () => ipcRenderer.invoke(updaterChannels.action.install),

  onAvailable: (listener) => subscribe<UpdateAvailability>(updaterChannels.event.available, listener),
  onProgress: (listener) => subscribe<ProgressInfo>(updaterChannels.event.progress, listener),
  onDone: (listener) => subscribe<void>(updaterChannels.event.done, () => listener()),
  onError: (listener) => subscribe<UpdaterError>(updaterChannels.event.error, listener),
}
