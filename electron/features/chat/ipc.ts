import { safeHandle } from "../../core/ipc"
import { getMainWindow } from "../../core/window"
import { chatChannels } from "./channels"
import { createOrchestrator } from "./orchestrator"
import { requireCaller, requireEmitter } from "../../openclaw/core/connection"
import { invokePlugin } from "../../openclaw/core/lifecycle"
import { listChats, createChat, deleteChat, getChat, updateChatConfig, listMessages, listMembers, addMember, removeMember, listInvocations } from "./crud"
import type { EngineRuntime } from "../../engine/runner"
import type { ChatCreateInput, ChatMemberAddInput, ChatSendInput, ChatStreamEvent, ChatRoundtableEvent } from "./types"
import type { ChatEvent } from "../../openclaw/gateway/contract"

/** 构建 engine 运行时，桥接 gateway caller/emitter 和插件 invoke。 */
function buildRuntime(): EngineRuntime {
  return {
    async chatHistory(sessionKey, limit) {
      const result = await requireCaller().call("chat.history", { sessionKey, limit })
      const payload = result as { messages?: unknown[] }
      return (payload.messages ?? []) as Array<{ role: string; content: unknown; timestamp?: number; [k: string]: unknown }>
    },
    async sessionCreate(agentId, label) {
      const result = await requireCaller().call("sessions.create", { agentId, label })
      const payload = result as Record<string, unknown>
      const sessionKey = (payload.key as string) ?? (payload.sessionKey as string) ?? ""
      return { sessionKey }
    },
    async chatSend(sessionKey, message) {
      const result = await requireCaller().call("chat.send", { sessionKey, message, idempotencyKey: crypto.randomUUID() })
      const payload = result as Record<string, unknown>
      return { runId: (payload.runId as string) ?? "" }
    },
    async chatAbort(sessionKey, runId) {
      await requireCaller().call("chat.abort", { sessionKey, runId })
    },
    onChatEvent(sessionKey, listener) {
      return requireEmitter().subscribe("chat", sessionKey, (payload) => {
        const event = payload as ChatEvent
        listener({
          runId: event.runId,
          state: event.state,
          message: event.message,
          errorMessage: event.errorMessage,
          raw: payload,
        })
      })
    },
    onAgentEvent(sessionKey, listener) {
      return requireEmitter().subscribe("agent", sessionKey, (payload) => {
        const evt = payload as { stream?: string; data?: Record<string, unknown> }
        listener({ stream: evt.stream ?? "", data: evt.data })
      })
    },
    async pushStageContext(sessionKey, ctx) {
      await invokePlugin({
        action: "stage.set",
        params: { sessionKey, instruction: ctx.instruction, knowledge: ctx.knowledge, sharedHistory: ctx.sharedHistory },
      })
    },
    async clearStageContext(sessionKey) {
      await invokePlugin({ action: "stage.clear", params: { sessionKey } })
    },
  }
}

/** 向渲染进程推送事件。 */
function pushToRenderer(channel: string, payload: unknown): void {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, payload)
  }
}

/**
 * 注册 chat feature 的所有 IPC handler。
 * 在 app.whenReady() 之后、渲染进程首次调用之前执行。
 */
export function setupChat(): void {
  const runtime = buildRuntime()
  const orchestrator = createOrchestrator(runtime, {
    onTool: (event) => pushToRenderer(chatChannels.event.tool, event),
    onStream: (event: ChatStreamEvent) => pushToRenderer(chatChannels.event.stream, event),
    onRoundtable: (event: ChatRoundtableEvent) => pushToRenderer(chatChannels.event.roundtable, event),
  })

  // --- 对话 CRUD ---
  safeHandle(chatChannels.list, () => listChats())
  safeHandle(chatChannels.sync, (chatId) => orchestrator.syncChat(chatId as string))
  safeHandle(chatChannels.create, (input) => createChat(input as ChatCreateInput))
  safeHandle(chatChannels.delete, (id) => deleteChat(id as string))
  safeHandle(chatChannels.detail, (id) => getChat(id as string))
  safeHandle(chatChannels.config, (id, config) => updateChatConfig(id as string, config as Record<string, unknown>))

  // --- 消息 ---
  safeHandle(chatChannels.messages.list, (chatId) => listMessages(chatId as string))
  safeHandle(chatChannels.messages.send, (input) => orchestrator.sendMessage(input as ChatSendInput))

  // --- 成员 ---
  safeHandle(chatChannels.members.list, (chatId) => listMembers(chatId as string))
  safeHandle(chatChannels.members.add, (input) => addMember(input as ChatMemberAddInput))
  safeHandle(chatChannels.members.remove, (chatId, agentId) => removeMember(chatId as string, agentId as string))

  // --- 调用记录 ---
  safeHandle(chatChannels.invocations.list, (chatId) => listInvocations(chatId as string))

  // --- 圆桌讨论 ---
  safeHandle(chatChannels.roundtable.start, (chatId, topic) => orchestrator.startRoundtable(chatId as string, topic as string))
  safeHandle(chatChannels.roundtable.pause, (chatId) => orchestrator.pauseRoundtable(chatId as string))
  safeHandle(chatChannels.roundtable.resume, (chatId) => orchestrator.resumeRoundtable(chatId as string))
  safeHandle(chatChannels.roundtable.stop, (chatId) => orchestrator.stopRoundtable(chatId as string))

  // --- 中断 ---
  safeHandle(chatChannels.abort, (chatId) => orchestrator.abort(chatId as string))
}
