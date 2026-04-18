/**
 * openclaw/plugin-sdk/core 的类型声明。
 *
 * core 是 SDK 的大入口，bundled 插件和 channel 插件从这里导入。
 * kaiwu 当前只用 plugin-entry subpath；本文件预留 core 的类型，
 * 后续用到 registerTool / registerCommand 等 core-only API 时在此补充。
 *
 * 签名对齐 openclaw/src/plugin-sdk/core.ts（2026.4.9）。
 */

declare module "openclaw/plugin-sdk/core" {
  export type { OpenClawPluginApi, PluginLogger, PluginEntryDefinition } from "openclaw/plugin-sdk/plugin-entry"

  import type { TSchema } from "@sinclair/typebox"

  export interface AgentTool<TParameters extends TSchema, TDetails> {
    name: string
    label: string
    description: string
    parameters: TParameters
    execute: (
      toolCallId: string,
      params: unknown,
      signal?: AbortSignal,
      onUpdate?: unknown,
    ) => Promise<{ content: Array<{ type: "text"; text: string }>; details: TDetails }>
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type AnyAgentTool = AgentTool<any, unknown>

  export type OpenClawPluginToolContext = {
    config?: unknown
    runtimeConfig?: unknown
    fsPolicy?: unknown
    workspaceDir?: string
    agentDir?: string
    agentId?: string
    sessionKey?: string
    sessionId?: string
    browser?: { sandboxBridgeUrl?: string; allowHostControl?: boolean }
    messageChannel?: string
    agentAccountId?: string
    deliveryContext?: unknown
    requesterSenderId?: string
    senderIsOwner?: boolean
    sandboxed?: boolean
  }

  export type OpenClawPluginToolFactory = (
    ctx: OpenClawPluginToolContext,
  ) => AnyAgentTool | AnyAgentTool[] | null | undefined
}
