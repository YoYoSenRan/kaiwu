import store from "../../core/store"
import { safeHandle } from "../../core/ipc"
import { getMainWindow } from "../../core/window"
import { LOCAL_MODELS } from "../../embedding/models"
import { isModelCached, downloadModel } from "../../embedding/local"
import { setProviderType, testProvider } from "../../embedding/engine"
import { embeddingChannels } from "./channels"
import type { EmbeddingConfig, DownloadProgress } from "./types"

/**
 * 注册 embedding 设置的 IPC handler。
 * 启动时先从 store 恢复上次的引擎配置。
 */
export function setupEmbedding(): void {
  // 恢复上次配置
  const saved = store.get("embedding")
  if (saved) {
    const remote = saved.provider === "remote" ? saved.remote : undefined
    setProviderType(saved.provider, remote, saved.localModel)
  }

  safeHandle(embeddingChannels.config.get, () => store.get("embedding"))

  safeHandle(embeddingChannels.config.set, (config) => {
    const cfg = config as EmbeddingConfig
    store.set("embedding", cfg)
    const remote = cfg.provider === "remote" ? cfg.remote : undefined
    setProviderType(cfg.provider, remote, cfg.localModel)
  })

  safeHandle(embeddingChannels.model.list, async () => {
    const results = await Promise.all(
      LOCAL_MODELS.map(async (m) => ({ ...m, cached: await isModelCached(m.id) })),
    )
    return results
  })

  safeHandle(embeddingChannels.model.download, async (modelId) => {
    const id = modelId as string
    await downloadModel(id, (progress) => {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        const payload: DownloadProgress = { modelId: id, progress }
        win.webContents.send(embeddingChannels.model.progress, payload)
      }
    })
  })

  safeHandle(embeddingChannels.test, () => testProvider())
}
