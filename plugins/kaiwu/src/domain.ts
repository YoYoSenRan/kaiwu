/**
 * 能力域的公共接口。
 *
 * 每个能力域（context / monitor / chat / session / hook）导出一个
 * 符合 DomainSetup 签名的 setup 函数。register.ts 在插件启动时遍历调用。
 * 域通过 DomainContext 访问共享基础设施，不直接 import core 模块。
 */

import type { OpenClawPluginApi } from "../api.js"
import type { BridgeClient } from "./core/transport.js"

/** action handler：接收 params，返回结果。 */
export type ActionHandler = (params: unknown) => { ok: boolean; error?: string; result?: unknown } | Promise<{ ok: boolean; error?: string; result?: unknown }>

/** hook handler：OpenClaw 的 before_prompt_build / llm_input 等。 */
export type HookHandler = (event: unknown, ctx: unknown) => unknown

/**
 * 域 setup 函数收到的共享基础设施。
 * 域不直接 import core 模块——通过 ctx 访问，便于测试和解耦。
 */
export interface DomainContext {
  /** OpenClaw 插件 API（注册 hook / tool / http route 等）。 */
  api: OpenClawPluginApi
  /** 注册 HTTP invoke action。域名自动作为前缀（如域名 "context" 注册 "set" → action "context.set"）。 */
  registerAction: (method: string, handler: ActionHandler) => void
  /** 向 kaiwu 推送 WS 消息。 */
  bridge: BridgeClient
}

/**
 * 域 setup 函数签名。
 * 每个域导出一个 setup 函数，在插件启动时被 register.ts 调用。
 */
export type DomainSetup = (ctx: DomainContext) => void | Promise<void>
