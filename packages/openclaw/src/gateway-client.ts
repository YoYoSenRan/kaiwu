/**
 * OpenClaw Gateway cron job 管理封装
 *
 * 编排层通过 cron one-shot job 给 Agent 分发任务，
 * 通过 cron API 查询 job 状态和健康检查。
 */

const GATEWAY_HOST = process.env.OPENCLAW_GATEWAY_HOST ?? "127.0.0.1"
const GATEWAY_PORT = process.env.OPENCLAW_GATEWAY_PORT ?? "18789"

function gatewayUrl(path: string): string {
  return `http://${GATEWAY_HOST}:${GATEWAY_PORT}${path}`
}

/** 通用 Gateway HTTP 请求 */
async function gatewayFetch<TResult>(path: string, options?: { method?: string; body?: unknown }): Promise<TResult> {
  const res = await fetch(gatewayUrl(path), {
    method: options?.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(`Gateway ${res.status}: ${(err as { error?: string }).error ?? res.statusText}`)
  }

  return res.json() as Promise<TResult>
}

/** 分发 Agent 任务——创建 one-shot isolated cron job */
export async function dispatchAgentTask(agentId: string, message: string, opts?: { timeoutSeconds?: number }): Promise<{ jobId: string }> {
  const result = await gatewayFetch<{ jobId: string }>("/api/cron/jobs", {
    method: "POST",
    body: {
      name: `task:${agentId}:${Date.now()}`,
      schedule: { kind: "at", at: new Date().toISOString() },
      sessionTarget: "isolated",
      agentId,
      payload: {
        kind: "agentTurn",
        message,
        timeoutSeconds: opts?.timeoutSeconds ?? 300,
      },
      delivery: { mode: "none" },
      deleteAfterRun: true,
    },
  })

  return result
}

/** 查询 cron job 状态 */
export async function getJobStatus(jobId: string): Promise<{ status: string; result?: unknown }> {
  return gatewayFetch(`/api/cron/jobs/${jobId}`)
}

/** 获取指定 cron job 的当前间隔（毫秒） */
export async function getCronInterval(jobName: string): Promise<number> {
  const jobs = await gatewayFetch<{ jobs: { name: string; schedule: { kind: string; every?: number; cron?: string } }[] }>("/api/cron/jobs")

  const job = jobs.jobs.find((j) => j.name === jobName)
  if (!job) throw new Error(`Cron job "${jobName}" not found`)

  if (job.schedule.kind === "every" && job.schedule.every) {
    return job.schedule.every
  }

  // cron 表达式：粗略估算间隔（取分钟字段）
  if (job.schedule.kind === "cron" && job.schedule.cron) {
    return parseCronIntervalMs(job.schedule.cron)
  }

  return 20 * 60 * 1000 // 默认 20 分钟
}

/** 从 cron 表达式粗略估算间隔（毫秒） */
function parseCronIntervalMs(cron: string): number {
  const parts = cron.trim().split(/\s+/)
  const minutePart = parts[0]
  if (!minutePart) return 20 * 60 * 1000

  // */N 格式
  const match = minutePart.match(/^\*\/(\d+)$/)
  if (match?.[1]) {
    return Number.parseInt(match[1], 10) * 60 * 1000
  }

  // 固定分钟（如 "0"）→ 每小时
  if (/^\d+$/.test(minutePart)) {
    return 60 * 60 * 1000
  }

  return 20 * 60 * 1000
}

/** 更新 cron job 间隔（退避/恢复时用） */
export async function updateCronInterval(jobId: string, intervalMs: number): Promise<void> {
  await gatewayFetch(`/api/cron/jobs/${jobId}`, {
    method: "PATCH",
    body: { schedule: { kind: "every", every: intervalMs } },
  })
}

/** LLM provider 健康检查 */
export async function checkProviderHealth(): Promise<boolean> {
  try {
    const res = await fetch(gatewayUrl("/health"), { signal: AbortSignal.timeout(5000) })
    return res.ok
  } catch {
    return false
  }
}
