import path from "node:path"
import fs from "node:fs/promises"
import { dialog } from "electron"
import { nanoid } from "nanoid"
import { getVectorDb } from "../../core/vector"
import { getProvider } from "../../embedding/engine"
import { getMainWindow } from "../../core/window"
import { knowledgesRepo } from "../../db/repositories/knowledges"
import { documentsRepo } from "../../db/repositories/documents"
import { processDocument } from "./core/pipeline"
import { search as vectorSearch } from "./core/search"
import { copyToCache, getCachePath, removeCacheFile, removeCacheDir } from "./core/cache"
import { deleteBindingsByKb } from "./core/bindings"
import type { KnowledgeRow } from "../../db/repositories/knowledges"
import type { KnowledgeDocRow } from "../../db/repositories/documents"
import type { DocProgressEvent } from "./core/pipeline"
import type { KbCreateInput, KbUpdateInput, KbDetailData, ChunkItem } from "./types"
import type { SearchInput, SearchResult } from "./core/search"

const EXT_MAP: Record<string, KnowledgeDocRow["format"]> = {
  ".md": "md",
  ".txt": "txt",
  ".pdf": "pdf",
  ".docx": "docx",
  ".xlsx": "xlsx",
}

const FILE_FILTERS: Electron.FileFilter[] = [{ name: "文档", extensions: ["md", "txt", "pdf", "docx", "xlsx"] }]

// --- 知识库 CRUD ---

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
  knowledgesRepo.insert({
    id,
    name: input.name,
    description: input.description ?? null,
    embedding_model: provider.model,
    created_at: now,
    updated_at: now,
  })
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

/** 删除知识库。 */
export async function deleteKnowledge(id: string): Promise<void> {
  getKb(id)
  try {
    const db = await getVectorDb()
    const table = await db.openTable("knowledge_chunks")
    await table.delete(`kb_id = '${id}'`)
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

// --- 文档管理 ---

/** 返回某知识库下的文档列表。 */
export function listDocuments(kbId: string): KnowledgeDocRow[] {
  return documentsRepo.listByKb(kbId)
}

/** 弹出文件选择对话框 + 上传到指定知识库。 */
export async function uploadDocuments(kbId: string, onProgress: (event: DocProgressEvent) => void): Promise<KnowledgeDocRow[]> {
  getKb(kbId)
  const parent = getMainWindow()
  const opts: Electron.OpenDialogOptions = {
    title: "选择文档",
    properties: ["openFile", "multiSelections"],
    filters: FILE_FILTERS,
  }
  const result = parent ? await dialog.showOpenDialog(parent, opts) : await dialog.showOpenDialog(opts)
  if (result.canceled || result.filePaths.length === 0) return []

  const docs: KnowledgeDocRow[] = []
  for (const filePath of result.filePaths) {
    const ext = path.extname(filePath).toLowerCase()
    const format = EXT_MAP[ext]
    if (!format) continue

    const stat = await fs.stat(filePath)
    const id = nanoid()
    const now = Date.now()
    documentsRepo.insert({ id, kb_id: kbId, title: path.basename(filePath), format, size: stat.size, state: "pending", created_at: now, updated_at: now })
    await copyToCache(filePath, kbId, id, format)
    const doc = documentsRepo.findById(id)!
    docs.push(doc)
    void processDocument(doc, getCachePath(kbId, id, format), onProgress)
  }
  return docs
}

/** 删除单个文档。 */
export async function deleteDocument(docId: string): Promise<void> {
  const doc = documentsRepo.findById(docId)
  if (!doc) throw new Error("DOCUMENT_NOT_FOUND")
  try {
    const db = await getVectorDb()
    const table = await db.openTable("knowledge_chunks")
    await table.delete(`doc_id = '${docId}'`)
  } catch {
    // 忽略
  }
  const kb = knowledgesRepo.findById(doc.kb_id)
  if (kb) {
    knowledgesRepo.update(doc.kb_id, {
      chunk_count: Math.max(0, kb.chunk_count - doc.chunk_count),
      doc_count: Math.max(0, kb.doc_count - 1),
      updated_at: Date.now(),
    })
  }
  documentsRepo.deleteById(docId)
  await removeCacheFile(doc.kb_id, docId, doc.format)
}

/**
 * 重试失败文档。清理旧 chunks 后从缓存文件重新跑 pipeline。
 * @param docId 文档 id
 * @param onProgress 进度回调
 */
export async function retryDocument(docId: string, onProgress: (event: DocProgressEvent) => void): Promise<void> {
  const doc = documentsRepo.findById(docId)
  if (!doc) throw new Error("DOCUMENT_NOT_FOUND")
  if (doc.state !== "failed") throw new Error("DOCUMENT_NOT_FAILED")

  try {
    const db = await getVectorDb()
    const table = await db.openTable("knowledge_chunks")
    await table.delete(`doc_id = '${docId}'`)
  } catch {
    // 表不存在，忽略
  }

  documentsRepo.update(docId, { state: "pending", chunk_count: 0, error: null, updated_at: Date.now() })
  void processDocument(doc, getCachePath(doc.kb_id, docId, doc.format), onProgress)
}

// --- Chunk 查看 ---

/**
 * 按文档 id 查询所有 chunks，按 position 排序，不返回 vector。
 * @param docId 文档 id
 */
export async function listChunks(docId: string): Promise<ChunkItem[]> {
  const db = await getVectorDb()
  let table
  try {
    table = await db.openTable("knowledge_chunks")
  } catch {
    return []
  }
  const rows = await table.query().where(`doc_id = '${docId}'`).toArray()
  return rows
    .map((r) => ({ id: r.id as string, content: r.content as string, position: r.position as number, metadata: r.metadata as string }))
    .sort((a, b) => a.position - b.position)
}

// --- 检索 ---

/** 混合检索。 */
export async function searchKnowledge(input: SearchInput): Promise<SearchResult[]> {
  return vectorSearch(input)
}

// --- Agent 绑定（委托 core/bindings）---

export { listBindings, setBindings } from "./core/bindings"

/** 按 id 查知识库行，找不到抛错。 */
function getKb(id: string): KnowledgeRow {
  const row = knowledgesRepo.findById(id)
  if (!row) throw new Error("KNOWLEDGE_NOT_FOUND")
  return row
}
