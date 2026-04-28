/**
 * 插件运行时注册入口。
 *
 * 目录结构 = 宿主 SDK 方法 / 通信通道:
 *   - tools/   : api.registerTool()         给 agent LLM 用
 *   - hooks/   : api.on(event, handler)     订阅宿主运行时
 *   - routes/  : registerHttpRoute + action dispatcher,控制端 RPC 入口
 *   - bridge/  : WS 到控制端(transport + 事件 schema)
 *   - core/    : handshake / http framework(无业务)
 *
 * 启动流程:
 *   1. 解析 bridge 配置(handshake 或 pluginConfig)
 *   2. 创建 WS client(bridge/transport)
 *   3. 注册 HTTP 路由 — 所有 action 走统一前缀分发器
 *   4. 依次装配 tools / hooks / routes
 *   5. gateway_start 时连 WS,gateway_stop 时断开
 */

import type { OpenClawPluginApi } from "../api.js"

import { createBridgeClient } from "./bridge/transport.js"
import { resolveBridgeConfig } from "./core/handshake.js"
import { createKaiwuRouteHandler } from "./core/http.js"
import { setupHooks } from "./hooks/setup.js"
import { setupRoutes } from "./routes/setup.js"
import { setupTools } from "./tools/setup.js"

const HTTP_ROUTE_PREFIX = "/kaiwu/"

export async function registerBridgePlugin(api: OpenClawPluginApi): Promise<void> {
  const bridge = createBridgeClient({
    logger: api.logger,
    configFactory: () =>
      resolveBridgeConfig({
        rootDir: api.rootDir,
        pluginConfig: api.pluginConfig,
        logger: api.logger,
      }),
  })

  // 一个前缀路由接住所有 action,内部 dispatch
  api.registerHttpRoute({
    path: HTTP_ROUTE_PREFIX,
    auth: "plugin",
    match: "prefix",
    replaceExisting: true,
    handler: createKaiwuRouteHandler(),
  })

  // WS 生命周期跟宿主 gateway
  api.on("gateway_start", async () => {
    bridge.start()
  })
  api.on("gateway_stop", async () => {
    bridge.stop("gateway_stop")
  })

  // 装配三层(顺序无关:tools 注册不依赖 hooks/routes)
  setupTools(api, bridge)
  setupHooks(api, bridge)
  setupRoutes()
}
