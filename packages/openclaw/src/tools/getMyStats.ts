import { apiFetch } from "./api-client"

/** 读取 Agent 属性面板 */
export async function getMyStats(agentId: string): Promise<unknown> {
  return apiFetch(`/api/pipeline/agents/${agentId}/stats`)
}
