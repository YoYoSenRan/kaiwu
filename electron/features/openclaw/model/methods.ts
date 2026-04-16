/**
 * models.* RPC 便捷包装。
 *
 * 与 agent/methods.ts 同模式:纯函数 + 显式 gateway 参数,新增 RPC 不改 gateway 层。
 */

import type { GatewayClient } from "../gateway/client"
import type { ModelsListResult } from "./contract"

/** 获取可选模型清单。入参为空对象。 */
export function list(gateway: GatewayClient): Promise<ModelsListResult> {
  return gateway.call<ModelsListResult>("models.list")
}
