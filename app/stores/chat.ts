import { create } from "zustand"
import type { ChatInvocationRow, ChatMemberRow, ChatMessageRow, ChatRoundtableEvent, ChatRow, ChatStreamEvent } from "@/types/chat"

interface ChatState {
  chats: ChatRow[]
  activeId: string | null
  loading: boolean
  messages: ChatMessageRow[]
  members: ChatMemberRow[]
  invocations: ChatInvocationRow[]
  sending: boolean
  streamingChatId: string | null
  streamingAgentId: string | null
  streamingMessageId: string | null
  streamingContent: string
  roundtableStatus: "idle" | "running" | "paused"
  currentRound: number
  currentSpeaker: string | null
  setChats: (chats: ChatRow[]) => void
  setActiveId: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setSending: (sending: boolean) => void
  setMessages: (messages: ChatMessageRow[]) => void
  setMembers: (members: ChatMemberRow[]) => void
  setInvocations: (invocations: ChatInvocationRow[]) => void
  appendMessage: (message: ChatMessageRow) => void
  handleStreamEvent: (event: ChatStreamEvent) => void
  handleRoundtableEvent: (event: ChatRoundtableEvent) => void
  reset: () => void
}

/**
 * 对话状态 store。不 persist——对话数据由 sqlite 托管，
 * zustand 只做内存缓存，重启后重新拉取（参考 persistence.md）。
 */
export const useChatStore = create<ChatState>()((set) => ({
  chats: [],
  activeId: null,
  loading: false,
  messages: [],
  members: [],
  invocations: [],
  sending: false,
  streamingChatId: null,
  streamingAgentId: null,
  streamingMessageId: null,
  streamingContent: "",
  roundtableStatus: "idle" as const,
  currentRound: 0,
  currentSpeaker: null,

  setChats: (chats) => set({ chats }),
  setActiveId: (id) => set({ activeId: id }),
  setLoading: (loading) => set({ loading }),
  setSending: (sending) => set({ sending }),
  setMessages: (messages) => set({ messages }),
  setMembers: (members) => set({ members }),
  setInvocations: (invocations) => set({ invocations }),
  appendMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),

  handleStreamEvent: (event) =>
    set(() => {
      if (event.type === "delta") {
        // OpenClaw 的 delta 是完整累积文本（mergedText），不是增量片段，直接替换
        return {
          sending: false,
          streamingChatId: event.chatId,
          streamingAgentId: event.agentId,
          streamingMessageId: event.messageId,
          streamingContent: event.content ?? "",
        }
      }
      // final 或 error 都清空所有进行中状态
      return { sending: false, streamingChatId: null, streamingAgentId: null, streamingMessageId: null, streamingContent: "" }
    }),

  handleRoundtableEvent: (event) =>
    set(() => {
      switch (event.type) {
        case "round-start":
          return { roundtableStatus: "running" as const, currentRound: event.round ?? 0 }
        case "turn-start":
          return { currentSpeaker: event.agentId ?? null }
        case "turn-end":
          return { currentSpeaker: null }
        case "stopped":
          return { roundtableStatus: "idle" as const, currentSpeaker: null }
        case "paused":
          return { roundtableStatus: "paused" as const }
        case "resumed":
          return { roundtableStatus: "running" as const }
        default:
          return {}
      }
    }),

  reset: () =>
    set({
      messages: [],
      members: [],
      invocations: [],
      sending: false,
      streamingChatId: null,
      streamingAgentId: null,
      streamingMessageId: null,
      streamingContent: "",
      roundtableStatus: "idle" as const,
      currentRound: 0,
      currentSpeaker: null,
    }),
}))
