import path from "node:path"
import { Worker } from "node:worker_threads"
import { app } from "electron"
import log from "../core/logger"
import type { EmbeddingProvider, EmbeddingResult } from "./engine"

const MODEL_ID = "Xenova/bge-small-zh-v1.5"
const DIMENSIONS = 512

let worker: Worker | null = null

/** 获取或创建 Worker 实例。 */
function getWorker(): Worker {
  if (worker) return worker

  // 构建产物路径：vite-plugin-electron 将 electron/ 编译到 dist-electron/main/
  const workerPath = path.join(app.getAppPath(), "dist-electron", "main", "worker.js")
  worker = new Worker(workerPath)

  worker.on("error", (err) => {
    log.error("[embedding/local] worker error:", err)
    worker = null
  })

  worker.on("exit", (code) => {
    // code 0 是正常退出，非 0 说明 Worker 崩溃
    if (code !== 0) log.warn(`[embedding/local] worker exited with code ${code}`)
    worker = null
  })

  return worker
}

function embedViaWorker(texts: string[]): Promise<{ vectors: number[][]; tokenCounts: number[] }> {
  const w = getWorker()
  return new Promise((resolve, reject) => {
    const handler = (msg: {
      type: string
      vectors?: number[][]
      tokenCounts?: number[]
      message?: string
      progress?: number
    }) => {
      if (msg.type === "result") {
        w.off("message", handler)
        resolve({ vectors: msg.vectors!, tokenCounts: msg.tokenCounts! })
      } else if (msg.type === "error") {
        w.off("message", handler)
        reject(new Error(msg.message))
      } else if (msg.type === "progress") {
        log.info(`[embedding/local] model download: ${msg.progress?.toFixed(1)}%`)
      }
    }
    w.on("message", handler)
    w.postMessage({ type: "embed", texts })
  })
}

/**
 * 创建本地 embedding provider。
 * 使用 Transformers.js 在 Worker 线程中运行 ONNX 模型。
 */
export async function createLocalProvider(): Promise<EmbeddingProvider> {
  return {
    model: MODEL_ID,
    dimensions: DIMENSIONS,
    async embed(texts: string[]): Promise<EmbeddingResult[]> {
      if (texts.length === 0) return []
      const { vectors, tokenCounts } = await embedViaWorker(texts)
      return vectors.map((vector, i) => ({ vector, tokenCount: tokenCounts[i] }))
    },
  }
}
