import type { OpenClawPluginApi } from "../api.js"
import { createKaiwuRouteHandler } from "./core/http.js"
import { createBridgeClient } from "./core/transport.js"
import { resolveBridgeConfig } from "./core/handshake.js"

/** HTTP 路由前缀，kaiwu 端也写死用这个路径。 */
const HTTP_ROUTE_PREFIX = "/kaiwu/"

/**
 * kaiwu-bridge 插件的运行时注册入口。
 * 当前只装配 infra（transport + http 分派器）和生命周期 hook；
 * session / chat / hook 能力域的实现分散在 src/<capability>/ 下，
 * 未来在此统一挂载 setup<Cap>()。
 */
export async function registerBridgePlugin(api: OpenClawPluginApi): Promise<void> {
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

  // gateway 起来时启动 WS 连接；停止时断开。复杂的事件上报交给能力层。
  api.registerHook("gateway_start", async () => {
    bridgeClient.start()
  })
  api.registerHook("gateway_stop", async () => {
    bridgeClient.stop("gateway_stop")
  })

  api.logger.info?.("[kaiwu-bridge] registered (capability layer pending)")
}
