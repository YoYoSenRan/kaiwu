/** 文档处理进度事件。 */
export interface DocProgressEvent {
  docId: string
  state: "processing" | "ready" | "failed"
  progress: number
  error?: string
}

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

/** 知识库行类型（原 db/repositories/knowledges 的简化版）。 */
export interface KnowledgeRow {
  id: string
  name: string
  description: string | null
  embedding_model: string
  chunk_count: number
  doc_count: number
  created_at: number
  updated_at: number
}

/** 文档行类型（原 db/repositories/documents 的简化版）。 */
export interface KnowledgeDocRow {
  id: string
  kb_id: string
  title: string
  format: "md" | "txt" | "pdf" | "docx" | "xlsx"
  size: number
  state: "pending" | "processing" | "ready" | "failed"
  chunk_count: number
  error: string | null
  created_at: number
  updated_at: number
}

/** 新建知识库的入参。 */
export interface KbCreateInput {
  name: string
  description?: string
}

/** 更新知识库的入参。 */
export interface KbUpdateInput {
  name?: string
  description?: string
}

/** Chunk 查看返回类型（不含 vector）。 */
export interface ChunkItem {
  id: string
  content: string
  position: number
  metadata: string
}

/** 详情页数据载荷。 */
export interface KbDetailData {
  row: KnowledgeRow
  docs: KnowledgeDocRow[]
}

/** renderer ↔ main 的 knowledge feature 桥接接口。 */
export interface KnowledgeBridge {
  base: {
    list: () => Promise<KnowledgeRow[]>
    create: (input: KbCreateInput) => Promise<KnowledgeRow>
    update: (id: string, input: KbUpdateInput) => Promise<KnowledgeRow>
    delete: (id: string) => Promise<void>
    detail: (id: string) => Promise<KbDetailData>
  }
  doc: {
    list: (kbId: string) => Promise<KnowledgeDocRow[]>
    upload: (kbId: string) => Promise<KnowledgeDocRow[]>
    delete: (docId: string) => Promise<void>
    retry: (docId: string) => Promise<void>
    /** 查看文档的分块内容。 */
    chunks: (docId: string) => Promise<ChunkItem[]>
    onProgress: (listener: (event: DocProgressEvent) => void) => () => void
  }
  search: {
    query: (input: SearchInput) => Promise<SearchResult[]>
  }
  bind: {
    list: (agentId: string) => Promise<KnowledgeRow[]>
    set: (agentId: string, kbIds: string[]) => Promise<void>
  }
}
