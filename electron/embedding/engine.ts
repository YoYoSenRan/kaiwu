import log from "../core/logger"

/** 单条 embedding 结果。 */
export interface EmbeddingResult {
  vector: number[]
  tokenCount: number
}

/** 引擎统一接口，本地和远程都实现。 */
export interface EmbeddingProvider {
  /** 模型标识，写入 knowledges.embedding_model。 */
  readonly model: string
  /** 向量维度。 */
  readonly dimensions: number
  /** 批量向量化。 */
  embed(texts: string[]): Promise<EmbeddingResult[]>
}

/** 远程 API 配置。 */
export interface RemoteConfig {
  endpoint: string
  apiKey: string
  model: string
}

let provider: EmbeddingProvider | null = null
let providerType: "local" | "remote" = "local"
let remoteConfig: RemoteConfig | null = null

/**
 * 获取当前激活的 embedding provider。
 * 首次调用惰性初始化，默认本地。
 */
export async function getProvider(): Promise<EmbeddingProvider> {
  if (provider) return provider

  if (providerType === "remote" && remoteConfig) {
    const { createRemoteProvider } = await import("./remote")
    provider = createRemoteProvider(remoteConfig)
  } else {
    const { createLocalProvider } = await import("./local")
    provider = await createLocalProvider()
  }

  log.info(`[embedding] provider initialized: ${provider.model} (${provider.dimensions}d)`)
  return provider
}

/**
 * 切换 embedding 引擎。切换后清空缓存的 provider 实例。
 * @param type 引擎类型
 * @param config 远程模式需传配置
 */
export function setProviderType(type: "local" | "remote", config?: RemoteConfig): void {
  providerType = type
  remoteConfig = config ?? null
  provider = null
  log.info(`[embedding] provider type set to ${type}`)
}

/** 获取当前引擎类型。 */
export function getProviderType(): "local" | "remote" {
  return providerType
}
