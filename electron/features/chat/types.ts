/**
 * chat feature 的业务类型 + IPC 契约。
 *
 * 这些类型是 drizzle row 类型的 "UI 视角" 投影：
 * JSON 字段反序列化、字段名 camelCase、必要的冗余（member 附带 agent display name）。
 */

export type ChatMode = "direct" | "group"
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

/** StepUsage 镜像（避免 renderer 依赖 electron/agent/types）。 */
export interface MessageUsage {
  input?: number
  output?: number
  cacheRead?: number
  cacheWrite?: number
  total?: number
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
  /** 关联的 idempotencyKey（openclaw 侧叫 runId）。 */
  turnRunId: string | null
  tags: string[]
  /** assistant 消息的模型（"provider/model-id" 或 short name）。 */
  model: string | null
  /** assistant 消息的 token 用量。 */
  usage: MessageUsage | null
  /** final 的 stopReason。 */
  stopReason: string | null
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

/**
 * 一次 agent turn 的运行快照。调 openclaw chat.send 前落库,追踪完整链路:
 * 输入(sent_message) + 注入(system_prompt / history_text) + 输出(JOIN chat_messages via turnRunId)。
 */
export interface ChatTurn {
  id: string
  sessionId: string
  memberId: string
  turnRunId: string
  sessionKey: string
  agentId: string
  model: string | null
  triggerMessageId: string | null
  systemPrompt: string
  historyText: string | null
  sentMessage: string
  sentAt: number
  createdAt: number
}

/**
 * Session 级 usage 快照,数据源为 openclaw `sessions.list`。
 *
 * `totalTokens` 是 prompt 侧快照(不含 output),`contextTokens` 是模型 context window 容量。
 * `fresh=false` 表示数据是 transcript fallback 非当次 run 结果,UI 应降级展示。
 */
export interface SessionUsage {
  totalTokens: number | null
  contextTokens: number | null
  fresh: boolean
  model: string | null
  estimatedCostUsd: number | null
  /** 上次压缩检查点时间戳(ms)。UI 用于显示"上次压缩 X 分钟前"。 */
  latestCompactionAt: number | null
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

/** 流式 delta：增量内容吐字。按 sessionId + idempotencyKey 分流。 */
export interface StreamDeltaEvent {
  sessionId: string
  idempotencyKey: string
  /** 本轮对应的 openclaw sessionKey —— UI 反查发言 member/agent。 */
  openclawSessionKey: string
  /** 本次累积内容（overwrite 模式，不是增量拼接）。 */
  content: string
}

/** 流式结束：final / aborted / error 都触发，UI 清对应 streaming buffer。 */
export interface StreamEndEvent {
  sessionId: string
  idempotencyKey: string
  openclawSessionKey: string
}

/** 通知 renderer 该 session 的消息列表需要 re-fetch（对账后外部消息入库、旁路监听等）。 */
export interface MessagesRefreshEvent {
  sessionId: string
  reason: "reconcile" | "external"
}

/** 多 agent 投递态：user 消息发给各成员后,每成员独立的处理进度。transient,不入 DB。 */
export type DeliveryStatus = "queued" | "replying" | "done" | "error" | "aborted"

export interface DeliveryUpdateEvent {
  sessionId: string
  /** 触发本次投递的消息 id(通常是 user msg)。UI 按此绑定 chip 到消息气泡下。 */
  anchorMsgId: string
  memberId: string
  status: DeliveryStatus
  /** status=error 时的错误文本。 */
  errorMsg?: string
  at: number
}

/** 运行期错误（非对话内容，不入 DB）。对齐 openclaw UI 的 lastError banner 语义。 */
export interface ChatErrorEvent {
  sessionId: string
  /** 本次失败 run 的 idempotencyKey（可选，UI 可用于 retry）。 */
  idempotencyKey?: string
  /** 失败 run 的 openclaw sessionKey（group 多 agent 时定位是谁出错）。 */
  openclawSessionKey?: string
  /** 失败原因文本。 */
  message: string
  /** 错误类型：disconnected = 连接断（重连后 reconcile 会补）；error = 真实错误。 */
  kind?: "error" | "disconnected"
}

export interface ChatEvents {
  "message:new": ChatMessage
  "messages:refresh": MessagesRefreshEvent
  "loop:event": LoopEvent
  "loop:paused": LoopPausedEvent
  "stream:delta": StreamDeltaEvent
  "stream:end": StreamEndEvent
  "chat:error": ChatErrorEvent
  "delivery:update": DeliveryUpdateEvent
}

// ---------- Bridge ----------

export interface ChatBridge {
  session: {
    list: () => Promise<ChatSession[]>
    create: (input: CreateSessionInput) => Promise<ChatSession>
    delete: (id: string) => Promise<void>
    archive: (id: string, archived: boolean) => Promise<void>
    /** 对账该 session 的消息：拉 openclaw chat.history 补齐 kaiwu 缺失消息。 */
    reconcile: (id: string) => Promise<{ imported: number }>
  }
  message: {
    list: (sessionId: string) => Promise<ChatMessage[]>
    send: (sessionId: string, content: string) => Promise<void>
    answer: (sessionId: string, input: AnswerAskInput) => Promise<void>
    /** 中断该 session 所有活跃 run。返回中断的 runId 数量。 */
    abort: (sessionId: string) => Promise<{ aborted: number }>
  }
  member: {
    list: (sessionId: string) => Promise<ChatMember[]>
    add: (sessionId: string, input: AddMemberInput) => Promise<ChatMember>
    remove: (sessionId: string, memberId: string) => Promise<void>
    patch: (sessionId: string, memberId: string, patch: MemberPatch) => Promise<ChatMember>
  }
  budget: {
    get: (sessionId: string) => Promise<BudgetState | null>
    reset: (sessionId: string) => Promise<void>
  }
  usage: {
    /** 拉 openclaw 侧 session 的 usage 快照(单聊用,取 first member)。session 不存在或 RPC 失败返 null。 */
    get: (sessionId: string) => Promise<SessionUsage | null>
    /** 拉该 session 所有成员各自的 usage 快照(群聊用)。按 memberId 索引。 */
    getMembers: (sessionId: string) => Promise<Record<string, SessionUsage>>
  }
  on: {
    message: (l: (payload: ChatMessage) => void) => () => void
    messagesRefresh: (l: (payload: MessagesRefreshEvent) => void) => () => void
    loop: (l: (payload: LoopEvent) => void) => () => void
    paused: (l: (payload: LoopPausedEvent) => void) => () => void
    streamDelta: (l: (payload: StreamDeltaEvent) => void) => () => void
    streamEnd: (l: (payload: StreamEndEvent) => void) => () => void
    error: (l: (payload: ChatErrorEvent) => void) => () => void
    delivery: (l: (payload: DeliveryUpdateEvent) => void) => () => void
  }
}
