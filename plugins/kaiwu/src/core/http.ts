/**
 * HTTP 路由分派器 — 控制端 RPC 入口的底层框架。
 *
 * 所有 action 共用一个 HTTP handler,按 request body 的 `action` 字段精确匹配。
 * 业务 action handler 在 `routes/` 下定义并通过 `registerAction()` 挂到注册表。
 */

import type { HttpRouteHandler } from "../../api.js"

/** action handler:接收 params,返回结果。 */
export type ActionHandler = (params: unknown) => { ok: boolean; error?: string; result?: unknown } | Promise<{ ok: boolean; error?: string; result?: unknown }>

/** 全局 action 注册表。key 是完整 action 名(如 "context.set")。 */
const registry = new Map<string, ActionHandler>()

/** 注册一个 action handler。 */
export function registerAction(action: string, handler: ActionHandler): void {
  if (registry.has(action)) {
    throw new Error(`action "${action}" already registered`)
  }
  registry.set(action, handler)
}

/**
 * HTTP 路由入口。按请求体的 `action` 字段路由到已注册的 handler。
 */
export function createKaiwuRouteHandler(): HttpRouteHandler {
  return async (req, res) => {
    const body = await readJsonBody(req)
    if (!body) {
      respond(res, 400, { ok: false, error: { message: "invalid JSON body" } })
      return true
    }

    const action = (body as { action?: string }).action
    const handler = action ? registry.get(action) : undefined
    if (!handler) {
      respond(res, 400, { ok: false, error: { message: `unknown action: ${action}` } })
      return true
    }

    const result = await handler((body as { params?: unknown }).params)
    respond(res, 200, result)
    return true
  }
}

async function readJsonBody(req: Parameters<HttpRouteHandler>[0]): Promise<unknown | null> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf-8"))
  } catch {
    return null
  }
}

function respond(res: Parameters<HttpRouteHandler>[1], status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" })
  res.end(JSON.stringify(data))
}
