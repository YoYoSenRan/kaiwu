import { ipcRenderer } from "electron"
import { openclawChannels } from "./channels"
import type { GatewayConnectParams, GatewayEventFrame, GatewayState, InvokeArgs, MonitorEvent, OpenClawBridge, OpenClawStatus, PluginEvent } from "./types"

/** 订阅一个 ipcRenderer 事件，返回取消订阅函数。 */
function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const handler = (_event: unknown, payload: T) => listener(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.off(channel, handler)
}

export const openclawBridge: OpenClawBridge = {
  lifecycle: {
    detect: () => ipcRenderer.invoke(openclawChannels.lifecycle.detect),
    check: () => ipcRenderer.invoke(openclawChannels.lifecycle.check),
    restart: () => ipcRenderer.invoke(openclawChannels.lifecycle.restart),
    on: {
      status: (listener) => subscribe<OpenClawStatus>(openclawChannels.plugin.status, listener),
    },
  },

  plugin: {
    install: () => ipcRenderer.invoke(openclawChannels.plugin.install),
    uninstall: () => ipcRenderer.invoke(openclawChannels.plugin.uninstall),
    invoke: (args: InvokeArgs) => ipcRenderer.invoke(openclawChannels.plugin.invoke, args),
    on: {
      event: (listener) => subscribe<PluginEvent>(openclawChannels.plugin.event, listener),
      monitor: (listener) => subscribe<MonitorEvent>(openclawChannels.plugin.monitor, listener),
    },
  },

  gateway: {
    state: () => ipcRenderer.invoke(openclawChannels.gateway.state),
    connect: (params?: GatewayConnectParams) => ipcRenderer.invoke(openclawChannels.gateway.connect, params),
    disconnect: () => ipcRenderer.invoke(openclawChannels.gateway.disconnect),
    on: {
      status: (listener) => subscribe<GatewayState>(openclawChannels.gateway.status, listener),
      event: (listener) => subscribe<GatewayEventFrame>(openclawChannels.gateway.event, listener),
    },
  },

  chat: {
    send: (params) => ipcRenderer.invoke(openclawChannels.chat.send, params),
    abort: (params) => ipcRenderer.invoke(openclawChannels.chat.abort, params),
  },

  session: {
    create: (params) => ipcRenderer.invoke(openclawChannels.session.create, params),
    list: (params) => ipcRenderer.invoke(openclawChannels.session.list, params),
    patch: (params) => ipcRenderer.invoke(openclawChannels.session.patch, params),
    delete: (params) => ipcRenderer.invoke(openclawChannels.session.delete, params),
  },

  agents: {
    list: () => ipcRenderer.invoke(openclawChannels.agents.list),
    create: (params) => ipcRenderer.invoke(openclawChannels.agents.create, params),
    update: (params) => ipcRenderer.invoke(openclawChannels.agents.update, params),
    delete: (params) => ipcRenderer.invoke(openclawChannels.agents.delete, params),
  },

  models: {
    list: () => ipcRenderer.invoke(openclawChannels.models.list),
  },
}
