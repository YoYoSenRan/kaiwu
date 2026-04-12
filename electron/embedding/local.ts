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

/** 向 Worker 发 init 消息切换模型，等待 ready 确认后才返回。 */
function initWorkerModel(modelId: string): Promise<void> {
  const w = getWorker()
  return new Promise((resolve) => {
    const handler = (msg: { type: string }) => {
      if (msg.type === "ready") {
        w.off("message", handler)
        resolve()
      }
    }
    w.on("message", handler)
    w.postMessage({ type: "init", model: modelId })
  })
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
        log.info(`[embedding/local] model loading: ${pct}%`)
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
  // 等 Worker 确认切换完成再返回，避免后续 embed 用到旧模型的 pipeline
  await initWorkerModel(model.id)

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
    await initWorkerModel(modelId)
    await embedViaWorker([""])
  } finally {
    progressListener = null
  }
}

/**
 * 检查模型的所有 pipeline 文件是否已缓存。
 * 用 pipeline + local_files_only 测试，确保 config + tokenizer + ONNX 权重全部就绪。
 * @param modelId HuggingFace 模型 ID
 */
export async function isModelCached(modelId: string): Promise<boolean> {
  try {
    const { pipeline: createPipeline, env } = await import("@huggingface/transformers")
    env.cacheDir = getCacheDir()
    // allowRemoteModels=false 确保完全不发网络请求
    env.allowRemoteModels = false
    try {
      const p = await createPipeline("feature-extraction", modelId, { local_files_only: true })
      // 释放资源（dispose 如果存在的话）
      if (p && typeof (p as any).dispose === "function") (p as any).dispose()
      return true
    } finally {
      env.allowRemoteModels = true
    }
  } catch {
    return false
  }
}
