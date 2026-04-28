/**
 * openclaw/plugin-sdk/plugin-entry 的类型声明。
 *
 * 运行时由 OpenClaw loader 解析，开发时由本文件提供类型。
 * 签名对齐 openclaw/src/plugin-sdk/plugin-entry.ts（2026.4.9）。
 * 用到新 API 时从源码抄准确签名，不要猜。
 */

declare module "openclaw/plugin-sdk/plugin-entry" {
  import type { IncomingMessage, ServerResponse } from "node:http"

  // ---------- Logger ----------

  export interface PluginLogger {
    debug?: (msg: string, ...args: unknown[]) => void
    info?: (msg: string, ...args: unknown[]) => void
    warn?: (msg: string, ...args: unknown[]) => void
    error?: (msg: string, ...args: unknown[]) => void
  }

  // ---------- HTTP Route ----------

  export type HttpRouteHandler = (req: IncomingMessage, res: ServerResponse) => Promise<boolean | void> | boolean | void

  export interface HttpRouteParams {
    path: string
    auth: "gateway" | "plugin"
    match?: "exact" | "prefix"
    replaceExisting?: boolean
    handler: HttpRouteHandler
  }

  // ---------- Gateway lifecycle ----------

  export interface GatewayStartEvent {
    port: number
  }

  export interface GatewayStopEvent {
    reason?: string
  }

  // ---------- Tools ----------

  export type AnyAgentTool = {
    name: string
    label?: string
    description?: string
    parameters?: unknown
    execute: (toolCallId: string, params: unknown) => Promise<{ content: Array<{ type: string; text?: string }>; details?: unknown }>
  }

  export type OpenClawPluginToolContext = {
    sessionKey?: string
    agentId?: string
  }

  export type OpenClawPluginToolFactory = (ctx: OpenClawPluginToolContext) => AnyAgentTool | AnyAgentTool[] | null | undefined

  // ---------- Plugin API ----------

  export interface OpenClawPluginApi {
    id: string
    name: string
    version?: string
    description?: string
    rootDir?: string
    pluginConfig?: Record<string, unknown>
    logger: PluginLogger

    registerHttpRoute: (params: HttpRouteParams) => void

    registerTool: (tool: AnyAgentTool | OpenClawPluginToolFactory, opts?: { name?: string }) => void

    /**
     * 注册 hook handler（官方方法名）。
     * handler 可返回值——如 before_prompt_build 返回注入内容。
     */
    registerHook: (events: string | string[], handler: (event: unknown, ctx: unknown) => unknown | Promise<unknown>, opts?: { priority?: number }) => void

    /**
     * registerHook 的别名，第三方插件社区的事实标准写法。
     * 与 registerHook 行为一致，handler 签名相同。
     */
    on: (event: string, handler: (event: unknown, ctx: unknown) => unknown | Promise<unknown>) => void
  }

  // ---------- Entry ----------

  export interface PluginEntryDefinition {
    id: string
    name: string
    description: string
    register: (api: OpenClawPluginApi) => void | Promise<void>
  }

  /** 定义插件入口。OpenClaw 运行时调用返回对象的 register。 */
  export function definePluginEntry(def: PluginEntryDefinition): PluginEntryDefinition
}
