import { apiFetch } from "./api-client"

/** 提交任务完成报告 */
export async function completeTask(taskId: string, result: { commits?: string[]; decisions?: string[]; note?: string }, agentId: string): Promise<unknown> {
  return apiFetch(`/api/pipeline/tasks/${taskId}/complete`, { method: "POST", body: result, agentId })
}
