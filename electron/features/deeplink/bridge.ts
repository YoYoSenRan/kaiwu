import { ipcRenderer } from "electron"
import { deeplinkChannels } from "./channels"
import type { DeeplinkBridge, DeepLinkPayload } from "./types"

export const deeplinkBridge: DeeplinkBridge = {
  onReceived(listener) {
    const handler = (_event: unknown, payload: DeepLinkPayload) => listener(payload)
    ipcRenderer.on(deeplinkChannels.received, handler)
    return () => ipcRenderer.off(deeplinkChannels.received, handler)
  },
}
