import type { BridgeEvent, GatewayState, InvokeArgs, MonitorEvent, OpenClawBridge, OpenClawStatus } from "./types"

import { ipcRenderer } from "electron"
import { openclawChannels } from "./channels"

/** 订阅一个 ipcRenderer 事件，返回取消订阅函数。 */
function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const handler = (_event: unknown, payload: T) => listener(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.off(channel, handler)
}

export const openclawBridge: OpenClawBridge = {
  detect: () => ipcRenderer.invoke(openclawChannels.lifecycle.detect),
  check: () => ipcRenderer.invoke(openclawChannels.lifecycle.check),
  install: () => ipcRenderer.invoke(openclawChannels.plugin.install),
  uninstall: () => ipcRenderer.invoke(openclawChannels.plugin.uninstall),
  restart: () => ipcRenderer.invoke(openclawChannels.lifecycle.restart),
  invoke: (args: InvokeArgs) => ipcRenderer.invoke(openclawChannels.bridge.invoke, args),

  onEvent: (listener) => subscribe<BridgeEvent>(openclawChannels.bridge.event, listener),
  onStatus: (listener) => subscribe<OpenClawStatus>(openclawChannels.bridge.status, listener),
  onMonitor: (listener) => subscribe<MonitorEvent>(openclawChannels.bridge.monitor, listener),

  state: () => ipcRenderer.invoke(openclawChannels.gateway.state),
  connect: () => ipcRenderer.invoke(openclawChannels.gateway.connect),
  disconnect: () => ipcRenderer.invoke(openclawChannels.gateway.disconnect),
  onGatewayStatus: (listener) => subscribe<GatewayState>(openclawChannels.gateway.status, listener),
}
