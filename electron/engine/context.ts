import { chatConfigSchema } from "./types"
import type { ChatConfig, EngineStageContext, ResolvedConfig } from "./types"

/** 全局默认配置，所有字段由 zod default 填充。 */
export const GLOBAL_DEFAULTS: ChatConfig = chatConfigSchema.parse({})

/**
 * 三层合并配置：全局默认 → 对话级 → 成员级。
 * @param chatConfig 对话级 JSON（来自 chats.config）
 * @param memberConfig 成员级 JSON（来自 chat_members.config，可选）
 */
export function resolveConfig(chatConfig: string, memberConfig?: string): ResolvedConfig {
  const chat = safeParseJson(chatConfig)
  const member = memberConfig ? safeParseJson(memberConfig) : {}
  return chatConfigSchema.parse({ ...chat, ...member })
}

/**
 * 组装推送给插件的阶段上下文。
 * @param role agent 在此对话中的角色描述
 * @param knowledge 检索到的知识库片段
 * @param sharedMessages 共享对话历史（已格式化的文本）
 */
export function buildStageContext(role: string | undefined, knowledge: string[], sharedMessages?: string): EngineStageContext {
  return {
    instruction: role ?? "",
    knowledge,
    sharedHistory: sharedMessages,
  }
}

/**
 * 将共享消息列表格式化为带 XML 标签的文本块。
 * @param messages 消息列表，每条包含 senderLabel 和 content
 */
export function formatSharedTranscript(messages: Array<{ senderLabel: string; content: string }>): string {
  if (messages.length === 0) return ""
  const lines = messages.map((m) => `[${m.senderLabel}] ${m.content}`)
  return "<共享对话记录>\n" + lines.join("\n") + "\n</共享对话记录>"
}

function safeParseJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}
