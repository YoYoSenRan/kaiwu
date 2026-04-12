import { parentPort } from "node:worker_threads"

let pipeline: unknown = null
let modelId = "Xenova/bge-small-zh-v1.5"

// 按文件聚合下载进度，避免多文件交叉导致进度跳动
const fileStats = new Map<string, { loaded: number; total: number }>()

async function getPipeline() {
  const { pipeline: createPipeline, env } = await import("@huggingface/transformers")
  // Worker 线程内限制单线程，避免 ONNX 运行时争抢 CPU
  if (env.backends.onnx.wasm) {
    env.backends.onnx.wasm.numThreads = 1
  }
  return createPipeline("feature-extraction", modelId, {
    progress_callback: (info: { status?: string; file?: string; progress?: number; loaded?: number; total?: number }) => {
      if (info.status !== "progress" || !info.file) return
      // 按字节数聚合所有文件的总进度
      fileStats.set(info.file, { loaded: info.loaded ?? 0, total: info.total ?? 0 })
      let totalLoaded = 0
      let totalSize = 0
      for (const { loaded, total } of fileStats.values()) {
        totalLoaded += loaded
        totalSize += total
      }
      const overall = totalSize > 0 ? (totalLoaded / totalSize) * 100 : 0
      parentPort?.postMessage({ type: "progress", progress: overall })
    },
  })
}

parentPort?.on("message", async (msg: { type: string; texts?: string[]; model?: string }) => {
  try {
    if (msg.type === "init" && msg.model) {
      modelId = msg.model
      pipeline = null
      fileStats.clear()
      parentPort?.postMessage({ type: "ready" })
      return
    }

    if (msg.type === "embed" && msg.texts) {
      if (!pipeline) pipeline = await getPipeline()

      const vectors: number[][] = []
      const tokenCounts: number[] = []

      for (const text of msg.texts) {
        // pipeline 返回值类型因任务和版本不同，@huggingface/transformers 无法静态收窄
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const output = await (pipeline as any)(text, { pooling: "cls", normalize: true })
        vectors.push(Array.from(output.data as Float32Array))
        // 简单估算 token 数：每 4 个字符约 1 个 token
        tokenCounts.push(Math.ceil(text.length / 4))
      }

      parentPort?.postMessage({ type: "result", vectors, tokenCounts })
    }
  } catch (err) {
    parentPort?.postMessage({ type: "error", message: (err as Error).message })
  }
})
