import { apiFetch } from "./api-client"

/** 读取分配给当前 Agent 的任务列表 */
export async function getMyTasks(projectId: string, agentId: string): Promise<unknown> {
  return apiFetch(`/api/pipeline/projects/${projectId}/tasks?assignedTo=${agentId}`)
}
