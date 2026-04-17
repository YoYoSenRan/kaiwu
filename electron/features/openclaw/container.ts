/**
 * openclaw feature 模块级共享运行时。
 *
 * Controller 共享 3 件东西:
 *   1. `scanner` —— GatewayScanner 单例,所有扫描走这个实例共享 TTL 缓存
 *   2. `gateway` —— 由 GatewayService 初始化,其他 RPC service 通过 getGateway() 读取
 *   3. `bridgeServer` —— 由 PluginService 初始化,install/call 从这里取凭证
 *
 * 另外导出类型化 emit helpers。Controller 自身的 `this.emit` 只能发本前缀的 channel,
 * 跨 Controller 推送(如 PluginService.install 要推 status:change)通过 helper 绕开 `this`。
 */

import { resolveIpcEmitTarget } from "../../framework"
import { GatewayScanner } from "./gateway/scan"
import type { GatewayClient } from "./gateway/client"
import type { BridgeServer } from "./plugin/server"
import type { EventFrame, ConnectionState } from "./gateway/types"
import type { MonitorEvent, OpenClawStatus, PluginEvent } from "./plugin/types"

/** 全局唯一 gateway 扫描器。无副作用 ctor,模块加载时直接构造。 */
export const scanner = new GatewayScanner()

let gateway: GatewayClient | null = null

/**
 * 由 GatewayService.onReady 调用,把 controller 内部的 GatewayClient 实例挂到共享运行时。
 * 仅此一次;重复调用会静默覆盖(设计上只有一个 GatewayService 实例)。
 */
export function setGateway(g: GatewayClient): void {
  gateway = g
}

/**
 * 取当前 GatewayClient。未 set 过(GatewayService 未 onReady)抛错,让注册顺序错误立刻暴露。
 * @throws Error 当 GatewayService 尚未完成 onReady
 */
export function getGateway(): GatewayClient {
  if (!gateway) throw new Error("openclaw gateway 未初始化")
  return gateway
}

let bridgeServer: BridgeServer | null = null

/** 由 PluginService 在 WS server 启动成功/关闭时调用。传 null 表示 server 已 stop。 */
export function setBridgeServer(s: BridgeServer | null): void {
  bridgeServer = s
}

/** 当前 BridgeServer。未启动时返回 null——调用端据此判断是否可以 call 插件。 */
export function getBridgeServer(): BridgeServer | null {
  return bridgeServer
}

/** 内部:走 resolveIpcEmitTarget 把 payload 发到 renderer。target 不存在则 drop。 */
const send = (channel: string, payload: unknown): void => {
  resolveIpcEmitTarget()?.send(channel, payload)
}

/** 推送 gateway 连接状态到 `openclaw.gateway:status` channel。 */
export const emitGatewayStatus = (s: ConnectionState): void => send("openclaw.gateway:status", s)

/** 推送 gateway event 帧到 `openclaw.gateway:event` channel。 */
export const emitGatewayEvent = (f: EventFrame): void => send("openclaw.gateway:event", f)

/** 推送通用插件事件到 `openclaw.plugin:event` channel。 */
export const emitPluginEvent = (e: PluginEvent): void => send("openclaw.plugin:event", e)

/** 推送监控事件(llm_input/tool_call 等)到 `openclaw.plugin:monitor` channel。 */
export const emitPluginMonitor = (m: MonitorEvent): void => send("openclaw.plugin:monitor", m)

/**
 * 推送 openclaw 整体状态到 `openclaw.status:change` channel。
 * 跨 Controller 使用:StatusService.detect 和 PluginService.install/uninstall 都调用此 helper。
 */
export const emitStatus = (s: OpenClawStatus): void => send("openclaw.status:change", s)
