/**
 * 最小化的 OpenClaw plugin SDK 类型声明。
 *
 * 为什么不直接依赖 `@openclaw/plugin-sdk`：kaiwu-bridge 不跑自己的 pnpm install，
 * 避免引入子 node_modules。运行时由 OpenClaw 自己的 loader 解析 `openclaw/plugin-sdk/*`，
 * IDE 只需要足够的 shape 支持类型检查即可。
 *
 * 如果用到的 API 超出以下范围，按需补充。
 */

declare module "openclaw/plugin-sdk/plugin-entry" {
  export interface PluginLogger {
    debug?: (msg: string, ...args: unknown[]) => void
    info?: (msg: string, ...args: unknown[]) => void
    warn?: (msg: string, ...args: unknown[]) => void
    error?: (msg: string, ...args: unknown[]) => void
  }

  // OpenClaw 的 HTTP 路由 handler 用的是 Node 原生 http 模块类型
  import type { IncomingMessage, ServerResponse } from "node:http"

  export type HttpRouteHandler = (req: IncomingMessage, res: ServerResponse) => Promise<boolean | void> | boolean | void

  export interface HttpRouteParams {
    path: string
    auth: "gateway" | "plugin"
    match?: "exact" | "prefix"
    replaceExisting?: boolean
    handler: HttpRouteHandler
  }

  export interface GatewayStartEvent {
    port: number
  }

  export interface GatewayStopEvent {
    reason?: string
  }

  export interface OpenClawPluginApi {
    id: string
    name: string
    version?: string
    description?: string
    rootDir?: string
    pluginConfig?: Record<string, unknown>
    logger: PluginLogger
    registerHttpRoute: (params: HttpRouteParams) => void
    registerHook: (events: string | string[], handler: (event: unknown, ctx: unknown) => void | Promise<void>, opts?: { priority?: number }) => void
  }

  export interface PluginEntryDefinition {
    id: string
    name?: string
    description?: string
    register?: (api: OpenClawPluginApi) => void | Promise<void>
  }

  /** 定义插件入口。OpenClaw 运行时调用返回对象的 register。 */
  export function definePluginEntry(def: PluginEntryDefinition): PluginEntryDefinition
}
