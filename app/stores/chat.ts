import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ChatMessage, ChatMember, ChatSession, LoopEvent, LoopPausedEvent } from "../../electron/features/chat/types"

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

  refreshSessions: () => Promise<void>
  refreshMembers: (sessionId: string) => Promise<void>
  refreshMessages: (sessionId: string) => Promise<void>
  appendMessage: (msg: ChatMessage) => void
  setPending: (ev: LoopPausedEvent | null) => void
  setLoopStatus: (ev: LoopEvent) => void
}

export const useChatDataStore = create<ChatDataState>((set) => ({
  sessions: [],
  members: {},
  messages: {},
  pending: null,
  loopStatus: {},

  refreshSessions: async () => {
    const sessions = await window.electron.chat.session.list()
    set({ sessions })
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
}))

/** 挂 IPC 事件监听（在 App 启动时调用一次）。返回 unsubscribe。 */
export function attachChatListeners(): () => void {
  const store = useChatDataStore.getState()
  const offMessage = window.electron.chat.on.message((msg) => store.appendMessage(msg))
  const offLoop = window.electron.chat.on.loop((ev) => store.setLoopStatus(ev))
  const offPaused = window.electron.chat.on.paused((ev) => store.setPending(ev))
  return () => {
    offMessage()
    offLoop()
    offPaused()
  }
}
