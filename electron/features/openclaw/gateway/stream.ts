/**
 * ChatEvent 流式事件分发器。
 *
 * gateway 通过 event 帧推送 chat.event，本模块按 sessionKey 将事件
 * 分发到对应的 listener，支持一个 session 多个订阅者。
 * 同时提供 onAny 接口供全局监控使用。
 */

import type { EventFrame, ChatEvent } from "./contract"
import type { GatewayClient } from "./client"

type ChatEventListener = (event: ChatEvent) => void

export interface ChatEventStream {
  /** 订阅指定 session 的 ChatEvent，返回取消函数。 */
  subscribe: (sessionKey: string, listener: ChatEventListener) => () => void
  /** 订阅所有 session 的 ChatEvent（调试/监控用），返回取消函数。 */
  onAny: (listener: ChatEventListener) => () => void
  /** 释放所有订阅和内部 listener。 */
  dispose: () => void
}

/**
 * 从 GatewayClient 的事件流中提取 chat.event，按 sessionKey 分发。
 * @param client gateway RPC 客户端
 */
export function createChatEventStream(client: GatewayClient): ChatEventStream {
  const bySession = new Map<string, Set<ChatEventListener>>()
  const anyListeners = new Set<ChatEventListener>()

  // 只监听 chat.event 事件帧
  const unsubClient = client.onEvent((frame: EventFrame) => {
    if (frame.event !== "chat.event") return
    const chatEvent = frame.payload as ChatEvent | undefined
    if (!chatEvent?.sessionKey) return

    // 按 sessionKey 分发
    const listeners = bySession.get(chatEvent.sessionKey)
    if (listeners) {
      for (const fn of listeners) fn(chatEvent)
    }

    // 全局监听
    for (const fn of anyListeners) fn(chatEvent)
  })

  return {
    subscribe(sessionKey, listener) {
      let set = bySession.get(sessionKey)
      if (!set) {
        set = new Set()
        bySession.set(sessionKey, set)
      }
      set.add(listener)
      return () => {
        set!.delete(listener)
        if (set!.size === 0) bySession.delete(sessionKey)
      }
    },

    onAny(listener) {
      anyListeners.add(listener)
      return () => anyListeners.delete(listener)
    },

    dispose() {
      unsubClient()
      bySession.clear()
      anyListeners.clear()
    },
  }
}
