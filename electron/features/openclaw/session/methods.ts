/**
 * sessions.* RPC 便捷包装。
 *
 * 与 agent/methods.ts 同模式：纯函数 + 显式 caller 参数，新增 RPC 不改 gateway 层。
 */

import type { GatewayCaller } from "../gateway/caller"
import type { SessionCreateParams, SessionListParams, SessionPatchParams, SessionDeleteParams } from "../gateway/contract"

/** 创建新会话。 */
export function sessionCreate(caller: GatewayCaller, params: SessionCreateParams): Promise<unknown> {
  return caller.call("sessions.create", params)
}

/** 列出会话。 */
export function sessionList(caller: GatewayCaller, params?: SessionListParams): Promise<unknown> {
  return caller.call("sessions.list", params)
}

/** 修改会话属性（label / model / thinkingLevel）。 */
export function sessionPatch(caller: GatewayCaller, params: SessionPatchParams): Promise<unknown> {
  return caller.call("sessions.patch", params)
}

/** 删除会话。 */
export function sessionDelete(caller: GatewayCaller, params: SessionDeleteParams): Promise<unknown> {
  return caller.call("sessions.delete", params)
}
