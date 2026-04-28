import { Controller, Handle, IpcController, type IpcLifecycle } from "../../framework"
import { closeVectorDb } from "../../infra/vector"
import { listBindings, setBindings } from "./bindings"
import { createKnowledge, deleteKnowledge, detailKnowledge, listKnowledges, searchKnowledge, updateKnowledge } from "./base"
import { deleteDocument, listChunks, listDocuments, retryDocument, uploadDocuments } from "./document"
import type { DocProgressEvent, KbCreateInput, KbUpdateInput, KnowledgeEvents, SearchInput } from "./types"

/**
 * 知识库 feature：知识库 CRUD、文档处理、检索、Agent 绑定。
 */
@Controller("knowledge")
export class KnowledgeService extends IpcController<KnowledgeEvents> implements IpcLifecycle {
  @Handle("base:list")
  list() {
    return listKnowledges()
  }

  @Handle("base:detail")
  detail(id: string) {
    return detailKnowledge(id)
  }

  @Handle("base:create")
  create(input: KbCreateInput) {
    return createKnowledge(input)
  }

  @Handle("base:update")
  update(id: string, input: KbUpdateInput) {
    return updateKnowledge(id, input)
  }

  @Handle("base:delete")
  delete(id: string) {
    return deleteKnowledge(id)
  }

  @Handle("doc:list")
  listDocuments(kbId: string) {
    return listDocuments(kbId)
  }

  @Handle("doc:upload")
  uploadDocuments(kbId: string) {
    return uploadDocuments(kbId, (ev) => this.pushProgress(ev))
  }

  @Handle("doc:delete")
  deleteDocument(docId: string) {
    return deleteDocument(docId)
  }

  @Handle("doc:retry")
  retryDocument(docId: string) {
    return retryDocument(docId, (ev) => this.pushProgress(ev))
  }

  @Handle("doc:chunks")
  listChunks(docId: string) {
    return listChunks(docId)
  }

  @Handle("search:query")
  search(input: SearchInput) {
    return searchKnowledge(input)
  }

  @Handle("bind:list")
  listBindings(agentId: string) {
    return listBindings(agentId)
  }

  @Handle("bind:set")
  setBindings(agentId: string, kbIds: string[]) {
    return setBindings(agentId, kbIds)
  }

  /** 应用退出前关闭向量数据库连接。 */
  async onShutdown() {
    await closeVectorDb()
  }

  private pushProgress(event: DocProgressEvent): void {
    this.emit("doc:progress", event)
  }
}
