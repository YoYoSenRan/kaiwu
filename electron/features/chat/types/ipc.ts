/**
 * IPC 契约:service 入参/出参 + ChatBridge (renderer 端调用形态)。
 */

import type { BudgetConfig, BudgetState, ChatMember, ChatMention, ChatMessage, ChatMode, ChatSession, ChatTurn, ReplyMode, SessionUsage } from "./domain"
import type { ChatErrorEvent, DeliveryUpdateEvent, LoopEvent, LoopPausedEvent, MessagesRefreshEvent, StreamDeltaEvent, StreamEndEvent } from "./events"

// ---------- Service 入参/出参 ----------

export interface CreateSessionInput {
  mode: ChatMode
  label?: string
  budget?: BudgetConfig
  /** 群聊:初始成员列表;单聊:必须恰好 1 个。 */
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

/**
 * session 详情聚合:一次 IPC 返回会话 + 成员 + 消息 + turn 运行记录。
 * 给会话追踪 UI 用,避免 N 次 round-trip。
 */
export interface ChatSessionDetail {
  session: ChatSession
  members: ChatMember[]
  messages: ChatMessage[]
  turns: ChatTurn[]
}

// ---------- Bridge (renderer 端调用形态) ----------

export interface ChatBridge {
  session: {
    list: () => Promise<ChatSession[]>
    create: (input: CreateSessionInput) => Promise<ChatSession>
    delete: (id: string) => Promise<void>
    archive: (id: string, archived: boolean) => Promise<void>
    /** 对账该 session 的消息:拉 openclaw chat.history,按 id/content 指纹 upsert 本地消息。 */
    reconcile: (id: string) => Promise<{ imported: number; updated: number }>
  }
  message: {
    list: (sessionId: string) => Promise<ChatMessage[]>
    /**
     * 发送用户消息。
     * @param mentions 结构化 @ 数组(composer 点选产出);不传则走文本正则降级。
     * @param inReplyToMessageId 回复的目标消息 id。无显式 mention 时作为隐式路由信号。
     */
    send: (sessionId: string, content: string, mentions?: ChatMention[], inReplyToMessageId?: string) => Promise<void>
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
  inspect: {
    /** 一次拉聚合:会话 + 成员 + 消息 + turn 运行记录。会话追踪页用。 */
    getSessionDetail: (sessionId: string) => Promise<ChatSessionDetail | null>
    /** 按 turnRunId 单条 turn 快照(含注入的 system_prompt / history_text / sent_message)。 */
    getTurn: (turnRunId: string) => Promise<ChatTurn | null>
  }
  debug: {
    /** 一键清空所有聊天表(chat_sessions / members / messages / turns / budget_state)。返各表清空前行数。 */
    clearAll: () => Promise<{ cleared: Record<string, number> }>
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
