import type { TestResult } from "../../embedding/engine"

export type { TestResult }

/** 单个模型的信息（内置定义 + 运行时缓存状态）。 */
export interface ModelInfo {
  id: string
  name: string
  dimensions: number
  size: string
  lang: string
  cached: boolean
}

/** 完整的 embedding 配置（与 StoreSchema.embedding 一致）。 */
export interface EmbeddingConfig {
  provider: "local" | "remote"
  localModel: string
  remote: { endpoint: string; apiKey: string; model: string }
}

/** 模型下载进度。 */
export interface DownloadProgress {
  modelId: string
  progress: number
}

/** renderer ↔ main 的 embedding 设置桥接接口。 */
export interface EmbeddingBridge {
  /** 获取当前配置。 */
  getConfig: () => Promise<EmbeddingConfig>
  /** 保存配置并切换引擎。 */
  setConfig: (config: EmbeddingConfig) => Promise<void>
  /** 获取可用模型列表（含缓存状态）。 */
  listModels: () => Promise<ModelInfo[]>
  /** 触发下载指定模型。 */
  download: (modelId: string) => Promise<void>
  /** 用当前表单配置测试引擎连通性（会自动保存配置后再测试）。 */
  test: (config: EmbeddingConfig) => Promise<TestResult>
  /** 订阅模型下载进度，返回取消函数。 */
  onProgress: (listener: (info: DownloadProgress) => void) => () => void
}
