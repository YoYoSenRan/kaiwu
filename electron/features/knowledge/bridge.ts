import { ipcRenderer } from "electron"
import { knowledgeChannels } from "./channels"
import type { KnowledgeBridge } from "./types"

export const knowledgeBridge: KnowledgeBridge = {
  base: {
    list: () => ipcRenderer.invoke(knowledgeChannels.base.list),
    create: (input) => ipcRenderer.invoke(knowledgeChannels.base.create, input),
    update: (id, input) => ipcRenderer.invoke(knowledgeChannels.base.update, id, input),
    delete: (id) => ipcRenderer.invoke(knowledgeChannels.base.delete, id),
    detail: (id) => ipcRenderer.invoke(knowledgeChannels.base.detail, id),
  },
  doc: {
    list: (kbId) => ipcRenderer.invoke(knowledgeChannels.doc.list, kbId),
    upload: (kbId) => ipcRenderer.invoke(knowledgeChannels.doc.upload, kbId),
    delete: (docId) => ipcRenderer.invoke(knowledgeChannels.doc.delete, docId),
    retry: (docId) => ipcRenderer.invoke(knowledgeChannels.doc.retry, docId),
    onProgress(listener) {
      const handler = (_: unknown, event: unknown) => listener(event as Parameters<typeof listener>[0])
      ipcRenderer.on(knowledgeChannels.doc.progress, handler)
      return () => ipcRenderer.off(knowledgeChannels.doc.progress, handler)
    },
  },
  search: {
    query: (input) => ipcRenderer.invoke(knowledgeChannels.search.query, input),
  },
  bind: {
    list: (agentId) => ipcRenderer.invoke(knowledgeChannels.bind.list, agentId),
    set: (agentId, kbIds) => ipcRenderer.invoke(knowledgeChannels.bind.set, agentId, kbIds),
  },
}
