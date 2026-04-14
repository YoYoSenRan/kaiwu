import type { KnowledgeDocRow, ChunkItem, DocProgressEvent } from "./types"

/** 返回某知识库下的文档列表。 */
export function listDocuments(_kbId: string): KnowledgeDocRow[] {
  return []
}

/** 弹出文件选择对话框 + 上传到指定知识库。 */
export async function uploadDocuments(
  _kbId: string,
  _onProgress: (event: DocProgressEvent) => void,
): Promise<KnowledgeDocRow[]> {
  throw new Error("NOT_IMPLEMENTED")
}

/** 删除单个文档（清理向量、DB 记录、缓存文件）。 */
export async function deleteDocument(_docId: string): Promise<void> {
  throw new Error("NOT_IMPLEMENTED")
}

/**
 * 重试失败文档：清理旧 chunks 后从缓存文件重新跑 pipeline。
 */
export async function retryDocument(
  _docId: string,
  _onProgress: (event: DocProgressEvent) => void,
): Promise<void> {
  throw new Error("NOT_IMPLEMENTED")
}

/**
 * 按文档 id 查询所有 chunks，按 position 排序，不返回 vector。
 */
export async function listChunks(_docId: string): Promise<ChunkItem[]> {
  return []
}
