import type { LogBridge } from "./types"

import { ipcRenderer } from "electron"
import { logChannels } from "./channels"

export const logBridge: LogBridge = {
  info: (...args) => ipcRenderer.send(logChannels.output.write, "info", ...args),
  warn: (...args) => ipcRenderer.send(logChannels.output.write, "warn", ...args),
  error: (...args) => ipcRenderer.send(logChannels.output.write, "error", ...args),
  debug: (...args) => ipcRenderer.send(logChannels.output.write, "debug", ...args),
}
