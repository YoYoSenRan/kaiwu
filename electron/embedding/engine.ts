import { scope } from "../core/logger"
import { DEFAULT_MODEL, LOCAL_MODELS } from "./models"
import { createLocalProvider, isModelCached, downloadModel } from "./local"

const embeddingLog = scope("embedding")

export { isModelCached, downloadModel, LOCAL_MODELS }

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
let localModelId: string | null = null

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
    provider = await createLocalProvider(localModelId ?? undefined)
  }

  embeddingLog.info(`嵌入模型提供商已初始化: ${provider.model} (${provider.dimensions}d)`)
  return provider
}

/**
 * 切换 embedding 引擎。切换后清空缓存的 provider 实例。
 * @param type 引擎类型
 * @param config 远程模式需传配置
 * @param modelId 本地模式的模型 ID
 */
export function setProviderType(type: "local" | "remote", config?: RemoteConfig, modelId?: string): void {
  providerType = type
  remoteConfig = config ?? null
  localModelId = modelId ?? null
  provider = null
  embeddingLog.info(`嵌入模型提供商类型已切换为 ${type}${modelId ? ` (${modelId})` : ""}`)
}

/** 获取当前引擎类型。 */
export function getProviderType(): "local" | "remote" {
  return providerType
}

/** 连通性测试结果。 */
export interface TestResult {
  ok: boolean
  error?: string
  dimensions?: number
  /** 实际测试用的模型标识。 */
  model?: string
}

/**
 * 测试当前引擎是否可用。
 * 本地模式会先检查模型是否已缓存，未下载直接返回失败，不触发下载。
 */
const testLog = scope("embedding:test")

export async function testProvider(): Promise<TestResult> {
  try {
    testLog.info(`providerType=${providerType}, localModelId=${localModelId}`)
    // 本地模式先检查模型缓存，未下载不应该在测试时静默触发下载
    if (providerType === "local") {
      const modelId = localModelId ?? DEFAULT_MODEL
      testLog.info(`检查缓存: ${modelId}`)
      const cached = await isModelCached(modelId)
      testLog.info(`cached=${cached}`)
      if (!cached) return { ok: false, error: "MODEL_NOT_DOWNLOADED", model: modelId }
    }
    testLog.info("正在获取提供商...")
    const p = await getProvider()
    testLog.info(`提供商就绪: ${p.model} (${p.dimensions}d)`)
    const [result] = await p.embed(["connectivity test"])
    testLog.info(`嵌入完成, 向量长度=${result.vector.length}`)
    return { ok: true, dimensions: result.vector.length, model: p.model }
  } catch (err) {
    testLog.error("测试失败:", err)
    return { ok: false, error: (err as Error).message }
  }
}
