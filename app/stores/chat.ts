import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { BudgetState, ChatErrorEvent, ChatMessage, ChatMember, ChatSession, DeliveryStatus, DeliveryUpdateEvent, LoopEvent, LoopPausedEvent, SessionUsage, StreamDeltaEvent, StreamEndEvent } from "../../electron/features/chat/types"

/** 每 (sessionId, anchorMsgId, memberId) 的投递态快照。 */
export interface DeliveryState {
  status: DeliveryStatus
  errorMsg?: string
  toolName?: string
  at: number
}

const TERMINAL_STATUSES: ReadonlySet<DeliveryStatus> = new Set<DeliveryStatus>(["done", "error", "aborted"])

/** 单条流式 buffer：当前 session 的某个 idempotencyKey 的累积内容。 */
export interface StreamBuffer {
  content: string
  startedAt: number
  /** 本次 run 对应的 openclaw sessionKey，用于反查发言 member/agent。 */
  openclawSessionKey: string
}

/** 消息预览：截取 text 首 60 字，空白压成单空格。 */
function extractPreview(msg: ChatMessage): string {
  const c = msg.content as { text?: string } | null
  const text = (c?.text ?? "").replace(/\s+/g, " ").trim()
  return text.length > 60 ? text.slice(0, 60) + "…" : text
}

/**
 * chat 前端 store。
 *
 * 持久化的是 UI 偏好（currentSessionId）；会话数据走主进程 IPC 实时拉取，不缓存。
 */

interface ChatUiState {
  currentSessionId: string | null
  /** 草稿：每 session 当前未发送的输入文本。切 session 保留，关闭应用也保留。 */
  drafts: Record<string, string>
  setCurrent: (id: string | null) => void
  setDraft: (sessionId: string, text: string) => void
  clearDraft: (sessionId: string) => void
}

export const useChatUiStore = create<ChatUiState>()(
  persist(
    (set) => ({
      currentSessionId: null,
      drafts: {},
      setCurrent: (id) => set({ currentSessionId: id }),
      setDraft: (sessionId, text) =>
        set((s) => {
          if (!text) {
            if (!s.drafts[sessionId]) return {}
            const next = { ...s.drafts }
            delete next[sessionId]
            return { drafts: next }
          }
          return { drafts: { ...s.drafts, [sessionId]: text } }
        }),
      clearDraft: (sessionId) =>
        set((s) => {
          if (!s.drafts[sessionId]) return {}
          const next = { ...s.drafts }
          delete next[sessionId]
          return { drafts: next }
        }),
    }),
    { name: "chat-ui", version: 1, partialize: (s) => ({ drafts: s.drafts }) },
  ),
)

// ---------- data cache ----------

interface ChatDataState {
  sessions: ChatSession[]
  members: Record<string, ChatMember[]>
  messages: Record<string, ChatMessage[]>
  pending: LoopPausedEvent | null
  loopStatus: Record<string, LoopEvent["kind"]>
  /** 每 session 最新一次 ended 事件（含 reason，含序号用作 useEffect 触发器）。 */
  loopEnded: Record<string, { reason?: LoopEvent["reason"]; seq: number }>
  /** 流式 buffer：sessionId → idempotencyKey → content。UI 渲染时把这里的 buffer 作为末尾临时气泡。 */
  streaming: Record<string, Record<string, StreamBuffer>>
  /** 每 session 最近一次活动时间戳（用于 sidebar 排序）。 */
  sessionActivity: Record<string, number>
  /** 每 session 最近一条消息预览（sidebar 副标题）。 */
  sessionLastText: Record<string, string>
  /** 每 session 未读数（sidebar 红点）。 */
  unread: Record<string, number>
  /** 每 session 最后一次运行错误（对齐 openclaw UI lastError；transient，不入 DB）。 */
  lastError: Record<string, { text: string; ts: number; openclawSessionKey?: string; idempotencyKey?: string; kind?: string }>
  /** 每 session 预算用量快照（按需 refresh，群聊用）。 */
  budgetStates: Record<string, BudgetState | null>
  /** 每 session usage 快照（单聊用，数据源 openclaw sessions.list）。 */
  usageStates: Record<string, SessionUsage | null>
  /** 每 session 下每 member 的 usage 快照(群聊用,每成员独立 openclaw session)。 */
  memberUsages: Record<string, Record<string, SessionUsage>>
  /** 投递态:sessionId → anchorMsgId → memberId → DeliveryState。transient,不入 DB,重启清零。 */
  deliveries: Record<string, Record<string, Record<string, DeliveryState>>>
  /**
   * 运行态隐藏:abort 时立即"撤回"刚发出的 user 消息(UI 层过滤,不动 DB)。
   * 若后续收到 agent 回复(abort 太晚),自动清空该 session 的 hidden 集合恢复显示。
   */
  hiddenMessages: Record<string, Set<string>>

  refreshSessions: () => Promise<void>
  refreshMembers: (sessionId: string) => Promise<void>
  refreshMessages: (sessionId: string) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  appendMessage: (msg: ChatMessage) => void
  setPending: (ev: LoopPausedEvent | null) => void
  setLoopStatus: (ev: LoopEvent) => void
  applyStreamDelta: (ev: StreamDeltaEvent) => void
  applyStreamEnd: (ev: StreamEndEvent) => void
  applyError: (ev: ChatErrorEvent) => void
  dismissError: (sessionId: string) => void
  clearUnread: (sessionId: string) => void
  refreshBudget: (sessionId: string) => Promise<void>
  resetBudget: (sessionId: string) => Promise<void>
  refreshUsage: (sessionId: string) => Promise<void>
  refreshMemberUsages: (sessionId: string) => Promise<void>
  applyDelivery: (ev: DeliveryUpdateEvent) => void
  /** abort 后立即把 msgId 加入 session 的 hidden 集合(UI 过滤不渲染)。 */
  hideMessage: (sessionId: string, msgId: string) => void
  /** 清空 session 的 hidden 集合(通常在 agent 回复到来时触发)。 */
  restoreSessionHidden: (sessionId: string) => void
}

export const useChatDataStore = create<ChatDataState>((set) => ({
  sessions: [],
  members: {},
  messages: {},
  pending: null,
  loopStatus: {},
  loopEnded: {},
  streaming: {},
  sessionActivity: {},
  sessionLastText: {},
  unread: {},
  lastError: {},
  budgetStates: {},
  usageStates: {},
  memberUsages: {},
  deliveries: {},
  hiddenMessages: {},

  refreshSessions: async () => {
    const sessions = await window.electron.chat.session.list()
    set((s) => {
      // 初始化 activity：已有值保留，否则 fallback 到 session.updatedAt
      const activity = { ...s.sessionActivity }
      for (const sess of sessions) {
        if (activity[sess.id] === undefined) activity[sess.id] = sess.updatedAt
      }
      return { sessions, sessionActivity: activity }
    })
  },
  deleteSession: async (sessionId) => {
    await window.electron.chat.session.delete(sessionId)
    set((s) => {
      const nextMessages = { ...s.messages }
      delete nextMessages[sessionId]
      const nextMembers = { ...s.members }
      delete nextMembers[sessionId]
      const nextLoopStatus = { ...s.loopStatus }
      delete nextLoopStatus[sessionId]
      const nextActivity = { ...s.sessionActivity }
      delete nextActivity[sessionId]
      const nextLastText = { ...s.sessionLastText }
      delete nextLastText[sessionId]
      const nextUnread = { ...s.unread }
      delete nextUnread[sessionId]
      const nextDeliveries = { ...s.deliveries }
      delete nextDeliveries[sessionId]
      const nextMemberUsages = { ...s.memberUsages }
      delete nextMemberUsages[sessionId]
      const nextHidden = { ...s.hiddenMessages }
      delete nextHidden[sessionId]
      return {
        sessions: s.sessions.filter((x) => x.id !== sessionId),
        messages: nextMessages,
        members: nextMembers,
        loopStatus: nextLoopStatus,
        sessionActivity: nextActivity,
        sessionLastText: nextLastText,
        unread: nextUnread,
        deliveries: nextDeliveries,
        memberUsages: nextMemberUsages,
        hiddenMessages: nextHidden,
        pending: s.pending?.sessionId === sessionId ? null : s.pending,
      }
    })
  },
  refreshMembers: async (sessionId) => {
    const members = await window.electron.chat.member.list(sessionId)
    set((s) => ({ members: { ...s.members, [sessionId]: members } }))
  },
  refreshMessages: async (sessionId) => {
    const messages = await window.electron.chat.message.list(sessionId)
    set((s) => {
      const last = messages[messages.length - 1]
      const nextActivity = { ...s.sessionActivity }
      const nextLastText = { ...s.sessionLastText }
      if (last) {
        nextActivity[sessionId] = last.createdAtLocal
        nextLastText[sessionId] = extractPreview(last)
      }
      return {
        messages: { ...s.messages, [sessionId]: messages },
        sessionActivity: nextActivity,
        sessionLastText: nextLastText,
      }
    })
  },
  appendMessage: (msg) => {
    const currentId = useChatUiStore.getState().currentSessionId
    set((s) => {
      const next: Partial<ChatDataState> = {
        messages: { ...s.messages, [msg.sessionId]: [...(s.messages[msg.sessionId] ?? []), msg] },
        sessionActivity: { ...s.sessionActivity, [msg.sessionId]: msg.createdAtLocal },
        sessionLastText: { ...s.sessionLastText, [msg.sessionId]: extractPreview(msg) },
      }
      // 非当前 session + 非 user 自己发的 → 未读 +1
      if (msg.sessionId !== currentId && msg.senderType !== "user") {
        next.unread = { ...s.unread, [msg.sessionId]: (s.unread[msg.sessionId] ?? 0) + 1 }
      }
      // abort 后若 agent 仍然回了(abort 太晚),自动恢复该 session 所有被隐藏的 user msg
      if (msg.senderType === "agent" && s.hiddenMessages[msg.sessionId]?.size) {
        const nextHidden = { ...s.hiddenMessages }
        delete nextHidden[msg.sessionId]
        next.hiddenMessages = nextHidden
      }
      return next
    })
  },
  hideMessage: (sessionId, msgId) =>
    set((s) => {
      const prev = s.hiddenMessages[sessionId] ?? new Set<string>()
      const nextSet = new Set(prev)
      nextSet.add(msgId)
      return { hiddenMessages: { ...s.hiddenMessages, [sessionId]: nextSet } }
    }),
  restoreSessionHidden: (sessionId) =>
    set((s) => {
      if (!s.hiddenMessages[sessionId]) return {}
      const next = { ...s.hiddenMessages }
      delete next[sessionId]
      return { hiddenMessages: next }
    }),
  clearUnread: (sessionId) =>
    set((s) => {
      if (!s.unread[sessionId]) return {}
      const next = { ...s.unread }
      delete next[sessionId]
      return { unread: next }
    }),
  applyError: (ev) =>
    set((s) => ({
      lastError: {
        ...s.lastError,
        [ev.sessionId]: {
          text: ev.message,
          ts: Date.now(),
          openclawSessionKey: ev.openclawSessionKey,
          idempotencyKey: ev.idempotencyKey,
          kind: ev.kind,
        },
      },
    })),
  dismissError: (sessionId) =>
    set((s) => {
      if (!s.lastError[sessionId]) return {}
      const next = { ...s.lastError }
      delete next[sessionId]
      return { lastError: next }
    }),
  refreshBudget: async (sessionId) => {
    const state = await window.electron.chat.budget.get(sessionId)
    set((s) => ({ budgetStates: { ...s.budgetStates, [sessionId]: state } }))
  },
  resetBudget: async (sessionId) => {
    await window.electron.chat.budget.reset(sessionId)
    const state = await window.electron.chat.budget.get(sessionId)
    set((s) => ({ budgetStates: { ...s.budgetStates, [sessionId]: state } }))
  },
  refreshUsage: async (sessionId) => {
    const state = await window.electron.chat.usage.get(sessionId)
    set((s) => ({ usageStates: { ...s.usageStates, [sessionId]: state } }))
  },
  refreshMemberUsages: async (sessionId) => {
    const map = await window.electron.chat.usage.getMembers(sessionId)
    set((s) => ({ memberUsages: { ...s.memberUsages, [sessionId]: map } }))
  },
  applyDelivery: (ev) =>
    set((s) => {
      const sessionBucket = s.deliveries[ev.sessionId] ?? {}
      const anchorBucket = sessionBucket[ev.anchorMsgId] ?? {}
      const prev = anchorBucket[ev.memberId]
      // 终态锁定:done/error/aborted 后忽略后续事件,防乱序覆盖
      if (prev && TERMINAL_STATUSES.has(prev.status)) return {}
      const nextMember: DeliveryState = { status: ev.status, errorMsg: ev.errorMsg, toolName: ev.toolName, at: ev.at }
      return {
        deliveries: {
          ...s.deliveries,
          [ev.sessionId]: {
            ...sessionBucket,
            [ev.anchorMsgId]: { ...anchorBucket, [ev.memberId]: nextMember },
          },
        },
      }
    }),
  setPending: (ev) => set({ pending: ev }),
  setLoopStatus: (ev) =>
    set((s) => {
      const next: Partial<ChatDataState> = { loopStatus: { ...s.loopStatus, [ev.sessionId]: ev.kind } }
      if (ev.kind === "ended") {
        const prev = s.loopEnded[ev.sessionId]
        next.loopEnded = { ...s.loopEnded, [ev.sessionId]: { reason: ev.reason, seq: (prev?.seq ?? 0) + 1 } }
      }
      return next
    }),
  applyStreamDelta: (ev) =>
    set((s) => {
      const perSession = s.streaming[ev.sessionId] ?? {}
      const prev = perSession[ev.idempotencyKey]
      // openclaw delta 为"累积后的完整文本"（overwrite 模式）；executor 又 += ev.content
      // 这里 UI 需要的是"当前所见内容"。executor 的 buffer 语义：delta 给 overwrite 的新全文。
      // renderer 只展示最新一次 delta 的 content 即可（openclaw 保证 delta 是覆盖模式）
      return {
        streaming: {
          ...s.streaming,
          [ev.sessionId]: {
            ...perSession,
            [ev.idempotencyKey]: {
              content: ev.content,
              startedAt: prev?.startedAt ?? Date.now(),
              openclawSessionKey: ev.openclawSessionKey,
            },
          },
        },
      }
    }),
  applyStreamEnd: (ev) =>
    set((s) => {
      const perSession = s.streaming[ev.sessionId]
      if (!perSession) return {}
      const next = { ...perSession }
      delete next[ev.idempotencyKey]
      const streaming = { ...s.streaming }
      if (Object.keys(next).length === 0) delete streaming[ev.sessionId]
      else streaming[ev.sessionId] = next
      return { streaming }
    }),
}))

/** 挂 IPC 事件监听（在 App 启动时调用一次）。返回 unsubscribe。 */
export function attachChatListeners(): () => void {
  const store = useChatDataStore.getState()
  const offMessage = window.electron.chat.on.message((msg) => store.appendMessage(msg))
  const offRefresh = window.electron.chat.on.messagesRefresh((ev) => void store.refreshMessages(ev.sessionId))
  const offLoop = window.electron.chat.on.loop((ev) => store.setLoopStatus(ev))
  const offPaused = window.electron.chat.on.paused((ev) => store.setPending(ev))
  const offStreamDelta = window.electron.chat.on.streamDelta((ev) => store.applyStreamDelta(ev))
  const offStreamEnd = window.electron.chat.on.streamEnd((ev) => store.applyStreamEnd(ev))
  const offError = window.electron.chat.on.error((ev) => store.applyError(ev))
  const offDelivery = window.electron.chat.on.delivery((ev) => store.applyDelivery(ev))
  return () => {
    offMessage()
    offRefresh()
    offLoop()
    offPaused()
    offStreamDelta()
    offStreamEnd()
    offError()
    offDelivery()
  }
}
