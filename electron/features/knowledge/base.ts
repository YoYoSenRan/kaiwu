import type { KnowledgeRow, KbDetailData, KbCreateInput, KbUpdateInput, SearchInput, SearchResult } from "./types"

/** 返回所有知识库。 */
export function listKnowledges(): KnowledgeRow[] {
  return []
}

/** 按 id 查知识库详情 + 文档列表。 */
export function detailKnowledge(_id: string): KbDetailData {
  throw new Error("NOT_IMPLEMENTED")
}

/** 新建知识库。 */
export async function createKnowledge(_input: KbCreateInput): Promise<KnowledgeRow> {
  throw new Error("NOT_IMPLEMENTED")
}

/** 更新知识库名称/描述。 */
export function updateKnowledge(_id: string, _input: KbUpdateInput): KnowledgeRow {
  throw new Error("NOT_IMPLEMENTED")
}

/** 删除知识库（清理向量、文档、绑定、缓存）。 */
export async function deleteKnowledge(_id: string): Promise<void> {
  throw new Error("NOT_IMPLEMENTED")
}

/** 混合检索。 */
export async function searchKnowledge(_input: SearchInput): Promise<SearchResult[]> {
  throw new Error("NOT_IMPLEMENTED")
}
