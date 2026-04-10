import type { DeeplinkBridge, DeepLinkPayload } from "./types"

import { ipcRenderer } from "electron"
import { deeplinkChannels } from "./channels"

export const deeplinkBridge: DeeplinkBridge = {
  onReceived(listener) {
    const handler = (_event: unknown, payload: DeepLinkPayload) => listener(payload)
    ipcRenderer.on(deeplinkChannels.event.received, handler)
    return () => ipcRenderer.off(deeplinkChannels.event.received, handler)
  },
}
