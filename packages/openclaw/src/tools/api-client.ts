/** API 基础地址 — 同机部署，走 localhost */
const API_BASE = process.env.KAIWU_API_BASE ?? "http://127.0.0.1:3600"

/** 通用 fetch 封装 */
export async function apiFetch<TResult>(path: string, options?: { method?: string; body?: unknown; agentId?: string }): Promise<TResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (options?.agentId) headers["X-Agent-Id"] = options.agentId

  const res = await fetch(`${API_BASE}${path}`, { method: options?.method ?? "GET", headers, body: options?.body ? JSON.stringify(options.body) : undefined })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(`API ${res.status}: ${(err as { error?: string }).error ?? res.statusText}`)
  }

  return res.json() as Promise<TResult>
}
