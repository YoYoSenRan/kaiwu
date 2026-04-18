import type { KnowledgeRow } from "./types"

/** 获取某 agent 绑定的知识库列表。 */
export function listBindings(_agentId: string): KnowledgeRow[] {
  return []
}

/** 覆盖式设置某 agent 的知识库绑定。 */
export function setBindings(_agentId: string, _kbIds: string[]): void {
  throw new Error("NOT_IMPLEMENTED")
}

/** 删除某知识库的所有 agent 绑定。 */
export function deleteBindingsByKb(_kbId: string): void {
  throw new Error("NOT_IMPLEMENTED")
}
