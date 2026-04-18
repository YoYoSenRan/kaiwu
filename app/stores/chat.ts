import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ChatMessage, ChatMember, ChatSession, LoopEvent, LoopPausedEvent, StreamDeltaEvent, StreamEndEvent } from "../../electron/features/chat/types"

/** 单条流式 buffer：当前 session 的某个 idempotencyKey 的累积内容。 */
export interface StreamBuffer {
  content: string
  startedAt: number
}

/**
 * chat 前端 store。
 *
 * 持久化的是 UI 偏好（currentSessionId）；会话数据走主进程 IPC 实时拉取，不缓存。
 */

interface ChatUiState {
  currentSessionId: string | null
  setCurrent: (id: string | null) => void
}

export const useChatUiStore = create<ChatUiState>()(
  persist(
    (set) => ({
      currentSessionId: null,
      setCurrent: (id) => set({ currentSessionId: id }),
    }),
    { name: "chat-ui", version: 1 },
  ),
)

// ---------- data cache ----------

interface ChatDataState {
  sessions: ChatSession[]
  members: Record<string, ChatMember[]>
  messages: Record<string, ChatMessage[]>
  pending: LoopPausedEvent | null
  loopStatus: Record<string, LoopEvent["kind"]>
  /** 流式 buffer：sessionId → idempotencyKey → content。UI 渲染时把这里的 buffer 作为末尾临时气泡。 */
  streaming: Record<string, Record<string, StreamBuffer>>

  refreshSessions: () => Promise<void>
  refreshMembers: (sessionId: string) => Promise<void>
  refreshMessages: (sessionId: string) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  appendMessage: (msg: ChatMessage) => void
  setPending: (ev: LoopPausedEvent | null) => void
  setLoopStatus: (ev: LoopEvent) => void
  applyStreamDelta: (ev: StreamDeltaEvent) => void
  applyStreamEnd: (ev: StreamEndEvent) => void
}

export const useChatDataStore = create<ChatDataState>((set) => ({
  sessions: [],
  members: {},
  messages: {},
  pending: null,
  loopStatus: {},
  streaming: {},

  refreshSessions: async () => {
    const sessions = await window.electron.chat.session.list()
    set({ sessions })
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
      return {
        sessions: s.sessions.filter((x) => x.id !== sessionId),
        messages: nextMessages,
        members: nextMembers,
        loopStatus: nextLoopStatus,
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
    set((s) => ({ messages: { ...s.messages, [sessionId]: messages } }))
  },
  appendMessage: (msg) => {
    set((s) => ({
      messages: { ...s.messages, [msg.sessionId]: [...(s.messages[msg.sessionId] ?? []), msg] },
    }))
  },
  setPending: (ev) => set({ pending: ev }),
  setLoopStatus: (ev) => set((s) => ({ loopStatus: { ...s.loopStatus, [ev.sessionId]: ev.kind } })),
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
            [ev.idempotencyKey]: { content: ev.content, startedAt: prev?.startedAt ?? Date.now() },
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
  return () => {
    offMessage()
    offRefresh()
    offLoop()
    offPaused()
    offStreamDelta()
    offStreamEnd()
  }
}
