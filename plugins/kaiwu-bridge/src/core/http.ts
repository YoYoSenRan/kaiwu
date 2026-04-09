import type { HttpRouteHandler } from "../../api.js"

/**
 * `/kaiwu/*` HTTP 路由分派器。
 * 结构上按 path 前缀拆到各 capability 的 handlers.ts；当前能力层未实现，返回 501 占位。
 */
export function createKaiwuRouteHandler(): HttpRouteHandler {
  return async (_req, res) => {
    res.writeHead(501, { "Content-Type": "application/json; charset=utf-8" })
    res.end(JSON.stringify({ ok: false, error: { message: "kaiwu-bridge capabilities not yet implemented" } }))
    return true
  }
}
