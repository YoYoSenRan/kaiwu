import { ipcRenderer } from "electron"
import { chromeChannels } from "./channels"
import type { ChromeBridge } from "./types"

export const chromeBridge: ChromeBridge = {
  minimize: () => ipcRenderer.invoke(chromeChannels.minimize),
  maximize: () => ipcRenderer.invoke(chromeChannels.maximize),
  close: () => ipcRenderer.invoke(chromeChannels.close),
  isMaximized: () => ipcRenderer.invoke(chromeChannels.isMaximized),
  openWin: (targetPath) => ipcRenderer.invoke(chromeChannels.openWin, targetPath),

  onMaximizedChange(listener) {
    const handler = (_event: unknown, isMaximized: boolean) => listener(isMaximized)
    ipcRenderer.on(chromeChannels.maximizedChanged, handler)
    return () => ipcRenderer.off(chromeChannels.maximizedChanged, handler)
  },
}
