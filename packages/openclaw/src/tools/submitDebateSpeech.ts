import { apiFetch } from "./api-client"

/** 提交辩论发言 */
export async function submitDebateSpeech(
  phaseId: string,
  speech: { round: number; stance: "support" | "oppose"; content: string; citations: { source: string; data: string; url?: string }[]; keyPoint: string },
  agentId: string
): Promise<unknown> {
  return apiFetch(`/api/pipeline/phases/${phaseId}/debates`, { method: "POST", body: speech, agentId })
}
