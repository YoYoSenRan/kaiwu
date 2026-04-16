import { createBridge } from "../../app/bridge"
import type { GatewayConnectParams } from "./gateway/types"
import type { InvokeArgs } from "./plugin/types"
import type { OpenClawBridge, OpenclawEvents } from "./types"

const bridge = createBridge<OpenclawEvents>("openclaw")

export const openclaw: OpenClawBridge = {
  lifecycle: {
    detect: () => bridge.invoke("lifecycle:detect"),
    check: () => bridge.invoke("lifecycle:check"),
    restart: () => bridge.invoke("lifecycle:restart"),
    capabilities: () => bridge.invoke("lifecycle:capabilities"),
    on: {
      status: (listener) => bridge.on("plugin:status", listener),
    },
  },

  plugin: {
    install: () => bridge.invoke("plugin:install"),
    uninstall: () => bridge.invoke("plugin:uninstall"),
    invoke: (args: InvokeArgs) => bridge.invoke("plugin:invoke", args),
    on: {
      event: (listener) => bridge.on("plugin:event", listener),
      monitor: (listener) => bridge.on("plugin:monitor", listener),
    },
  },

  gateway: {
    getState: () => bridge.invoke("gateway:state"),
    connect: (params?: GatewayConnectParams) => bridge.invoke("gateway:connect", params),
    disconnect: () => bridge.invoke("gateway:disconnect"),
    on: {
      status: (listener) => bridge.on("gateway:status", listener),
      event: (listener) => bridge.on("gateway:event", listener),
    },
  },

  chat: {
    send: (params) => bridge.invoke("chat:send", params),
    abort: (params) => bridge.invoke("chat:abort", params),
  },

  session: {
    create: (params) => bridge.invoke("session:create", params),
    list: (params) => bridge.invoke("session:list", params),
    update: (params) => bridge.invoke("session:patch", params),
    delete: (params) => bridge.invoke("session:delete", params),
  },

  agents: {
    list: () => bridge.invoke("agents:list"),
    create: (params) => bridge.invoke("agents:create", params),
    update: (params) => bridge.invoke("agents:update", params),
    delete: (params) => bridge.invoke("agents:delete", params),
  },

  models: {
    list: () => bridge.invoke("models:list"),
  },
}
