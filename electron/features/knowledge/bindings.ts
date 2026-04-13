import { bindingsRepo } from "../../db/repositories/bindings"
import { knowledgesRepo } from "../../db/repositories/knowledges"
import type { KnowledgeRow } from "../../db/repositories/knowledges"

/**
 * 获取某 agent 绑定的知识库列表。
 * @param agentId 本地 agent id
 */
export function listBindings(agentId: string): KnowledgeRow[] {
  return bindingsRepo.listByAgent(agentId)
}

/**
 * 覆盖式设置某 agent 的知识库绑定。
 * @param agentId 本地 agent id
 * @param kbIds 知识库 id 列表
 */
export function setBindings(agentId: string, kbIds: string[]): void {
  knowledgesRepo.transaction(() => {
    bindingsRepo.setForAgent(agentId, kbIds)
  })
}

/**
 * 删除某知识库的所有 agent 绑定。
 * @param kbId 知识库 id
 */
export function deleteBindingsByKb(kbId: string): void {
  bindingsRepo.deleteByKb(kbId)
}
