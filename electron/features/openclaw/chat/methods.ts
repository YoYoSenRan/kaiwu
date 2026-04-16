/**
 * chat.* RPC 便捷包装。
 *
 * 与 agent/methods.ts 同模式：纯函数 + 显式 gateway 参数，新增 RPC 不改 gateway 层。
 */

import type { GatewayClient } from "../gateway/client"
import type { ChatSendParams, ChatAbortParams, ChatHistoryParams, ChatHistoryMessage } from "./contract"

/** 发送消息并触发 AI 回复。流式事件通过 gateway event 帧推送。 */
export function send(gateway: GatewayClient, params: ChatSendParams): Promise<unknown> {
  return gateway.call("chat.send", params)
}

/** 中止正在进行的 AI 回复。 */
export function abort(gateway: GatewayClient, params: ChatAbortParams): Promise<unknown> {
  return gateway.call("chat.abort", params)
}

/** 获取会话历史消息。 */
export function getHistory(gateway: GatewayClient, params: ChatHistoryParams): Promise<ChatHistoryMessage[]> {
  return gateway.call<ChatHistoryMessage[]>("chat.history", params)
}
