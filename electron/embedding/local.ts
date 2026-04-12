import path from "node:path"
import { Worker } from "node:worker_threads"
import { app } from "electron"
import log from "../core/logger"
import { LOCAL_MODELS, DEFAULT_MODEL } from "./models"
import type { EmbeddingProvider, EmbeddingResult } from "./engine"

let worker: Worker | null = null
let progressListener: ((p: number) => void) | null = null

/** 模型缓存目录，放在 userData 下避免打包后丢失。 */
function getCacheDir(): string {
  return path.join(app.getPath("userData"), "models")
}

/** 获取或创建 Worker 实例，传入 cacheDir 供 Worker 设置 env.cacheDir。 */
function getWorker(): Worker {
  if (worker) return worker

  const workerPath = path.join(app.getAppPath(), "dist-electron", "main", "worker.js")
  worker = new Worker(workerPath, { workerData: { cacheDir: getCacheDir() } })

  worker.on("error", (err) => {
    log.error("[embedding/local] worker error:", err)
    worker = null
  })

  worker.on("exit", (code) => {
    if (code !== 0) log.warn(`[embedding/local] worker exited with code ${code}`)
    worker = null
  })

  return worker
}

/** 通过 Worker 执行批量 embedding，同时转发下载进度。 */
function embedViaWorker(texts: string[]): Promise<{ vectors: number[][]; tokenCounts: number[] }> {
  const w = getWorker()
  return new Promise((resolve, reject) => {
    const handler = (msg: { type: string; vectors?: number[][]; tokenCounts?: number[]; message?: string; progress?: number }) => {
      if (msg.type === "result") {
        w.off("message", handler)
        resolve({ vectors: msg.vectors!, tokenCounts: msg.tokenCounts! })
      } else if (msg.type === "error") {
        w.off("message", handler)
        reject(new Error(msg.message))
      } else if (msg.type === "progress") {
        const pct = Math.round(msg.progress ?? 0)
        log.info(`[embedding/local] model download: ${pct}%`)
        progressListener?.(pct)
      }
    }
    w.on("message", handler)
    w.postMessage({ type: "embed", texts })
  })
}

/**
 * 获取模型定义，找不到则用默认。
 * @param modelId HuggingFace 模型 ID
 */
function resolveModel(modelId?: string) {
  const id = modelId ?? DEFAULT_MODEL
  return LOCAL_MODELS.find((m) => m.id === id) ?? LOCAL_MODELS[0]
}

/**
 * 创建本地 embedding provider。
 * @param modelId 可选的模型 ID，默认取注册表第一个
 */
export async function createLocalProvider(modelId?: string): Promise<EmbeddingProvider> {
  const model = resolveModel(modelId)
  const w = getWorker()
  w.postMessage({ type: "init", model: model.id })

  return {
    model: model.id,
    dimensions: model.dimensions,
    async embed(texts: string[]): Promise<EmbeddingResult[]> {
      if (texts.length === 0) return []
      const { vectors, tokenCounts } = await embedViaWorker(texts)
      return vectors.map((vector, i) => ({ vector, tokenCount: tokenCounts[i] }))
    },
  }
}

/**
 * 触发模型下载（不做 embed，只初始化 pipeline 下载权重）。
 * @param modelId HuggingFace 模型 ID
 * @param onProgress 进度回调，0-100
 */
export async function downloadModel(modelId: string, onProgress: (p: number) => void): Promise<void> {
  progressListener = onProgress
  try {
    const w = getWorker()
    w.postMessage({ type: "init", model: modelId })
    await embedViaWorker([""])
  } finally {
    progressListener = null
  }
}

/**
 * 检查模型是否已缓存在本地。
 * 通过 local_files_only 尝试加载来判断，比猜路径可靠。
 * @param modelId HuggingFace 模型 ID
 */
export async function isModelCached(modelId: string): Promise<boolean> {
  try {
    const { AutoModel, env } = await import("@huggingface/transformers")
    env.cacheDir = getCacheDir()
    await AutoModel.from_pretrained(modelId, { local_files_only: true })
    return true
  } catch {
    return false
  }
}
