import type { InvocationData } from "../../engine/types"

// ---------- 数据行类型 ----------

/** 对话列表项。 */
export interface ChatRow {
  id: string
  mode: ChatMode
  title: string
  config: string
  status: ChatStatus
  metadata: string
  created_at: number
  updated_at: number
  lastMessage?: string
  memberCount?: number
}

/** 对话模式：单聊 / 圆桌 / 流水线 / 辩论 / 委派。 */
export type ChatMode = "single" | "roundtable" | "pipeline" | "debate" | "delegation"

/** 对话状态。 */
export type ChatStatus = "active" | "paused" | "completed" | "archived"

/** 消息行。 */
export interface ChatMessageRow {
  id: string
  chat_id: string
  content: string
  status: "pending" | "confirmed" | "failed"
  invocation_id: string | null
  run_id: string | null
  remote_seq: number | null
  content_hash: string | null
  metadata: string
  created_at: number
  sender_type: "user" | "agent" | "system"
  sender_agent_id: string | null
}

/** 成员行。 */
export interface ChatMemberRow {
  config: string
  chat_id: string
  agent_id: string
  session_key: string | null
}

/** 调用记录行。一次 agent 回复 = 一行。 */
export interface ChatInvocationRow {
  id: string
  chat_id: string
  session_key: string
  agent_id: string
  model: string | null
  provider: string | null
  input_tokens: number | null
  output_tokens: number | null
  cache_read: number | null
  cache_write: number | null
  cost: number | null
  stop_reason: string | null
  duration_ms: number | null
  raw: string | null
  created_at: number
}

// ---------- 输入类型 ----------

/** 新建对话参数。 */
export interface ChatCreateInput {
  mode: ChatMode
  title: string
  agentIds: string[]
  config?: Record<string, unknown>
}

/** 发送消息参数。 */
export interface ChatSendInput {
  chatId: string
  content: string
}

/** 添加成员参数。 */
export interface ChatMemberAddInput {
  chatId: string
  agentId: string
  config?: Record<string, unknown>
}

// ---------- 事件类型（主进程 → 渲染进程推送） ----------

/** 流式响应事件。 */
export interface ChatStreamEvent {
  type: "delta" | "final" | "error"
  chatId: string
  agentId: string
  messageId: string
  error?: string
  content?: string
  invocation?: InvocationData
}

/** 工具调用瞬态事件（实时展示用，不入库）。 */
export interface ChatToolEvent {
  chatId: string
  agentId: string
  phase: "start" | "end"
  toolName: string
  input?: unknown
}

/** 圆桌讨论编排事件。 */
export interface ChatRoundtableEvent {
  type: "round-start" | "turn-start" | "turn-end" | "round-end" | "stopped" | "paused" | "resumed"
  chatId: string
  round?: number
  agentId?: string
}

/** 编排器的外部回调，由 IPC 层注入用于向 renderer 推送事件。 */
export interface OrchestratorCallbacks {
  onTool: (event: ChatToolEvent) => void
  onStream: (event: ChatStreamEvent) => void
  onRoundtable: (event: ChatRoundtableEvent) => void
}

// ---------- Bridge 接口 ----------

/** Chat 模块的 renderer 侧 API。 */
export interface ChatBridge {
  list: () => Promise<ChatRow[]>
  /** 与 OpenClaw 对账，补录缺失消息，返回补录条数。 */
  sync: (chatId: string) => Promise<number>
  abort: (chatId: string) => Promise<void>
  create: (input: ChatCreateInput) => Promise<ChatRow>
  delete: (id: string) => Promise<void>
  detail: (id: string) => Promise<ChatRow>
  updateConfig: (id: string, config: Record<string, unknown>) => Promise<void>
  messages: {
    list: (chatId: string) => Promise<ChatMessageRow[]>
    send: (input: ChatSendInput) => Promise<void>
  }
  members: {
    list: (chatId: string) => Promise<ChatMemberRow[]>
    add: (input: ChatMemberAddInput) => Promise<void>
    remove: (chatId: string, agentId: string) => Promise<void>
  }
  invocations: {
    list: (chatId: string) => Promise<ChatInvocationRow[]>
  }
  roundtable: {
    stop: (chatId: string) => Promise<void>
    start: (chatId: string, topic: string) => Promise<void>
    pause: (chatId: string) => Promise<void>
    resume: (chatId: string) => Promise<void>
  }
  on: {
    /** 订阅工具调用瞬态事件（实时展示用），返回取消订阅函数。 */
    tool: (listener: (event: ChatToolEvent) => void) => () => void
    /** 订阅流式响应事件，返回取消订阅函数。 */
    stream: (listener: (event: ChatStreamEvent) => void) => () => void
    /** 订阅圆桌讨论编排事件，返回取消订阅函数。 */
    roundtable: (listener: (event: ChatRoundtableEvent) => void) => () => void
  }
}
