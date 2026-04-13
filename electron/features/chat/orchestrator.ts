import type { EngineRuntime } from "../../engine/runner"
import type { OrchestratorCallbacks, ChatSendInput } from "./types"
import { handleSendMessage, handleSyncChat } from "./turn"
import { handleStartRoundtable, handlePause, handleResume, handleStop } from "./roundtable"

/** 编排器公开接口，供 IPC 层调用。 */
export interface ChatOrchestrator {
  sendMessage(input: ChatSendInput): Promise<void>
  startRoundtable(chatId: string, topic: string): Promise<void>
  pauseRoundtable(chatId: string): void
  resumeRoundtable(chatId: string): void
  stopRoundtable(chatId: string): void
  abort(chatId: string): void
  /** 与 OpenClaw 对账：拉取远程历史，补录本地缺失的消息。 */
  syncChat(chatId: string): Promise<number>
}

type PauseHandle = { promise: Promise<void>; resolve: () => void }

/**
 * 创建对话编排器实例。
 * @param runtime engine 运行时依赖
 * @param callbacks 事件推送回调
 */
export function createOrchestrator(runtime: EngineRuntime, callbacks: OrchestratorCallbacks): ChatOrchestrator {
  const activeControllers = new Map<string, AbortController>()
  const pausePromises = new Map<string, PauseHandle>()

  return {
    sendMessage: (input) => handleSendMessage(runtime, callbacks, activeControllers, input),
    startRoundtable: (chatId, topic) => handleStartRoundtable(runtime, callbacks, activeControllers, pausePromises, chatId, topic),
    pauseRoundtable: (chatId) => handlePause(callbacks, pausePromises, chatId),
    resumeRoundtable: (chatId) => handleResume(callbacks, pausePromises, chatId),
    stopRoundtable: (chatId) => handleStop(activeControllers, pausePromises, chatId),
    abort: (chatId) => handleStop(activeControllers, pausePromises, chatId),
    syncChat: (chatId) => handleSyncChat(runtime, chatId),
  }
}
