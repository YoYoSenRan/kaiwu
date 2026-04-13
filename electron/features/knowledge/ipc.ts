import { safeHandle } from "../../core/ipc"
import { getMainWindow } from "../../core/window"
import { knowledgeChannels } from "./channels"
import {
  listKnowledges,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge,
  detailKnowledge,
  listDocuments,
  uploadDocuments,
  deleteDocument,
  retryDocument,
  listChunks,
  searchKnowledge,
  listBindings,
  setBindings,
} from "./service"
import type { KbCreateInput, KbUpdateInput, DocProgressEvent } from "./types"
import type { SearchInput } from "../../knowledge/search"

/** 将文档处理进度事件推送到渲染进程。 */
function sendProgress(event: DocProgressEvent): void {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send(knowledgeChannels.doc.progress, event)
  }
}

/**
 * 注册 knowledge feature 的所有 IPC handler。
 */
export function setupKnowledge(): void {
  safeHandle(knowledgeChannels.base.list, () => listKnowledges())
  safeHandle(knowledgeChannels.base.detail, (id) => detailKnowledge(id as string))
  safeHandle(knowledgeChannels.base.create, (input) => createKnowledge(input as KbCreateInput))
  safeHandle(knowledgeChannels.base.update, (id, input) => updateKnowledge(id as string, input as KbUpdateInput))
  safeHandle(knowledgeChannels.base.delete, (id) => deleteKnowledge(id as string))

  safeHandle(knowledgeChannels.doc.list, (kbId) => listDocuments(kbId as string))
  safeHandle(knowledgeChannels.doc.upload, (kbId) => uploadDocuments(kbId as string, sendProgress))
  safeHandle(knowledgeChannels.doc.delete, (docId) => deleteDocument(docId as string))
  safeHandle(knowledgeChannels.doc.retry, (docId) => retryDocument(docId as string, sendProgress))
  safeHandle(knowledgeChannels.doc.chunks, (docId) => listChunks(docId as string))

  safeHandle(knowledgeChannels.search.query, (input) => searchKnowledge(input as SearchInput))

  safeHandle(knowledgeChannels.bind.list, (agentId) => listBindings(agentId as string))
  safeHandle(knowledgeChannels.bind.set, (agentId, kbIds) => setBindings(agentId as string, kbIds as string[]))
}
