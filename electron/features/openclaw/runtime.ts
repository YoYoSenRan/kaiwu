/**
 * openclaw feature 模块级共享运行时。
 *
 * 装配 3 件长生命周期对象:
 *   1. `scanner` —— GatewayScanner 单例,模块加载即构造(无副作用 ctor),所有扫描走同一 TTL 缓存。
 *   2. `gateway` —— 由 GatewayService.onReady 通过 setGateway 挂入,其他 RPC service 通过 getGateway() 读。
 *   3. `bridgeServer` —— 由 PluginService 在本地 WS server 启停时通过 setBridgeServer 挂入。
 *
 * 为什么 set/get 而非构造注入:当前 Controller 由 IpcRegistry 负责实例化,改注入需动 framework。
 * 后续步骤会通过 kernel/registry 接管,届时本文件升级成 createRuntime() 一次装配。
 */

import { GatewayScanner } from "./discovery/scanner"
import type { GatewayClient } from "./gateway/client"
import type { BridgeServer } from "./bridge/server"

/** 全局唯一 gateway 扫描器。 */
export const scanner = new GatewayScanner()

let gateway: GatewayClient | null = null

/** GatewayService.onReady 调用一次,把 client 挂入运行时。 */
export function setGateway(g: GatewayClient): void {
  gateway = g
}

/**
 * 取当前 GatewayClient。未 set 过直接抛错,让注册顺序错误立刻暴露。
 * @throws Error 当 GatewayService 尚未完成 onReady
 */
export function getGateway(): GatewayClient {
  if (!gateway) throw new Error("openclaw gateway 未初始化")
  return gateway
}

let bridgeServer: BridgeServer | null = null

/** PluginService 在 WS server 启动成功/关闭时调用。传 null 表示 server 已 stop。 */
export function setBridgeServer(server: BridgeServer | null): void {
  bridgeServer = server
}

/** 当前 BridgeServer,未启动时返回 null —— 调用端据此判断是否可 call 插件。 */
export function getBridgeServer(): BridgeServer | null {
  return bridgeServer
}
