import { definePluginEntry, type OpenClawPluginApi } from "./api.js"
import { createBridgeClient } from "./src/bridge-client.js"
import { resolveBridgeConfig } from "./src/config.js"
import { registerBridgeHooks } from "./src/hooks.js"
import { createKaiwuRouteHandler, type RouteContext } from "./src/http-routes.js"

/** 插件 id，与 openclaw.plugin.json 里的 id 保持一致。 */
const PLUGIN_ID = "kaiwu-bridge"
/** 插件语义化版本，和 package.json 同步。 */
const PLUGIN_VERSION = "0.1.0"
/** HTTP 路由前缀，kaiwu 端也写死用这个路径。 */
const HTTP_ROUTE_PREFIX = "/kaiwu/"
/** 无 handshake 时使用的占位 token，仅用于 HTTP 路由鉴权的边界状态。 */
const FALLBACK_TOKEN = ""

export default definePluginEntry({
  id: PLUGIN_ID,
  name: "Kaiwu Bridge",
  description: "Two-way bridge between OpenClaw and the Kaiwu desktop application.",
  async register(api: OpenClawPluginApi) {
    const startedAt = Date.now()
    let hostGatewayPort = 0

    // configFactory 每次重连都会被调用，kaiwu 重写 handshake 后无需重启即可采用新配置
    const bridgeClient = createBridgeClient({
      logger: api.logger,
      configFactory: () =>
        resolveBridgeConfig({
          rootDir: api.rootDir,
          pluginConfig: api.pluginConfig,
          logger: api.logger,
        }),
    })

    const routeCtx: RouteContext = {
      pluginId: PLUGIN_ID,
      pluginVersion: PLUGIN_VERSION,
      startedAt,
      get hostGatewayPort() {
        return hostGatewayPort
      },
      bridgeClient,
      // 路由鉴权要从 handshake 里动态读 token，因此每次用 getter 拿最新值
      get config() {
        const c = resolveBridgeConfig({
          rootDir: api.rootDir,
          pluginConfig: api.pluginConfig,
          logger: api.logger,
        })
        return c ?? { port: 0, token: FALLBACK_TOKEN, logLevel: "info" }
      },
      logger: api.logger,
    } as RouteContext

    api.registerHttpRoute({
      path: HTTP_ROUTE_PREFIX,
      auth: "plugin",
      match: "prefix",
      replaceExisting: true,
      handler: createKaiwuRouteHandler(routeCtx),
    })

    registerBridgeHooks({
      api,
      bridgeClient,
      onGatewayStart: (port) => {
        hostGatewayPort = port
      },
      onGatewayStop: () => {
        hostGatewayPort = 0
      },
    })

    api.logger.info?.(`[kaiwu-bridge] registered, will connect when kaiwu handshake is available`)
  },
})
