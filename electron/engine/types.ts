import { z } from "zod"

// ---------- 上下文预算配置 ----------

/** 对话配置 schema，JSON 字段用 zod 校验。所有字段都有 default，老数据自动兼容。 */
export const chatConfigSchema = z.object({
  historyBudget: z.number().default(40),
  knowledgeBudget: z.number().default(20),
  memoryBudget: z.number().default(10),
  systemReserved: z.number().default(30),
  historyStrategy: z.enum(["recent", "summary", "full"]).default("recent"),
  historyMaxMessages: z.number().default(20),
  knowledgeIds: z.array(z.string()).default([]),
  knowledgeMaxChunks: z.number().default(5),
  knowledgeMinRelevance: z.number().default(0.7),
  turnStrategy: z.enum(["sequential", "random", "adaptive"]).default("sequential"),
  maxRounds: z.number().default(5),
  autoStop: z.boolean().default(true),
})

export type ChatConfig = z.infer<typeof chatConfigSchema>

/** 三层合并后的最终配置。 */
export type ResolvedConfig = ChatConfig

// ---------- 调用元数据 ----------

/** 从 ChatEvent final 中提取的调用元数据。 */
export interface InvocationData {
  runId: string
  model?: string
  provider?: string
  inputTokens?: number
  outputTokens?: number
  cacheRead?: number
  cacheWrite?: number
  cost?: number
  stopReason?: string
  raw: string
}

// ---------- Engine 运行参数 ----------

/** 单次 agent 调用的参数。 */
export interface EngineRunParams {
  sessionKey: string
  agentId: string
  message: string
  config: ResolvedConfig
  chatId: string
  /** gateway 确认接受消息后触发（runId 已拿到），用于确认入库时机。 */
  onSendConfirmed?: (runId: string) => void
  onDelta: (text: string) => void
  /** 工具调用瞬态事件（实时展示用，不入库）。 */
  onToolEvent?: (event: { phase: "start" | "end"; toolName: string; input?: unknown }) => void
  onFinal: (message: string, invocation: InvocationData) => void
  onError: (error: Error) => void
  signal?: AbortSignal
}

/** 推送给插件的阶段上下文。 */
export interface EngineStageContext {
  instruction: string
  knowledge: string[]
  sharedHistory?: string
}

// ---------- 轮转策略 ----------

export type TurnStrategy = ChatConfig["turnStrategy"]

/** 轮转决策结果。 */
export interface TurnDecision {
  agentId: string
  sessionKey: string
}
