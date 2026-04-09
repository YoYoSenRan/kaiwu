import { ipcRenderer } from "electron"
import { openclawChannels } from "./channels"
import type { BridgeEvent, InvokeArgs, MonitorEvent, OpenClawBridge, OpenClawStatus } from "./types"

/** 订阅一个 ipcRenderer 事件，返回取消订阅函数。 */
function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const handler = (_event: unknown, payload: T) => listener(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.off(channel, handler)
}

export const openclawBridge: OpenClawBridge = {
  detect: () => ipcRenderer.invoke(openclawChannels.detect),
  checkCompat: () => ipcRenderer.invoke(openclawChannels.checkCompat),
  installBridge: () => ipcRenderer.invoke(openclawChannels.installBridge),
  uninstallBridge: () => ipcRenderer.invoke(openclawChannels.uninstallBridge),
  restart: () => ipcRenderer.invoke(openclawChannels.restart),
  invoke: (args: InvokeArgs) => ipcRenderer.invoke(openclawChannels.invoke, args),

  onBridgeEvent: (listener) => subscribe<BridgeEvent>(openclawChannels.bridgeEvent, listener),
  onStatusChanged: (listener) => subscribe<OpenClawStatus>(openclawChannels.statusChanged, listener),
  onMonitorEvent: (listener) => subscribe<MonitorEvent>(openclawChannels.monitorEvent, listener),
}
