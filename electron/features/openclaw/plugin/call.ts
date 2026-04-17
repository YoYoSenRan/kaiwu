import type { InvokeArgs, InvokeResult } from "./types"
import { scanner } from "../container"

/** fetch 插件 HTTP 路由的超时(ms)。 */
const INVOKE_TIMEOUT_MS = 8_000

/**
 * 通过 OpenClaw gateway 调用 kaiwu 插件的 HTTP 路由。
 * kaiwu → OpenClaw → 插件 的入站通道。
 *
 * 前置条件不满足(远程部署/gateway 未运行/无 token)、网络错误、gateway 返回非法都抛错。
 * 成功时返回插件给的 InvokeResult(仍可能含业务错误字段,由 caller 判断)。
 */
export async function call(token: string | null, args: InvokeArgs): Promise<InvokeResult> {
  const gateway = await scanner.scan()
  if (gateway.deployment === "remote") {
    throw new Error("远程部署不支持直接调用插件 HTTP 路由")
  }
  if (!gateway.running || !gateway.gatewayPort) {
    throw new Error("OpenClaw gateway 未运行")
  }
  if (!token) {
    throw new Error("bridge server 未启动, 无法鉴权")
  }
  const url = `http://127.0.0.1:${gateway.gatewayPort}/kaiwu/invoke`
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
      throw new Error("gateway 返回非 JSON")
    }
    if (!json || typeof json !== "object" || !("ok" in json)) {
      throw new Error("gateway 返回格式异常")
    }
    return json as InvokeResult
  } finally {
    clearTimeout(timer)
  }
}
