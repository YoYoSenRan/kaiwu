import os from "node:os"
import path from "node:path"
import fs from "node:fs/promises"
import { Worker } from "node:worker_threads"
import { app } from "electron"
import log from "../core/logger"
import { LOCAL_MODELS, DEFAULT_MODEL } from "./models"
import type { EmbeddingProvider, EmbeddingResult } from "./engine"

let worker: Worker | null = null
let progressListener: ((p: number) => void) | null = null

/** 获取或创建 Worker 实例。 */
function getWorker(): Worker {
  if (worker) return worker

  const workerPath = path.join(app.getAppPath(), "dist-electron", "main", "worker.js")
  worker = new Worker(workerPath)

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
        const pct = Math.round((msg.progress ?? 0) * 100)
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
  // 通知 Worker 切换到目标模型
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
    // 用一条空文本触发 pipeline 加载（包含模型下载）
    await embedViaWorker([""])
  } finally {
    progressListener = null
  }
}

/**
 * 检查模型是否已缓存在本地。
 * Transformers.js 默认缓存在 ~/.cache/huggingface/hub/models--org--name/。
 * @param modelId HuggingFace 模型 ID
 */
export async function isModelCached(modelId: string): Promise<boolean> {
  // Xenova/bge-small-zh-v1.5 → models--Xenova--bge-small-zh-v1.5
  const dirName = `models--${modelId.replace("/", "--")}`
  const cacheBase = process.env.HF_HOME ?? path.join(os.homedir(), ".cache", "huggingface", "hub")
  const modelDir = path.join(cacheBase, dirName)
  try {
    await fs.access(modelDir)
    return true
  } catch {
    return false
  }
}
