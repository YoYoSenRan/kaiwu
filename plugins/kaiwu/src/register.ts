/**
 * kaiwu 插件的运行时注册入口。
 *
 * 装配模式：创建共享基础设施（transport + http），然后遍历各能力域的 setup 函数。
 * 新增能力域只需：1) 创建 src/<domain>/setup.ts  2) 在 DOMAINS 数组里加一行。
 */

import type { OpenClawPluginApi } from "../api.js"
import type { DomainSetup } from "./domain.js"

import { resolveBridgeConfig } from "./core/handshake.js"
import { createKaiwuRouteHandler, createDomainRegistrar } from "./core/http.js"
import { createBridgeClient } from "./core/transport.js"
import { setupContext } from "./context/setup.js"
import { setupMonitor } from "./monitor/setup.js"
import { setupChat } from "./chat/setup.js"

/** HTTP 路由前缀。 */
const HTTP_ROUTE_PREFIX = "/kaiwu/"

/**
 * 能力域注册清单。
 * 新增域只需在这里加一行 [域名, setup 函数]。
 * 域名会作为 action 前缀（如 "context" → "context.set"）。
 */
const DOMAINS: Array<[string, DomainSetup]> = [
  ["context", setupContext],
  ["monitor", setupMonitor],
  ["chat", setupChat],
]

/**
 * 插件启动入口。创建基础设施，遍历能力域 setup。
 * @param api OpenClaw 插件 API
 */
export async function registerBridgePlugin(api: OpenClawPluginApi): Promise<void> {
  // --- 基础设施 ---
  const bridgeClient = createBridgeClient({
    logger: api.logger,
    configFactory: () =>
      resolveBridgeConfig({
        rootDir: api.rootDir,
        pluginConfig: api.pluginConfig,
        logger: api.logger,
      }),
  })

  api.registerHttpRoute({
    path: HTTP_ROUTE_PREFIX,
    auth: "plugin",
    match: "prefix",
    replaceExisting: true,
    handler: createKaiwuRouteHandler(),
  })

  // gateway 起来时启动 WS 连接；停止时断开
  api.on("gateway_start", async () => {
    bridgeClient.start()
  })
  api.on("gateway_stop", async () => {
    bridgeClient.stop("gateway_stop")
  })

  // --- 遍历能力域 ---
  for (const [name, setup] of DOMAINS) {
    await setup({
      api,
      registerAction: createDomainRegistrar(name),
      bridge: bridgeClient,
    })
  }

  api.logger.info?.(`[kaiwu] registered ${DOMAINS.length} domains: ${DOMAINS.map(([n]) => n).join(", ")}`)
}
