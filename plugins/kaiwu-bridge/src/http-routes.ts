import type { IncomingMessage, ServerResponse } from "node:http"
import type { HttpRouteHandler, PluginLogger } from "../api.js"
import type { BridgeClient } from "./bridge-client.js"
import type { BridgeConfig } from "./config.js"
import { BRIDGE_PROTOCOL_VERSION, SUPPORTED_PROTOCOL_VERSIONS, type HealthResponse, type InvokeRequest, type InvokeResponse, type VersionResponse } from "./protocol.js"

/** 读 request body 的超时（ms），防止卡死整个 gateway。 */
const BODY_READ_TIMEOUT_MS = 5_000
/** request body 最大字节数。 */
const BODY_MAX_BYTES = 256 * 1024

export interface RouteContext {
  pluginId: string
  pluginVersion: string
  startedAt: number
  hostGatewayPort: number
  bridgeClient: BridgeClient
  config: BridgeConfig
  logger: PluginLogger
}

/**
 * 构造所有 `/kaiwu/*` 路由的统一 handler。
 * 按 URL path 分派到具体动作；同一个 handler 注册在 prefix 匹配模式下。
 */
export function createKaiwuRouteHandler(ctx: RouteContext): HttpRouteHandler {
  return async (req, res) => {
    if (!authenticate(req, ctx)) {
      sendJson(res, 401, { ok: false, error: { message: "unauthorized" } })
      return true
    }

    const path = (req.url ?? "").split("?")[0] ?? ""
    const action = path.replace(/^\/kaiwu\//, "")

    try {
      if (req.method === "GET" && action === "health") {
        return handleHealth(ctx, res)
      }
      if (req.method === "GET" && action === "version") {
        return handleVersion(ctx, res)
      }
      if (req.method === "POST" && action === "config") {
        return await handleConfig(req, res, ctx)
      }
      if (req.method === "POST" && action === "invoke") {
        return await handleInvoke(req, res, ctx)
      }
      if (req.method === "POST" && action === "shutdown") {
        return handleShutdown(ctx, res)
      }

      sendJson(res, 404, { ok: false, error: { message: `no route: ${req.method} /${action}` } })
      return true
    } catch (err) {
      ctx.logger.error?.(`[kaiwu-bridge] route error: ${(err as Error).message}`)
      sendJson(res, 500, { ok: false, error: { message: (err as Error).message } })
      return true
    }
  }
}

// ---------- handlers ----------

function handleHealth(ctx: RouteContext, res: ServerResponse): boolean {
  const body: HealthResponse = {
    ok: true,
    pluginId: ctx.pluginId,
    pluginVersion: ctx.pluginVersion,
    uptimeMs: Date.now() - ctx.startedAt,
    wsConnected: ctx.bridgeClient.isConnected(),
    protocolVersion: BRIDGE_PROTOCOL_VERSION,
  }
  sendJson(res, 200, body)
  return true
}

function handleVersion(ctx: RouteContext, res: ServerResponse): boolean {
  const body: VersionResponse = {
    pluginVersion: ctx.pluginVersion,
    hostGatewayPort: ctx.hostGatewayPort,
    protocolVersion: BRIDGE_PROTOCOL_VERSION,
    supportedProtocolVersions: SUPPORTED_PROTOCOL_VERSIONS,
  }
  sendJson(res, 200, body)
  return true
}

async function handleConfig(req: IncomingMessage, res: ServerResponse, ctx: RouteContext): Promise<boolean> {
  const body = await readJsonBody(req)
  ctx.logger.info?.(`[kaiwu-bridge] config updated: ${JSON.stringify(body)}`)
  // 占位：真正的配置热更新在阶段 2 后补
  sendJson(res, 200, { ok: true })
  return true
}

async function handleInvoke(req: IncomingMessage, res: ServerResponse, ctx: RouteContext): Promise<boolean> {
  const body = (await readJsonBody(req)) as Partial<InvokeRequest>
  if (typeof body?.action !== "string") {
    sendJson(res, 400, { ok: false, error: { message: "invoke requires { action: string }" } })
    return true
  }
  ctx.logger.debug?.(`[kaiwu-bridge] invoke ${body.action}`)
  // 占位：业务动作分派在后续 feature 里接入
  const response: InvokeResponse = { ok: true, result: { action: body.action, echoed: body.params } }
  sendJson(res, 200, response)
  return true
}

function handleShutdown(ctx: RouteContext, res: ServerResponse): boolean {
  ctx.logger.info?.("[kaiwu-bridge] shutdown requested via HTTP")
  sendJson(res, 200, { ok: true })
  // 不立即停，让 OpenClaw 的 gateway_stop 钩子走正常路径
  return true
}

// ---------- helpers ----------

function authenticate(req: IncomingMessage, ctx: RouteContext): boolean {
  // 未拿到 handshake 时 token 为空：一律拒绝，避免空 token 匹配空请求导致越权
  const expected = ctx.config.token
  if (!expected || expected.length === 0) return false

  // 允许两种方式传 token：Authorization header 或 query 参数
  const header = req.headers["authorization"]
  if (typeof header === "string" && header === `Bearer ${expected}`) {
    return true
  }
  const url = req.url ?? ""
  const idx = url.indexOf("token=")
  if (idx >= 0) {
    const token = decodeURIComponent(url.slice(idx + 6).split("&")[0] ?? "")
    if (token === expected) return true
  }
  return false
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload).toString(),
  })
  res.end(payload)
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    const timer = setTimeout(() => reject(new Error("body read timeout")), BODY_READ_TIMEOUT_MS)

    req.on("data", (chunk: Buffer) => {
      size += chunk.length
      if (size > BODY_MAX_BYTES) {
        clearTimeout(timer)
        reject(new Error("body too large"))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on("end", () => {
      clearTimeout(timer)
      const raw = Buffer.concat(chunks).toString("utf-8")
      if (raw.length === 0) return resolve(undefined)
      try {
        resolve(JSON.parse(raw))
      } catch (err) {
        reject(new Error(`invalid json: ${(err as Error).message}`))
      }
    })
    req.on("error", (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}
