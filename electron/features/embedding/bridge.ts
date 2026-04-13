import { ipcRenderer } from "electron"
import { embeddingChannels } from "./channels"
import type { EmbeddingBridge } from "./types"

export const embeddingBridge: EmbeddingBridge = {
  getConfig: () => ipcRenderer.invoke(embeddingChannels.config.get),
  setConfig: (config) => ipcRenderer.invoke(embeddingChannels.config.set, config),
  listModels: () => ipcRenderer.invoke(embeddingChannels.model.list),
  download: (modelId) => ipcRenderer.invoke(embeddingChannels.model.download, modelId),
  test: (config) => ipcRenderer.invoke(embeddingChannels.test, config),
  onProgress(listener) {
    const handler = (_: unknown, info: unknown) => listener(info as Parameters<typeof listener>[0])
    ipcRenderer.on(embeddingChannels.model.progress, handler)
    return () => ipcRenderer.off(embeddingChannels.model.progress, handler)
  },
}
