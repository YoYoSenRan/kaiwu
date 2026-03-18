import { apiFetch } from "./api-client"

/** 提交阶段产出（通用） */
export async function submitOutput(phaseId: string, output: unknown, agentId: string): Promise<unknown> {
  return apiFetch(`/api/pipeline/phases/${phaseId}/output`, { method: "POST", body: output, agentId })
}
