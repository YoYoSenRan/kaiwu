/**
 * chat.* RPC 便捷包装。
 *
 * 与 agent/methods.ts 同模式：纯函数 + 显式 caller 参数，新增 RPC 不改 gateway 层。
 */

import type { GatewayCaller } from "../gateway/caller"
import type { ChatSendParams, ChatAbortParams, ChatHistoryParams, ChatHistoryMessage } from "../gateway/contract"

/** 发送消息并触发 AI 回复。流式事件通过 gateway event 帧推送。 */
export function chatSend(caller: GatewayCaller, params: ChatSendParams): Promise<unknown> {
  return caller.call("chat.send", params)
}

/** 中止正在进行的 AI 回复。 */
export function chatAbort(caller: GatewayCaller, params: ChatAbortParams): Promise<unknown> {
  return caller.call("chat.abort", params)
}

/** 获取会话历史消息。 */
export function chatHistory(caller: GatewayCaller, params: ChatHistoryParams): Promise<ChatHistoryMessage[]> {
  return caller.call("chat.history", params) as Promise<ChatHistoryMessage[]>
}
