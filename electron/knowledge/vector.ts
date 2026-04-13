import { getVectorDb } from "../core/vector"

/**
 * 删除指定知识库在 LanceDB 中的所有 chunk 向量。
 * @param kbId 知识库 id
 */
export async function deleteChunksByKb(kbId: string): Promise<void> {
  const db = await getVectorDb()
  const table = await db.openTable("knowledge_chunks")
  await table.delete(`kb_id = '${kbId}'`)
}
