import { nanoid } from "nanoid"
import log from "../../../core/logger"
import { getVectorDb } from "../../../core/vector"
import { getProvider } from "../../../embedding/engine"
import { documentsRepo } from "../../../db/repositories/documents"
import { knowledgesRepo } from "../../../db/repositories/knowledges"
import { parse } from "./parser"
import { split } from "./chunker"
import type { DocFormat } from "./parser"
import type { KnowledgeDocRow } from "../../../db/repositories/documents"

interface ChunkRecord extends Record<string, unknown> {
  id: string
  kb_id: string
  doc_id: string
  content: string
  vector: number[]
  position: number
  metadata: string
}

/** 进度事件，通过 IPC 推给渲染进程。 */
export interface DocProgressEvent {
  docId: string
  state: "processing" | "ready" | "failed"
  progress: number
  error?: string
}

/**
 * 处理单个文档：parse → chunk → embed → store。
 * @param doc SQLite 中的文档行
 * @param filePath 文件绝对路径
 * @param onProgress 进度回调
 */
export async function processDocument(
  doc: KnowledgeDocRow,
  filePath: string,
  onProgress: (event: DocProgressEvent) => void,
): Promise<void> {
  const docId = doc.id
  const kbId = doc.kb_id
  const now = Date.now()

  try {
    documentsRepo.update(docId, { state: "processing", updated_at: now })
    onProgress({ docId, state: "processing", progress: 0 })

    const text = await parse(filePath, doc.format as DocFormat)
    onProgress({ docId, state: "processing", progress: 20 })

    const chunks = split(text)
    if (chunks.length === 0) throw new Error("EMPTY_DOCUMENT")
    onProgress({ docId, state: "processing", progress: 40 })

    const provider = await getProvider()
    const results = await provider.embed(chunks.map((c) => c.content))
    onProgress({ docId, state: "processing", progress: 80 })

    const db = await getVectorDb()
    const records: ChunkRecord[] = chunks.map((chunk, i) => ({
      id: nanoid(),
      kb_id: kbId,
      doc_id: docId,
      content: chunk.content,
      vector: results[i].vector,
      position: chunk.position,
      metadata: JSON.stringify({ title: doc.title }),
    }))

    const tableName = "knowledge_chunks"
    try {
      const table = await db.openTable(tableName)
      await table.add(records)
    } catch {
      await db.createTable(tableName, records)
    }

    const chunkCount = chunks.length
    documentsRepo.update(docId, { state: "ready", chunk_count: chunkCount, updated_at: Date.now() })

    const kb = knowledgesRepo.findById(kbId)
    if (kb) {
      knowledgesRepo.update(kbId, {
        chunk_count: kb.chunk_count + chunkCount,
        doc_count: kb.doc_count + 1,
        updated_at: Date.now(),
      })
    }

    onProgress({ docId, state: "ready", progress: 100 })
    log.info(`[pipeline] doc ${docId} done: ${chunkCount} chunks`)
  } catch (err) {
    const message = (err as Error).message
    documentsRepo.update(docId, { state: "failed", error: message, updated_at: Date.now() })
    onProgress({ docId, state: "failed", progress: 0, error: message })
    log.error(`[pipeline] doc ${docId} failed:`, err)
  }
}
