/**
 * `/kaiwu/*` HTTP 路由分派器。
 *
 * 支持两种 action 注册方式：
 * 1. 带域前缀的全名注册：registerAction("context.set", handler)
 * 2. 域 setup 里的短名注册：ctx.registerAction("set", handler) → 自动加域前缀 "context.set"
 *
 * 分发时按 action 字段精确匹配。
 */

import type { HttpRouteHandler } from "../../api.js"
import type { ActionHandler } from "../domain.js"

/** 全局 action 注册表。key 是完整 action 名（如 "context.set"）。 */
const registry = new Map<string, ActionHandler>()

/**
 * 注册一个 action handler。
 * @param action 完整 action 名（如 "context.set"）
 * @param handler 处理函数
 */
export function registerAction(action: string, handler: ActionHandler): void {
  if (registry.has(action)) {
    throw new Error(`action "${action}" already registered`)
  }
  registry.set(action, handler)
}

/**
 * 为指定域创建一个 action 注册器。
 * 域 setup 调用 `register("set", handler)` 时自动加前缀变成 "domain.set"。
 * @param domain 域名（如 "context"、"monitor"）
 */
export function createDomainRegistrar(domain: string): (method: string, handler: ActionHandler) => void {
  return (method, handler) => registerAction(`${domain}.${method}`, handler)
}

/**
 * `/kaiwu/*` HTTP 路由入口。
 * 按请求体的 `action` 字段路由到已注册的 handler。
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

/** 从 IncomingMessage 读取并解析 JSON body，失败返回 null。 */
async function readJsonBody(req: Parameters<HttpRouteHandler>[0]): Promise<unknown | null> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf-8"))
  } catch {
    return null
  }
}

/** 写 JSON 响应并结束连接。 */
function respond(res: Parameters<HttpRouteHandler>[1], status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" })
  res.end(JSON.stringify(data))
}
