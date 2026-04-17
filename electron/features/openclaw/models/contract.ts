/**
 * openclaw models.list RPC 契约类型。
 *
 * 对齐源码:`openclaw/src/gateway/protocol/schema/agents-models-skills.ts`。
 * models 与 agents 是独立的 RPC 名字空间,这里与 agent/contract.ts 分开。
 */

/** 单个可选模型。 */
export interface ModelChoice {
  id: string
  name: string
  provider: string
  contextWindow?: number
  reasoning?: boolean
}

/** `models.list` 的完整响应。 */
export interface ModelsListResult {
  models: ModelChoice[]
}
