import { ipcRenderer } from "electron"
import { chromeChannels } from "./channels"
import type { ChromeBridge } from "./types"

export const chromeBridge: ChromeBridge = {
  minimize: () => ipcRenderer.invoke(chromeChannels.window.minimize),
  maximize: () => ipcRenderer.invoke(chromeChannels.window.maximize),
  close: () => ipcRenderer.invoke(chromeChannels.window.close),
  state: () => ipcRenderer.invoke(chromeChannels.window.state),
  open: (targetPath) => ipcRenderer.invoke(chromeChannels.open, targetPath),

  onChange(listener) {
    const handler = (_event: unknown, isMaximized: boolean) => listener(isMaximized)
    ipcRenderer.on(chromeChannels.window.change, handler)
    return () => ipcRenderer.off(chromeChannels.window.change, handler)
  },
}
