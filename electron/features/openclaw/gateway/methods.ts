/**
 * Gateway RPC 高层 API 薄封装。
 *
 * 每个方法对应一个 gateway RPC method，只做参数组装和类型标注，
 * 不含业务逻辑。实际的连接管理和帧处理在 client.ts 中。
 */

import type { GatewayClient } from "./client"
import type { ChatAbortParams, ChatSendParams, SessionCreateParams, SessionDeleteParams, SessionListParams, SessionPatchParams } from "./contract"

/** 绑定到一个 GatewayClient 实例的 RPC 方法集。 */
export interface GatewayMethods {
  chatSend: (params: ChatSendParams) => Promise<unknown>
  chatAbort: (params: ChatAbortParams) => Promise<unknown>
  sessionCreate: (params: SessionCreateParams) => Promise<unknown>
  sessionList: (params?: SessionListParams) => Promise<unknown>
  sessionPatch: (params: SessionPatchParams) => Promise<unknown>
  sessionDelete: (params: SessionDeleteParams) => Promise<unknown>
}

/**
 * 创建绑定到指定 client 的 RPC 方法集。
 * @param client gateway RPC 客户端
 */
export function createGatewayMethods(client: GatewayClient): GatewayMethods {
  return {
    chatSend: (params) => client.call("chat.send", params),
    chatAbort: (params) => client.call("chat.abort", params),
    sessionCreate: (params) => client.call("sessions.create", params),
    sessionList: (params) => client.call("sessions.list", params),
    sessionPatch: (params) => client.call("sessions.patch", params),
    sessionDelete: (params) => client.call("sessions.delete", params),
  }
}
