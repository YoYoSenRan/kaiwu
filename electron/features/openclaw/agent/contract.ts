/**
 * openclaw agents.* / models.list RPC 契约类型。
 *
 * 对齐源码：
 * - `openclaw/src/gateway/protocol/schema/agents-models-skills.ts`
 * - `openclaw/src/shared/session-types.ts`（GatewayAgentRow）
 */

// ---------- agents.* ----------

/** agent 身份信息（嵌套在 GatewayAgentRow.identity 下）。 */
export interface AgentIdentity {
  name?: string
  theme?: string
  emoji?: string
  /** 上传到 workspace 的相对路径、HTTP(S) URL 或 data URI。 */
  avatar?: string
  /** gateway 计算后的可直接展示 URL（resolve 失败时为 undefined）。 */
  avatarUrl?: string
}

/** agent 模型引用：主模型 + 回退列表。 */
export interface AgentModelRef {
  primary?: string
  fallbacks?: string[]
}

/** `agents.list` 返回的每一行。 */
export interface GatewayAgentRow {
  id: string
  name?: string
  workspace?: string
  identity?: AgentIdentity
  model?: AgentModelRef
}

/** `agents.list` 的完整响应。 */
export interface AgentsListResult {
  defaultId: string
  mainKey: string
  scope: string
  agents: GatewayAgentRow[]
}

/** `agents.create` 入参。additionalProperties: false，gateway 侧严格校验。 */
export interface AgentsCreateParams {
  name: string
  workspace: string
  emoji?: string
  avatar?: string
}

/** `agents.create` 返回值。workspace 为 gateway resolve 后的绝对路径。 */
export interface AgentsCreateResult {
  ok: true
  agentId: string
  name: string
  workspace: string
}

/** `agents.update` 入参。仅支持 name / workspace / model / avatar 四个字段。 */
export interface AgentsUpdateParams {
  agentId: string
  name?: string
  workspace?: string
  /** 格式 `"provider/model-id"`，如 `"anthropic/claude-sonnet-4-5"`。 */
  model?: string
  avatar?: string
}

export interface AgentsUpdateResult {
  ok: true
  agentId: string
}

/** `agents.delete` 入参。deleteFiles 默认 true，需要显式 false 才保留磁盘文件。 */
export interface AgentsDeleteParams {
  agentId: string
  deleteFiles?: boolean
}

export interface AgentsDeleteResult {
  ok: true
  agentId: string
  removedBindings: number
}

// ---------- models.list ----------

/** 单个可选模型。 */
export interface ModelChoice {
  id: string
  name: string
  provider: string
  contextWindow?: number
  reasoning?: boolean
}

export interface ModelsListResult {
  models: ModelChoice[]
}
