import { apiFetch } from "./api-client"

/** 读取辩论记录 */
export async function getDebateHistory(phaseId: string): Promise<unknown> {
  return apiFetch(`/api/pipeline/phases/${phaseId}/debates`)
}
