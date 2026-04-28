import type { ChatAbortParams, ChatHistoryMessage, ChatHistoryParams, ChatSendParams } from "../contracts/rpc"
import { domain } from "../kernel/registry"

/** chat.* RPC 转发。流式 chunk 走 gateway event 帧推送,不在 response 里返回。 */
export const chat = domain({
  namespace: "openclaw.chat",
  methods: {
    send: (gw, params: ChatSendParams) => gw.call("chat.send", params),
    abort: (gw, params: ChatAbortParams) => gw.call("chat.abort", params),
    history: (gw, params: ChatHistoryParams) => gw.call<ChatHistoryMessage[]>("chat.history", params),
  },
})
