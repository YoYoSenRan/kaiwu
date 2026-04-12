import { getVectorDb } from "../../../core/vector"
import { getProvider } from "../../../embedding/engine"

/** 检索入参。 */
export interface SearchInput {
  query: string
  kbIds: string[]
  topK?: number
}

/** 检索结果。 */
export interface SearchResult {
  chunkId: string
  docId: string
  kbId: string
  content: string
  score: number
  metadata: string
}

/**
 * 向量检索：将 query 向量化后在 LanceDB 中检索相似 chunks。
 * @param input 检索参数
 */
export async function search(input: SearchInput): Promise<SearchResult[]> {
  const topK = input.topK ?? 5
  if (input.kbIds.length === 0) return []

  const provider = await getProvider()
  const [queryResult] = await provider.embed([input.query])
  const queryVector = queryResult.vector

  const db = await getVectorDb()
  let table
  try {
    table = await db.openTable("knowledge_chunks")
  } catch {
    return []
  }

  const filter = `kb_id IN (${input.kbIds.map((id) => `'${id}'`).join(",")})`
  const vectorResults = await table.vectorSearch(queryVector).where(filter).limit(topK).toArray()

  return vectorResults.map((row, index) => ({
    chunkId: row.id as string,
    docId: row.doc_id as string,
    kbId: row.kb_id as string,
    content: row.content as string,
    score: 1 / (index + 1 + 60),
    metadata: row.metadata as string,
  }))
}
