import log from "../../core/logger"
import store from "../../core/store"
import { safeHandle } from "../../core/ipc"
import { getMainWindow } from "../../core/window"
import { LOCAL_MODELS } from "../../embedding/models"
import { setProviderType, testProvider, isModelCached, downloadModel } from "../../embedding/engine"
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

  // 测试前先应用传入的配置，确保测的是用户当前选择的引擎
  safeHandle(embeddingChannels.test, (config) => {
    log.info(`[embedding/ipc] test called, config received:`, JSON.stringify(config))
    if (config) {
      const cfg = config as EmbeddingConfig
      log.info(`[embedding/ipc] applying config: provider=${cfg.provider}, localModel=${cfg.localModel}`)
      store.set("embedding", cfg)
      const remote = cfg.provider === "remote" ? cfg.remote : undefined
      setProviderType(cfg.provider, remote, cfg.localModel)
    }
    return testProvider()
  })
}
