import { apiFetch } from "./api-client"

/** 读取项目上下文 + 上游产出 */
export async function getProjectContext(projectId: string): Promise<unknown> {
  return apiFetch(`/api/pipeline/projects/${projectId}/context`)
}
