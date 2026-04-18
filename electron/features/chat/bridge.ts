import { createBridge } from "../../app/bridge"
import type { ChatBridge, ChatEvents } from "./types"

const bridge = createBridge<ChatEvents>("chat")

export const chat: ChatBridge = {
  session: {
    list: () => bridge.invoke("session:list"),
    create: (input) => bridge.invoke("session:create", input),
    delete: (id) => bridge.invoke("session:delete", id),
    archive: (id, archived) => bridge.invoke("session:archive", id, archived),
    reconcile: (id) => bridge.invoke("session:reconcile", id),
  },
  message: {
    list: (sessionId) => bridge.invoke("message:list", sessionId),
    send: (sessionId, content) => bridge.invoke("message:send", sessionId, content),
    answer: (sessionId, input) => bridge.invoke("message:answer", sessionId, input),
    abort: (sessionId) => bridge.invoke("message:abort", sessionId),
  },
  member: {
    list: (sessionId) => bridge.invoke("member:list", sessionId),
    add: (sessionId, input) => bridge.invoke("member:add", sessionId, input),
    remove: (sessionId, memberId) => bridge.invoke("member:remove", sessionId, memberId),
    patch: (sessionId, memberId, patch) => bridge.invoke("member:patch", sessionId, memberId, patch),
  },
  budget: {
    get: (sessionId) => bridge.invoke("budget:get", sessionId),
    reset: (sessionId) => bridge.invoke("budget:reset", sessionId),
  },
  on: {
    message: (l) => bridge.on("message:new", l),
    messagesRefresh: (l) => bridge.on("messages:refresh", l),
    loop: (l) => bridge.on("loop:event", l),
    paused: (l) => bridge.on("loop:paused", l),
    streamDelta: (l) => bridge.on("stream:delta", l),
    streamEnd: (l) => bridge.on("stream:end", l),
  },
}
