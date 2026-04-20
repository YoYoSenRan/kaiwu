/**
 * context 能力契约（插件侧）。
 *
 * kaiwu 主进程在每个 agent 阶段切换时，通过 invokePlugin 将检索好的知识库片段
 * 推送到插件；插件在 before_prompt_build hook 中将其注入 agent 的系统提示和用户上下文，
 * 避免把知识库内容拼进 chat.send 的消息体。
 */

// ---------- store 数据结构 ----------

/** 群聊共享历史的单条记录(结构化,对齐 discord plugin 的 InboundHistory 格式)。 */
export interface SharedHistoryEntry {
  sender: string
  body: string
  timestamp_ms: number
}

/** 单个阶段要注入的上下文。 */
export interface StageContext {
  /** 阶段指令 → appendSystemContext(系统提示尾部,provider 可缓存)。 */
  instruction: string
  /** 知识库片段 → prependContext(用户消息前面,每轮发送)。 */
  knowledge: string[]
  /**
   * 共享对话历史(群聊其他成员发言) → prependContext 的 "untrusted JSON block"。
   * 对齐 openclaw discord plugin 的做法(inbound-meta.ts:269),LLM 看到结构化 JSON + 明确 untrusted 标签,
   * 不会把历史当作"要分析的素材"。
   */
  sharedHistory?: SharedHistoryEntry[]
}

// ---------- HTTP invoke action 参数 ----------

/** action = "stage.set" 的 params。 */
export interface StageSetParams {
  /** 目标 session,格式由 kaiwu 主进程维护(如 "agent:{id}:kaiwu:task-{taskId}")。 */
  sessionKey: string
  /** 阶段指令。空字符串表示不注入指令。 */
  instruction: string
  /** 知识库片段列表。空数组表示本阶段无知识库。 */
  knowledge: string[]
  /** 共享对话历史(结构化)。省略或空数组表示本阶段无共享历史。 */
  sharedHistory?: SharedHistoryEntry[]
}

/** action = "stage.clear" 的 params。 */
export interface StageClearParams {
  sessionKey: string
}

// ---------- before_prompt_build hook 相关 ----------

/**
 * OpenClaw before_prompt_build hook 的事件参数。
 * 镜像自 openclaw/src/plugins/types.ts:2416-2420 的 PluginHookBeforePromptBuildEvent。
 */
export interface PromptBuildEvent {
  prompt: string
  messages: unknown[]
}

/**
 * hook 上下文中与 kaiwu 相关的字段。
 * 镜像自 openclaw/src/plugins/types.ts:2384-2394 的 PluginHookAgentContext 子集。
 */
export interface PromptBuildContext {
  sessionKey?: string
  runId?: string
  agentId?: string
  sessionId?: string
}

/**
 * hook 可返回的注入结果。
 * 镜像自 openclaw/src/plugins/types.ts:2422-2434 的 PluginHookBeforePromptBuildResult 子集。
 */
export interface PromptBuildResult {
  /** 拼在系统提示末尾。attempt.ts:1676 消费。 */
  appendSystemContext?: string
  /** 拼在用户消息前面。attempt.ts:1657-1658 消费。 */
  prependContext?: string
}
