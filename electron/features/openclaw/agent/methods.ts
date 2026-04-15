/**
 * openclaw agents.* / models.list 的 RPC 便捷包装。
 *
 * 用纯函数 + 显式 caller 参数的形式，新增 RPC 不需要改 gateway 层代码（开闭原则）。
 * 调用端：`agentsList(requireCaller())`。
 */

import type { GatewayCaller } from "../gateway/caller"
import type {
  ModelsListResult,
  AgentsListResult,
  AgentsCreateParams,
  AgentsCreateResult,
  AgentsDeleteParams,
  AgentsDeleteResult,
  AgentsUpdateParams,
  AgentsUpdateResult,
} from "./contract"

/** 列出所有 agent（包含 defaultId / mainKey / scope 元信息）。 */
export function agentsList(caller: GatewayCaller): Promise<AgentsListResult> {
  return caller.call("agents.list") as Promise<AgentsListResult>
}

/**
 * 创建 agent。gateway 会同步写 workspace 下 7 个 bootstrap md 文件。
 * 非原子：任一步失败可能留半截磁盘文件，调用方需自己回滚。
 */
export function agentsCreate(caller: GatewayCaller, params: AgentsCreateParams): Promise<AgentsCreateResult> {
  return caller.call("agents.create", params) as Promise<AgentsCreateResult>
}

/**
 * 更新 agent。只支持 name / workspace / model / avatar 四个字段。
 * 改 model 时传 `"provider/model-id"` 字符串，不要传对象。
 */
export function agentsUpdate(caller: GatewayCaller, params: AgentsUpdateParams): Promise<AgentsUpdateResult> {
  return caller.call("agents.update", params) as Promise<AgentsUpdateResult>
}

/**
 * 删除 agent。deleteFiles 默认 true（gateway 侧默认），调用方想保留磁盘需显式传 false。
 */
export function agentsDelete(caller: GatewayCaller, params: AgentsDeleteParams): Promise<AgentsDeleteResult> {
  return caller.call("agents.delete", params) as Promise<AgentsDeleteResult>
}

/** 获取可选模型清单。入参为空对象。 */
export function modelsList(caller: GatewayCaller): Promise<ModelsListResult> {
  return caller.call("models.list") as Promise<ModelsListResult>
}
