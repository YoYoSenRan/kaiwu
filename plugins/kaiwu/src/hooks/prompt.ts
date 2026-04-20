/**
 * `before_prompt_build` hook — agent 每轮推理前注入阶段上下文到 system/user prompt。
 *
 * 读取 `routes/stage` 存的 StageContext(由控制端通过 `context.set` 推入),
 * 有数据就返回 appendSystemContext + prependContext,没有就放行(对其他渠道零影响)。
 *
 * sharedHistory 格式: "untrusted JSON block" 方式注入 user prompt 前缀,
 * LLM 天然识别为"背景资料"而非"待分析素材"。
 */

import type { SharedHistoryEntry } from "../routes/stage.js"
import { getStageContext } from "../routes/stage.js"

/**
 * hook ctx 中与插件相关的字段。
 * 镜像自宿主 PluginHookAgentContext 的子集。
 */
export interface PromptBuildContext {
  sessionKey?: string
  runId?: string
  agentId?: string
  sessionId?: string
}

/**
 * hook 可返回的注入结果。
 * 镜像自宿主 PluginHookBeforePromptBuildResult 的子集。
 */
export interface PromptBuildResult {
  /** 拼在系统提示末尾。 */
  appendSystemContext?: string
  /** 拼在用户消息前面。 */
  prependContext?: string
}

/** 创建 hook handler。直接传给 `api.on("before_prompt_build", ...)`。 */
export function createPromptHook(): (_event: unknown, ctx: unknown) => PromptBuildResult | undefined {
  return (_event, ctx) => {
    const { sessionKey } = ctx as PromptBuildContext
    if (!sessionKey) return undefined
    const data = getStageContext(sessionKey)
    if (!data) return undefined

    const result: PromptBuildResult = {}
    if (data.instruction) {
      result.appendSystemContext = data.instruction
    }
    const prependParts: string[] = []
    if (data.sharedHistory && data.sharedHistory.length > 0) {
      prependParts.push(formatUntrustedJsonBlock("Chat history (untrusted, for context):", data.sharedHistory))
    }
    if (data.knowledge.length > 0) {
      prependParts.push(formatKnowledge(data.knowledge))
    }
    if (prependParts.length > 0) {
      result.prependContext = prependParts.join("\n\n")
    }
    return result
  }
}

function formatUntrustedJsonBlock(label: string, payload: SharedHistoryEntry[]): string {
  return [label, "```json", JSON.stringify(payload, null, 2), "```"].join("\n")
}

function formatKnowledge(chunks: string[]): string {
  return "<参考资料>\n" + chunks.join("\n---\n") + "\n</参考资料>"
}
