/**
 * 聊天消息处理器。
 *
 * 职责：
 * 1. 接收 renderer 的发送请求，走 gateway RPC chat.send
 * 2. 订阅 ChatEvent 流式事件，转为 ChatStreamChunk 推给 renderer
 * 3. 更新 session manager 的活跃状态
 *
 * 不直接注册 IPC handler——由顶层 ipc.ts 调用本模块的函数。
 */

import log from "../../../core/logger"
import { getMainWindow } from "../../../core/window"
import type { GatewayMethods } from "../gateway/methods"
import type { ChatEventStream } from "../gateway/stream"
import type { ChatEvent } from "../gateway/contract"
import { touchSession, updateSessionStatus } from "../session/manager"
import type { ChatSendRequest, ChatStreamChunk } from "./contract"

/** 推 ChatStreamChunk 到 renderer 的 IPC 通道名。 */
const CHAT_STREAM_CHANNEL = "openclaw:chat:stream"

/**
 * 发送消息并自动订阅流式响应。
 * @param request 发送请求
 * @param rpc gateway RPC 方法集
 * @param stream chat 事件流
 */
export async function sendMessage(request: ChatSendRequest, rpc: GatewayMethods, stream: ChatEventStream): Promise<{ ok: boolean; error?: string }> {
  const { sessionKey, message, thinking } = request
  try {
    updateSessionStatus(sessionKey, "active")

    const result = (await rpc.chatSend({ sessionKey, message, thinking })) as { runId?: string } | undefined
    const runId = result?.runId
    if (runId) updateSessionStatus(sessionKey, "active", { lastRunId: runId })

    // 订阅流式响应，直到 final/error/aborted
    subscribeUntilDone(sessionKey, stream)

    return { ok: true }
  } catch (err) {
    const error = (err as Error).message
    log.error(`[chat] send failed: ${error}`)
    updateSessionStatus(sessionKey, "error", { error })
    return { ok: false, error }
  }
}

/**
 * 订阅 ChatEvent 直到会话完成，期间将每个事件转为 ChatStreamChunk 推给 renderer。
 * @param sessionKey 目标会话
 * @param stream chat 事件流
 */
function subscribeUntilDone(sessionKey: string, stream: ChatEventStream): void {
  const unsub = stream.subscribe(sessionKey, (event: ChatEvent) => {
    touchSession(sessionKey)
    pushStreamChunk(toChunk(event))

    // 终态时取消订阅
    if (event.state === "final" || event.state === "error" || event.state === "aborted") {
      unsub()
    }
  })
}

/** 将 gateway 的 ChatEvent 转为 kaiwu 的 ChatStreamChunk。 */
function toChunk(event: ChatEvent): ChatStreamChunk {
  return {
    sessionKey: event.sessionKey,
    runId: event.runId,
    state: event.state,
    text: event.state === "delta" ? event.message : undefined,
    error: event.state === "error" ? event.errorMessage : undefined,
    usage: event.state === "final" ? event.usage : undefined,
  }
}

/** 推 chunk 到 renderer。 */
function pushStreamChunk(chunk: ChatStreamChunk): void {
  const win = getMainWindow()
  if (!win) return
  win.webContents.send(CHAT_STREAM_CHANNEL, chunk)
}
