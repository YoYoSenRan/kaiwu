import type { EngineRunParams, EngineStageContext, InvocationData } from "./types"

/** engine 的运行时依赖，由调用方注入。engine 不直接 import features。 */
export interface EngineRuntime {
  /** 创建 OpenClaw session，返回 session key。 */
  sessionCreate(agentId: string, label?: string): Promise<{ sessionKey: string }>
  /** 获取 OpenClaw session 的聊天历史。 */
  chatHistory(sessionKey: string, limit?: number): Promise<Array<{ role: string; content: unknown; timestamp?: number; [k: string]: unknown }>>
  /** 调用 gateway chat.send RPC，返回 runId。 */
  chatSend(sessionKey: string, message: string): Promise<{ runId: string }>
  /** 调用 gateway chat.abort RPC。 */
  chatAbort(sessionKey: string, runId?: string): Promise<void>
  /** 订阅指定 session 的 chat 事件流，返回取消函数。 */
  onChatEvent(
    sessionKey: string,
    listener: (event: { runId: string; state: "delta" | "final" | "aborted" | "error"; message?: unknown; errorMessage?: string; raw: unknown }) => void,
  ): () => void
  /** 订阅指定 session 的 agent 事件流（工具调用等），返回取消函数。 */
  onAgentEvent(sessionKey: string, listener: (event: { stream: string; data?: Record<string, unknown> }) => void): () => void
  /** 推送阶段上下文到 kaiwu 插件（通过 gateway HTTP invoke）。 */
  pushStageContext(sessionKey: string, ctx: EngineStageContext): Promise<void>
  /** 清除指定 session 的阶段上下文。 */
  clearStageContext(sessionKey: string): Promise<void>
}

/**
 * 执行一次 agent 调用：推送上下文 → chat.send → 监听流式响应。
 * @param runtime 注入的 gateway/plugin 运行时
 * @param params 运行参数
 */
export async function runAgent(runtime: EngineRuntime, params: EngineRunParams): Promise<void> {
  const { sessionKey, message, onDelta, onFinal, onError, signal } = params

  if (signal?.aborted) {
    onError(new Error("aborted"))
    return
  }

  let runId: string | undefined
  let unsubscribe: (() => void) | undefined
  let unsubAgent: (() => void) | undefined

  // 订阅 agent 事件，转发工具调用瞬态事件
  if (params.onToolEvent) {
    const onTool = params.onToolEvent
    unsubAgent = runtime.onAgentEvent(sessionKey, (evt) => {
      if (evt.stream === "tool" && evt.data) {
        const phase = evt.data.phase === "end" ? "end" : "start"
        const toolName = typeof evt.data.name === "string" ? evt.data.name : "tool"
        onTool({ phase, toolName, input: evt.data.input })
      }
    })
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        runtime.chatAbort(sessionKey, runId).catch(() => {})
        reject(new Error("aborted"))
      }
      signal?.addEventListener("abort", onAbort, { once: true })

      unsubscribe = runtime.onChatEvent(sessionKey, (event) => {
        switch (event.state) {
          case "delta":
            if (event.message) onDelta(extractText(event.message))
            break
          case "final": {
            signal?.removeEventListener("abort", onAbort)
            const rawContent = serializeContent(event.message)
            const invocation = buildInvocationData(event.runId, event.raw)
            onFinal(rawContent, invocation)
            resolve()
            break
          }
          case "error":
            signal?.removeEventListener("abort", onAbort)
            reject(new Error(event.errorMessage ?? "agent error"))
            break
          case "aborted":
            signal?.removeEventListener("abort", onAbort)
            reject(new Error("agent aborted"))
            break
        }
      })

      runtime.chatSend(sessionKey, message).then(
        (result) => {
          runId = result.runId
          params.onSendConfirmed?.(runId)
          if (signal?.aborted) {
            runtime.chatAbort(sessionKey, runId).catch(() => {})
            reject(new Error("aborted"))
          }
        },
        (err) => reject(err),
      )
    })
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)))
  } finally {
    unsubscribe?.()
    unsubAgent?.()
    runtime.clearStageContext(sessionKey).catch(() => {})
  }
}

/** 从 gateway 消息对象中提取纯文本。 */
function extractText(message: unknown): string {
  if (!message) return ""
  if (typeof message === "string") return message
  const msg = message as { content?: Array<{ type?: string; text?: string }> }
  if (!Array.isArray(msg.content)) return ""
  return msg.content
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text)
    .join("")
}

/**
 * 将 gateway 消息对象的 content 序列化为存储格式。
 * content 为数组时 JSON.stringify 保持结构，为字符串时直接返回。
 */
function serializeContent(message: unknown): string {
  if (!message) return ""
  if (typeof message === "string") return message
  const msg = message as { content?: unknown }
  if (typeof msg.content === "string") return msg.content
  if (Array.isArray(msg.content)) return JSON.stringify(msg.content)
  return extractText(message)
}

/** 安全提取数字，非有限数字返回 undefined。 */
function safeNum(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined
}

/** 安全提取字符串。 */
function safeStr(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined
}

/** 从原始 ChatEvent 构造 InvocationData。 */
function buildInvocationData(runId: string, raw: unknown): InvocationData {
  const event = (raw ?? {}) as Record<string, unknown>
  const msg = (event.message ?? {}) as Record<string, unknown>
  const usage = (event.usage ?? msg.usage ?? {}) as Record<string, unknown>
  const cost = (usage.cost ?? {}) as Record<string, unknown>

  return {
    runId,
    model: safeStr(msg.model) ?? safeStr(event.model),
    provider: safeStr(msg.provider) ?? safeStr(event.provider),
    inputTokens: safeNum(usage.input),
    outputTokens: safeNum(usage.output),
    cacheRead: safeNum(usage.cacheRead),
    cacheWrite: safeNum(usage.cacheWrite),
    cost: safeNum(cost.total) ?? safeNum(usage.cost as unknown),
    stopReason: safeStr(event.stopReason) ?? safeStr(msg.stopReason),
    raw: JSON.stringify(raw ?? {}),
  }
}
