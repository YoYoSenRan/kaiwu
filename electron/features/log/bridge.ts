import { ipcRenderer } from "electron"
import { logChannels } from "./channels"
import type { LogBridge } from "./types"

export const logBridge: LogBridge = {
  info: (...args) => ipcRenderer.send(logChannels.write, "info", ...args),
  warn: (...args) => ipcRenderer.send(logChannels.write, "warn", ...args),
  error: (...args) => ipcRenderer.send(logChannels.write, "error", ...args),
  debug: (...args) => ipcRenderer.send(logChannels.write, "debug", ...args),
}
