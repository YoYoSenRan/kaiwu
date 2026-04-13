import { scope } from "../../core/logger"
import store from "../../core/store"
import { setProviderType, testProvider, isModelCached, downloadModel, LOCAL_MODELS } from "../../embedding/engine"
import type { EmbeddingConfig } from "./types"

const log = scope("embedding:service")

/** 从 store 恢复上次保存的引擎配置，启动时调用一次。 */
export function restoreConfig(): void {
  const saved = store.get("embedding")
  if (saved) {
    const remote = saved.provider === "remote" ? saved.remote : undefined
    setProviderType(saved.provider, remote, saved.localModel)
  }
}

/** 获取当前持久化的 embedding 配置。 */
export function getConfig(): EmbeddingConfig | undefined {
  return store.get("embedding") as EmbeddingConfig | undefined
}

/**
 * 保存配置并切换引擎。
 * @param cfg 新的 embedding 配置
 */
export function setConfig(cfg: EmbeddingConfig): void {
  store.set("embedding", cfg)
  const remote = cfg.provider === "remote" ? cfg.remote : undefined
  setProviderType(cfg.provider, remote, cfg.localModel)
}

/** 获取可用本地模型列表（含缓存状态）。 */
export async function listModels() {
  return Promise.all(LOCAL_MODELS.map(async (m) => ({ ...m, cached: await isModelCached(m.id) })))
}

/**
 * 下载指定模型，通过回调报告进度。
 * @param id 模型 ID
 * @param onProgress 进度回调（0-100）
 */
export async function downloadModelById(id: string, onProgress: (progress: number) => void): Promise<void> {
  await downloadModel(id, onProgress)
}

/**
 * 用指定配置测试引擎连通性。
 * 如果传入 config，会先保存再测试。
 * @param config 可选的配置，传入则先应用
 */
export async function testWithConfig(config?: EmbeddingConfig) {
  if (config) {
    log.info(`应用配置: provider=${config.provider}, localModel=${config.localModel}`)
    setConfig(config)
  }
  return testProvider()
}
