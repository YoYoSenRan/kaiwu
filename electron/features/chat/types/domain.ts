/**
 * chat 领域类型:会话/成员/消息/卡片/mention/预算 的核心业务实体。
 *
 * 这些类型是 drizzle row 的 "UI 视角" 投影:JSON 反序列化、camelCase 命名、
 * 必要的冗余(member 附带 agent display name)。
 */

export type ChatMode = "direct" | "group"
export type ReplyMode = "auto" | "mention"
export type SenderType = "user" | "agent" | "tool" | "system"
export type MessageRole = "user" | "assistant" | "tool" | "system"

/**
 * 预算配置。
 *
 * token / wallClock 由龙虾管 context window + 自身 timeout;kaiwu 只保留应用层护栏:
 *   - maxRounds:群聊递归防死循环
 *   - stopPhrase:匹配指定文本终止 loop(kaiwu 业务扩展)
 */
export interface BudgetConfig {
  /** 默认 200。达到即终止 loop(群聊护栏,防 agent 互 @ 死循环)。 */
  maxRounds?: number
  /** 可选:agent 回复里匹配到此文本则终止 loop。 */
  stopPhrase?: string
}

/** 策略配置(扩展点 6)。MVP 只有 broadcast。 */
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
  /**
   * 来源权威度(高→低):
   *   "structured" = composer 点选插入的结构化 token(UI 权威,100% 确定)
   *   "plain"      = 文本正则匹配 @<agentId>(用户手打或 agent 吐字后升级)
   *   "tool"       = hand_off 工具触发(无 range)
   */
  source: "structured" | "plain" | "tool"
  /** @ token 在 text 中的字符范围 [start, endExclusive)。tool 来源无 range。 */
  range?: [number, number]
}

/**
 * 交互卡片(对齐 feishu card-ux)。agent 回复里嵌 ```card JSON``` 代码块,
 * kaiwu 抽出来存 content.cards,UI 渲染为按钮组。
 */
export interface ChatCardOption {
  /** 按钮上的文字。 */
  label: string
  /**
   * 点击后作为新的用户消息发回 agent 的文本。
   * agent 读到这条 user msg 即知"用户选了 X",继续下一轮。
   */
  value: string
  /** 视觉样式。默认 "default"。 */
  style?: "primary" | "default" | "danger"
}

export interface ChatCard {
  /** 稳定 id,kaiwu 侧生成,用于 UI key + 防重复点击追踪。 */
  id: string
  /** 可选标题。 */
  title?: string
  /** 可选说明文字。 */
  description?: string
  /** 按钮列表。MVP 只支持 decision 类型。 */
  options: ChatCardOption[]
}

/** StepUsage 镜像(避免 renderer 依赖 electron/agent/types)。 */
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
  /**
   * 消息内容 JSON。形状 `{ text: string, cards?: ChatCard[] }`。
   * cards 由 kaiwu 从 agent 回复里的 ```card``` 代码块抽取,对应文本段已剔除。
   */
  content: unknown
  mentions: ChatMention[]
  /** 本消息回复的目标消息 id(同 session 内)。reply-to 结构化路由 + thread 可视化。 */
  inReplyToMessageId: string | null
  /** 关联的 idempotencyKey(openclaw 侧叫 runId)。 */
  turnRunId: string | null
  tags: string[]
  /** assistant 消息的模型("provider/model-id" 或 short name)。 */
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
