/**
 * before_prompt_build hook 工厂。
 *
 * OpenClaw 在 agent 每轮推理前触发此 hook（attempt.ts:1652-1686），
 * 插件可以返回 appendSystemContext / prependContext 往 agent 上下文里注入内容。
 *
 * 判断逻辑：store 里有 sessionKey → 注入；没有 → 跳过（对其他渠道零影响）。
 */

import type { PromptBuildContext, PromptBuildResult } from "./contract.js"

import { getStageContext } from "./store.js"

/**
 * 创建 prompt 注入 hook handler。
 * @returns 可直接传给 api.registerHook("before_prompt_build", ...) 的函数
 */
export function createPromptHook(): (_event: unknown, ctx: unknown) => PromptBuildResult | undefined {
  return (_event, ctx) => {
    const { sessionKey } = ctx as PromptBuildContext
    if (!sessionKey) return undefined
    const data = getStageContext(sessionKey)
    if (!data) return undefined

    const result: PromptBuildResult = {}

    // 阶段指令 → 系统提示末尾（provider 可缓存，同阶段内多轮对话不重复计费）
    if (data.instruction) {
      result.appendSystemContext = data.instruction
    }

    // 知识库片段 → 用户消息前面（模型会当作用户给的参考资料处理）
    if (data.knowledge.length > 0) {
      result.prependContext = formatKnowledge(data.knowledge)
    }

    return result
  }
}

/** 将知识库片段拼成带分隔符的文本块，XML 标签帮助模型区分参考资料和用户指令。 */
function formatKnowledge(chunks: string[]): string {
  return "<参考资料>\n" + chunks.join("\n---\n") + "\n</参考资料>"
}
