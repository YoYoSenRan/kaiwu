/**
 * chat feature 的业务类型 + IPC 契约。
 *
 * 这些类型是 drizzle row 类型的 "UI 视角" 投影：
 * JSON 字段反序列化、字段名 camelCase、必要的冗余（member 附带 agent display name）。
 */

export type ChatMode = "single" | "group"
export type ReplyMode = "auto" | "mention"
export type SenderType = "user" | "agent" | "tool" | "system"
export type MessageRole = "user" | "assistant" | "tool" | "system"

/** 预算配置。 */
export interface BudgetConfig {
  /** 默认 20。达到即终止 loop。 */
  maxRounds?: number
  /** 默认 100_000。达到即终止 loop。 */
  maxTokens?: number
  /** 可选：匹配到的 assistant 消息结束 loop。 */
  stopPhrase?: string
  /** 默认 300（5 分钟）。从 loop 启动计时。 */
  wallClockSec?: number
}

/** 策略配置（扩展点 6）。MVP 只有 broadcast。 */
export type StrategyConfig = { kind: "broadcast" }

export interface ChatSession {
  id: string
  mode: ChatMode
  label: string | null
  openclawKey: string | null
  budget: BudgetConfig
  strategy: StrategyConfig
  supervisorId: string | null
  archived: boolean
  createdAt: number
  updatedAt: number
}

export interface ChatMember {
  id: string
  sessionId: string
  agentId: string
  openclawKey: string
  replyMode: ReplyMode
  joinedAt: number
  leftAt: number | null
  seedHistory: boolean
}

export interface ChatMention {
  agentId: string
  /** "tool" = mention_next 工具触发；"plain" = 消息文本里字符串匹配。 */
  source: "tool" | "plain"
}

export interface ChatMessage {
  id: string
  sessionId: string
  seq: number
  openclawSessionKey: string | null
  openclawMessageId: string | null
  senderType: SenderType
  senderId: string | null
  role: MessageRole
  /** 完整 mirror。当前 MVP 简化成 { text: string } JSON。 */
  content: unknown
  mentions: ChatMention[]
  turnRunId: string | null
  tags: string[]
  createdAtLocal: number
  createdAtRemote: number | null
}

export interface BudgetState {
  sessionId: string
  roundsUsed: number
  tokensUsed: number
  startedAt: number
  updatedAt: number
}

// ---------- Service 入参/出参 ----------

export interface CreateSessionInput {
  mode: ChatMode
  label?: string
  budget?: BudgetConfig
  /** 群聊：初始成员列表；单聊：必须恰好 1 个。 */
  members: Array<{ agentId: string; replyMode: ReplyMode; seedHistory?: boolean }>
  supervisorId?: string
}

export interface AddMemberInput {
  agentId: string
  replyMode: ReplyMode
  seedHistory?: boolean
}

export interface MemberPatch {
  replyMode?: ReplyMode
}

export interface AnswerAskInput {
  pendingId: string
  answer: string
}

// ---------- 事件（main → renderer） ----------

export interface LoopPausedEvent {
  sessionId: string
  kind: "ask_user"
  pendingId: string
  question: string
  options?: string[]
  byAgentId: string
}

export type LoopEndedReason = "no_target" | "budget_max_rounds" | "budget_max_tokens" | "budget_wall_clock" | "stop_phrase" | "error"

export interface LoopEvent {
  sessionId: string
  kind: "started" | "ended"
  reason?: LoopEndedReason
}

export interface ChatEvents {
  "message:new": ChatMessage
  "loop:event": LoopEvent
  "loop:paused": LoopPausedEvent
}

// ---------- Bridge ----------

export interface ChatBridge {
  session: {
    list: () => Promise<ChatSession[]>
    create: (input: CreateSessionInput) => Promise<ChatSession>
    delete: (id: string) => Promise<void>
    archive: (id: string, archived: boolean) => Promise<void>
  }
  message: {
    list: (sessionId: string) => Promise<ChatMessage[]>
    send: (sessionId: string, content: string) => Promise<void>
    answer: (sessionId: string, input: AnswerAskInput) => Promise<void>
  }
  member: {
    list: (sessionId: string) => Promise<ChatMember[]>
    add: (sessionId: string, input: AddMemberInput) => Promise<ChatMember>
    remove: (sessionId: string, memberId: string) => Promise<void>
    patch: (sessionId: string, memberId: string, patch: MemberPatch) => Promise<ChatMember>
  }
  budget: {
    get: (sessionId: string) => Promise<BudgetState>
    reset: (sessionId: string) => Promise<void>
  }
  on: {
    message: (l: (payload: ChatMessage) => void) => () => void
    loop: (l: (payload: LoopEvent) => void) => () => void
    paused: (l: (payload: LoopPausedEvent) => void) => () => void
  }
}
