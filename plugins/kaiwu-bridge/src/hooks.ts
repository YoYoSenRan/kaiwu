import type { GatewayStartEvent, GatewayStopEvent, OpenClawPluginApi } from "../api.js"
import type { BridgeClient } from "./bridge-client.js"
import { makeEvent, type BridgeOutboundMessage } from "./protocol.js"

export interface HookContext {
  api: OpenClawPluginApi
  bridgeClient: BridgeClient
  onGatewayStart: (port: number) => void
  onGatewayStop: (reason: string | undefined) => void
}

/**
 * 注册插件生命周期钩子。
 * - gateway_start：OpenClaw gateway 起来后，启动 bridge client 连接 kaiwu，
 *   记录 host 端口供协议使用，并推送 plugin.ready 事件
 * - gateway_stop：断开 bridge client，推送 plugin.shutdown 事件
 */
export function registerBridgeHooks(ctx: HookContext): void {
  const { api, bridgeClient } = ctx

  api.registerHook("gateway_start", async (event) => {
    const ev = event as GatewayStartEvent
    ctx.onGatewayStart(ev.port)
    bridgeClient.start()
    bridgeClient.send(
      makeEvent<Extract<BridgeOutboundMessage, { type: "plugin.ready" }>>("plugin.ready", {
        pluginVersion: api.version ?? "0.0.0",
        hostGatewayPort: ev.port,
        protocolVersion: 1,
      }),
    )
    api.logger.info?.(`[kaiwu-bridge] gateway_start received, host port=${ev.port}`)
  })

  api.registerHook("gateway_stop", async (event) => {
    const ev = event as GatewayStopEvent
    const reason = ev.reason
    ctx.onGatewayStop(reason)
    bridgeClient.send(
      makeEvent<Extract<BridgeOutboundMessage, { type: "plugin.shutdown" }>>("plugin.shutdown", {
        reason,
      }),
    )
    // 给 ws 一点时间把最后一条消息 flush 出去再关
    setTimeout(() => bridgeClient.stop(reason), 100)
    api.logger.info?.(`[kaiwu-bridge] gateway_stop received, reason=${reason ?? "unknown"}`)
  })
}
