/**
 * 聚合所有 HTTP action 注册 — 对应宿主 `api.registerHttpRoute()` 下的 action dispatcher。
 *
 * 每个 action 名形如 `<domain>.<verb>`(如 `context.set`)。
 * 控制端通过 POST body `{action: "context.set", params: {...}}` 调用。
 *
 * 新增 action 步骤:
 *   1. 在本目录新建 `<domain>.ts`,导出 handleXxx 函数
 *   2. 在下方 actions 数组加一行
 */

import { registerAction } from "../core/http.js"
import { handleContextClear, handleContextSet } from "./context.js"

export function setupRoutes(): void {
  const actions: Array<[string, (params: unknown) => { ok: boolean; error?: string; result?: unknown } | Promise<{ ok: boolean; error?: string; result?: unknown }>]> = [
    ["context.set", handleContextSet],
    ["context.clear", handleContextClear],
  ]
  for (const [name, handler] of actions) registerAction(name, handler)
}
