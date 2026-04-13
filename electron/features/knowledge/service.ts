import { nanoid } from "nanoid"
import { getProvider } from "../../embedding/engine"
import { knowledgesRepo } from "../../db/repositories/knowledges"
import { documentsRepo } from "../../db/repositories/documents"
import { search as vectorSearch } from "../../knowledge/search"
import { deleteChunksByKb } from "../../knowledge/vector"
import { removeCacheDir } from "../../knowledge/cache"
import { deleteBindingsByKb } from "./bindings"
import type { KnowledgeRow } from "../../db/repositories/knowledges"
import type { KbCreateInput, KbUpdateInput, KbDetailData } from "./types"
import type { SearchInput, SearchResult } from "../../knowledge/search"

export { listBindings, setBindings } from "./bindings"
export { listDocuments, uploadDocuments, deleteDocument, retryDocument, listChunks } from "./document"

/** 返回所有知识库。 */
export function listKnowledges(): KnowledgeRow[] {
  return knowledgesRepo.list()
}

/** 按 id 查知识库详情 + 文档列表。 */
export function detailKnowledge(id: string): KbDetailData {
  const row = getKb(id)
  const docs = documentsRepo.listByKb(id)
  return { row, docs }
}

/** 新建知识库。 */
export async function createKnowledge(input: KbCreateInput): Promise<KnowledgeRow> {
  const provider = await getProvider()
  const id = nanoid()
  const now = Date.now()
  knowledgesRepo.insert({ id, name: input.name, description: input.description ?? null, embedding_model: provider.model, created_at: now, updated_at: now })
  return getKb(id)
}

/** 更新知识库名称/描述。 */
export function updateKnowledge(id: string, input: KbUpdateInput): KnowledgeRow {
  getKb(id)
  const patch: Parameters<typeof knowledgesRepo.update>[1] = { updated_at: Date.now() }
  if (input.name !== undefined) patch.name = input.name
  if (input.description !== undefined) patch.description = input.description
  knowledgesRepo.update(id, patch)
  return getKb(id)
}

/** 删除知识库（清理向量、文档、绑定、缓存）。 */
export async function deleteKnowledge(id: string): Promise<void> {
  getKb(id)
  try {
    await deleteChunksByKb(id)
  } catch {
    // 表不存在，忽略
  }
  knowledgesRepo.transaction(() => {
    documentsRepo.deleteByKb(id)
    deleteBindingsByKb(id)
    knowledgesRepo.deleteById(id)
  })
  await removeCacheDir(id)
}

/** 混合检索。 */
export async function searchKnowledge(input: SearchInput): Promise<SearchResult[]> {
  return vectorSearch(input)
}

/** 按 id 查知识库行，找不到抛错。 */
function getKb(id: string): KnowledgeRow {
  const row = knowledgesRepo.findById(id)
  if (!row) throw new Error("KNOWLEDGE_NOT_FOUND")
  return row
}
