import type { HttpRouteHandler } from "../../api.js"
import { handleStageClear, handleStageSet } from "../context/route.js"

type ActionResult = { ok: boolean; error?: string; result?: unknown }
type ActionHandler = (params: unknown) => ActionResult

/** action → handler 映射。新增能力域时在这里注册对应的 action 前缀。 */
const actions: Record<string, ActionHandler> = {
  "stage.set": handleStageSet,
  "stage.clear": handleStageClear,
}

/**
 * `/kaiwu/*` HTTP 路由分派器。
 * 按请求体的 `action` 字段路由到各能力域的 handler。
 */
export function createKaiwuRouteHandler(): HttpRouteHandler {
  return async (req, res) => {
    const body = await readJsonBody(req)
    if (!body) {
      respond(res, 400, { ok: false, error: { message: "invalid JSON body" } })
      return true
    }

    const action = (body as { action?: string }).action
    const handler = action ? actions[action] : undefined
    if (!handler) {
      respond(res, 400, { ok: false, error: { message: `unknown action: ${action}` } })
      return true
    }

    const result = handler((body as { params?: unknown }).params)
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
