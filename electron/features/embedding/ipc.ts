import { safeHandle } from "../../core/ipc"
import { getMainWindow } from "../../core/window"
import { embeddingChannels } from "./channels"
import { downloadModelById, getConfig, listModels, restoreConfig, setConfig, testWithConfig } from "./service"
import type { DownloadProgress, EmbeddingConfig } from "./types"

/**
 * 注册 embedding 设置的 IPC handler。
 * 启动时先从 store 恢复上次的引擎配置。
 */
export function setupEmbedding(): void {
  restoreConfig()

  safeHandle(embeddingChannels.config.get, () => getConfig())
  safeHandle(embeddingChannels.config.set, (config) => setConfig(config as EmbeddingConfig))
  safeHandle(embeddingChannels.model.list, () => listModels())

  safeHandle(embeddingChannels.model.download, async (modelId) => {
    const id = modelId as string
    await downloadModelById(id, (progress) => {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        const payload: DownloadProgress = { modelId: id, progress }
        win.webContents.send(embeddingChannels.model.progress, payload)
      }
    })
  })

  safeHandle(embeddingChannels.test, (config) => testWithConfig(config as EmbeddingConfig | undefined))
}
