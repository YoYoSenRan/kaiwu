import { createBridge } from "../../app/bridge"
import type { KnowledgeBridge, KnowledgeEvents } from "./types"

const bridge = createBridge<KnowledgeEvents>("knowledge")

export const knowledge: KnowledgeBridge = {
  base: {
    list: () => bridge.invoke("base:list"),
    create: (input) => bridge.invoke("base:create", input),
    update: (id, input) => bridge.invoke("base:update", id, input),
    delete: (id) => bridge.invoke("base:delete", id),
    detail: (id) => bridge.invoke("base:detail", id),
  },
  doc: {
    list: (kbId) => bridge.invoke("doc:list", kbId),
    upload: (kbId) => bridge.invoke("doc:upload", kbId),
    delete: (docId) => bridge.invoke("doc:delete", docId),
    retry: (docId) => bridge.invoke("doc:retry", docId),
    chunks: (docId) => bridge.invoke("doc:chunks", docId),
    onProgress: (listener) => bridge.on("doc:progress", listener),
  },
  search: {
    query: (input) => bridge.invoke("search:query", input),
  },
  bind: {
    list: (agentId) => bridge.invoke("bind:list", agentId),
    set: (agentId, kbIds) => bridge.invoke("bind:set", agentId, kbIds),
  },
}
