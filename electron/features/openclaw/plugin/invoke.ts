import type { InvokeArgs, InvokeResult } from "./types"
import { detectGateway } from "../gateway/detection"

/** fetch 插件 HTTP 路由的超时(ms)。 */
const INVOKE_TIMEOUT_MS = 8_000

/**
 * 通过 OpenClaw gateway 调用 kaiwu 插件的 HTTP 路由。
 * kaiwu → OpenClaw → 插件 的入站通道。
 */
export async function invoke(token: string | null, args: InvokeArgs): Promise<InvokeResult> {
  const gateway = await detectGateway()
  if (gateway.deployment === "remote") {
    return { ok: false, error: { message: "远程部署不支持直接调用插件 HTTP 路由" } }
  }
  if (!gateway.running || !gateway.gatewayPort) {
    return { ok: false, error: { message: "OpenClaw gateway 未运行" } }
  }
  if (!token) {
    return { ok: false, error: { message: "bridge server 未启动, 无法鉴权" } }
  }
  const host = "127.0.0.1"
  const url = `http://${host}:${gateway.gatewayPort}/kaiwu/invoke`
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), INVOKE_TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(args),
      })
      let json: unknown
      try {
        json = await res.json()
      } catch {
        return { ok: false, error: { message: "gateway 返回非 JSON" } }
      }
      if (!json || typeof json !== "object" || !("ok" in json)) {
        return { ok: false, error: { message: "gateway 返回格式异常" } }
      }
      return json as InvokeResult
    } finally {
      clearTimeout(timer)
    }
  } catch (err) {
    return { ok: false, error: { message: (err as Error).message } }
  }
}
