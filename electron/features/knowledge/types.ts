import type { KnowledgeRow } from "../../db/repositories/knowledges"
import type { KnowledgeDocRow } from "../../db/repositories/documents"
import type { SearchInput, SearchResult } from "../../knowledge/search"
import type { DocProgressEvent } from "../../knowledge/pipeline"

export type { KnowledgeRow, KnowledgeDocRow, SearchInput, SearchResult, DocProgressEvent }

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
