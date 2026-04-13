import { parentPort, workerData } from "node:worker_threads"

let pipeline: unknown = null
let modelId = "Xenova/bge-small-zh-v1.5"

async function getPipeline() {
  const { pipeline: createPipeline, env } = await import("@huggingface/transformers")
  // Worker 线程内限制单线程，避免 ONNX 运行时争抢 CPU
  if (env.backends.onnx.wasm) {
    env.backends.onnx.wasm.numThreads = 1
  }
  // 缓存目录由主进程传入，避免默认存在 node_modules 里打包后丢失
  if (workerData?.cacheDir) {
    env.cacheDir = workerData.cacheDir
  }
  return createPipeline("feature-extraction", modelId, {
    // v4 的 progress_total 事件已聚合所有文件的总进度，无需手动计算
    progress_callback: (info: { status?: string; progress?: number }) => {
      if (info.status === "progress_total" && info.progress !== undefined) {
        parentPort?.postMessage({ type: "progress", progress: info.progress })
      }
    },
  })
}

parentPort?.on("message", async (msg: { type: string; texts?: string[]; model?: string }) => {
  try {
    if (msg.type === "shutdown") {
      if (pipeline && typeof (pipeline as { dispose?: () => void }).dispose === "function") {
        ;(pipeline as { dispose: () => void }).dispose()
      }
      pipeline = null
      process.exit(0)
    }

    if (msg.type === "init" && msg.model) {
      modelId = msg.model
      pipeline = null
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
