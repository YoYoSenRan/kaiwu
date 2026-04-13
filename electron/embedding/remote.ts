import { scope } from "../core/logger"
import type { EmbeddingProvider, EmbeddingResult, RemoteConfig } from "./engine"

const remoteLog = scope("embedding:remote")

interface OpenAIEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>
  usage: { prompt_tokens: number; total_tokens: number }
}

/**
 * 创建远程 embedding provider。
 * 兼容 OpenAI embedding API 格式（OpenAI / 硅基流动 / Ollama 等）。
 * @param config API 连接配置
 */
export function createRemoteProvider(config: RemoteConfig): EmbeddingProvider {
  let cachedDimensions = 0

  return {
    model: config.model,
    get dimensions(): number {
      return cachedDimensions
    },
    async embed(texts: string[]): Promise<EmbeddingResult[]> {
      if (texts.length === 0) return []

      const url = config.endpoint.replace(/\/$/, "") + "/v1/embeddings"
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({ model: config.model, input: texts }),
      })

      if (!resp.ok) {
        const body = await resp.text()
        remoteLog.error(`API 错误 ${resp.status}: ${body}`)
        throw new Error(`Embedding API error: ${resp.status}`)
      }

      const json = (await resp.json()) as OpenAIEmbeddingResponse
      const tokenPerText = Math.ceil(json.usage.prompt_tokens / texts.length)

      // 首次响应时缓存维度，避免重复计算
      if (cachedDimensions === 0 && json.data.length > 0) {
        cachedDimensions = json.data[0].embedding.length
      }

      const sorted = json.data.sort((a, b) => a.index - b.index)
      return sorted.map((d) => ({ vector: d.embedding, tokenCount: tokenPerText }))
    },
  }
}
