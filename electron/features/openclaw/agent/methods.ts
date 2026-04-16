/**
 * openclaw agents.* RPC 便捷包装。
 *
 * 用纯函数 + 显式 gateway 参数的形式，新增 RPC 不需要改 gateway 层代码（开闭原则）。
 * 调用端:`list(gateway)`。
 *
 * models.list 在 model/methods.ts。
 */

import type { GatewayClient } from "../gateway/client"
import type { AgentsListResult, AgentsCreateParams, AgentsCreateResult, AgentsDeleteParams, AgentsDeleteResult, AgentsUpdateParams, AgentsUpdateResult } from "./contract"

/** 列出所有 agent（包含 defaultId / mainKey / scope 元信息）。 */
export function list(gateway: GatewayClient): Promise<AgentsListResult> {
  return gateway.call<AgentsListResult>("agents.list")
}

/**
 * 创建 agent。gateway 会同步写 workspace 下 7 个 bootstrap md 文件。
 * 非原子：任一步失败可能留半截磁盘文件，调用方需自己回滚。
 */
export function create(gateway: GatewayClient, params: AgentsCreateParams): Promise<AgentsCreateResult> {
  return gateway.call<AgentsCreateResult>("agents.create", params)
}

/**
 * 更新 agent。只支持 name / workspace / model / avatar 四个字段。
 * 改 model 时传 `"provider/model-id"` 字符串，不要传对象。
 */
export function update(gateway: GatewayClient, params: AgentsUpdateParams): Promise<AgentsUpdateResult> {
  return gateway.call<AgentsUpdateResult>("agents.update", params)
}

/**
 * 删除 agent。deleteFiles 默认 true（gateway 侧默认），调用方想保留磁盘需显式传 false。
 */
export function remove(gateway: GatewayClient, params: AgentsDeleteParams): Promise<AgentsDeleteResult> {
  return gateway.call<AgentsDeleteResult>("agents.delete", params)
}
