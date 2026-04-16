/**
 * sessions.* RPC 便捷包装。
 *
 * 与 agent/methods.ts 同模式：纯函数 + 显式 gateway 参数，新增 RPC 不改 gateway 层。
 */

import type { GatewayClient } from "../gateway/client"
import type { SessionCreateParams, SessionListParams, SessionPatchParams, SessionDeleteParams } from "./contract"

/** 创建新会话。 */
export function create(gateway: GatewayClient, params: SessionCreateParams): Promise<unknown> {
  return gateway.call("sessions.create", params)
}

/** 列出会话。 */
export function list(gateway: GatewayClient, params?: SessionListParams): Promise<unknown> {
  return gateway.call("sessions.list", params)
}

/** 修改会话属性（label / model / thinkingLevel）。 */
export function update(gateway: GatewayClient, params: SessionPatchParams): Promise<unknown> {
  return gateway.call("sessions.patch", params)
}

/** 删除会话。 */
export function remove(gateway: GatewayClient, params: SessionDeleteParams): Promise<unknown> {
  return gateway.call("sessions.delete", params)
}
