import { apiFetch } from "./api-client"

/** 写入 Agent 日志 */
export async function writeLog(
  agentId: string,
  log: { projectId: string; phaseId?: string; type: "thought" | "action" | "decision" | "error"; content: string; visibility?: "public" | "internal" }
): Promise<unknown> {
  return apiFetch(`/api/pipeline/agents/${agentId}/logs`, { method: "POST", body: log, agentId })
}
