/**
 * 四个纯转发 RPC 域(chat / sessions / agents / models)的契约类型。
 *
 * 镜像 OpenClaw gateway 侧方法签名:
 * - chat:     `openclaw/src/gateway/chat`
 * - sessions: `openclaw/src/gateway/sessions`
 * - agents / models: `openclaw/src/gateway/protocol/schema/agents-models-skills.ts`
 *
 * 合并四份单文件契约到此,消除空壳目录。各域用命名前缀区分(Chat* / Session* / Agents* / Model*)。
 */

// ---------- chat ----------

/** chat.send 请求参数。 */
export interface ChatSendParams {
  sessionKey: string
  message: string
  thinking?: string
  attachments?: unknown[]
  timeoutMs?: number
  idempotencyKey: string
}

/** chat.abort 请求参数。 */
export interface ChatAbortParams {
  sessionKey: string
  runId?: string
}

/** chat.history 请求参数。 */
export interface ChatHistoryParams {
  sessionKey: string
  limit?: number
  maxChars?: number
}

/** chat.send 返回后,通过 event 帧推送的流式事件。 */
export interface ChatEvent {
  runId: string
  sessionKey: string
  seq: number
  state: "delta" | "final" | "aborted" | "error"
  /** assistant 消息对象,delta/final 时为 `{ role, content: [{type:"text", text}], timestamp }`。 */
  message?: ChatEventMessage
  errorMessage?: string
  errorKind?: "refusal" | "timeout" | "rate_limit" | "context_length" | "unknown"
  usage?: ChatUsage
  stopReason?: string
}

/** chat 事件中的 message 结构。 */
export interface ChatEventMessage {
  role: string
  content: Array<{ type: string; text?: string }>
  timestamp?: number
  model?: string
  provider?: string
  usage?: ChatHistoryUsage
  stopReason?: string
}

/** chat.history 返回的消息条目。 */
export interface ChatHistoryMessage {
  role: string
  content: unknown
  timestamp?: number
  model?: string
  provider?: string
  stopReason?: string
  usage?: ChatHistoryUsage
  /** OpenClaw 附加的元数据。 */
  __openclaw?: { id?: string; seq?: number }
}

interface ChatUsage {
  input?: number
  output?: number
  cacheRead?: number
  cacheWrite?: number
  total?: number
}

interface ChatHistoryUsage {
  input?: number
  output?: number
  cacheRead?: number
  cacheWrite?: number
  totalTokens?: number
  cost?: { total?: number }
}

// ---------- sessions ----------

/** sessions.create 入参。key 不传时 gateway 自动生成。 */
export interface SessionCreateParams {
  key?: string
  agentId?: string
  label?: string
  model?: string
  parentSessionKey?: string
  task?: string
  message?: string
}

/** sessions.list 入参。所有字段可选,不传返回默认范围全部。 */
export interface SessionListParams {
  limit?: number
  agentId?: string
  search?: string
  includeGlobal?: boolean
  includeDerivedTitles?: boolean
  includeLastMessage?: boolean
}

/** sessions.patch 入参。字段传 null 表示清空,不传表示不动。 */
export interface SessionPatchParams {
  key: string
  label?: string | null
  model?: string | null
  thinkingLevel?: string | null
}

/** sessions.delete 入参。 */
export interface SessionDeleteParams {
  key: string
}

// ---------- agents ----------

/** agent 身份信息(嵌套在 GatewayAgentRow.identity 下)。 */
export interface AgentIdentity {
  name?: string
  theme?: string
  emoji?: string
  /** 上传到 workspace 的相对路径、HTTP(S) URL 或 data URI。 */
  avatar?: string
  /** gateway 计算后的可直接展示 URL(resolve 失败时为 undefined)。 */
  avatarUrl?: string
}

/** agent 模型引用:主模型 + 回退列表。 */
export interface AgentModelRef {
  primary?: string
  fallbacks?: string[]
}

/** agents.list 返回的每一行。 */
export interface GatewayAgentRow {
  id: string
  name?: string
  workspace?: string
  identity?: AgentIdentity
  model?: AgentModelRef
}

/** agents.list 的完整响应。 */
export interface AgentsListResult {
  defaultId: string
  mainKey: string
  scope: string
  agents: GatewayAgentRow[]
}

/** agents.create 入参。gateway 侧严格校验 additionalProperties: false。 */
export interface AgentsCreateParams {
  name: string
  workspace: string
  model?: string
  emoji?: string
  avatar?: string
}

/** agents.create 返回值。workspace 是 gateway resolve 后的绝对路径。 */
export interface AgentsCreateResult {
  ok: true
  agentId: string
  name: string
  workspace: string
}

/** agents.update 入参。仅支持 name / workspace / model / avatar 字段。 */
export interface AgentsUpdateParams {
  agentId: string
  name?: string
  workspace?: string
  /** 格式 `"provider/model-id"`,例如 `"anthropic/claude-sonnet-4-5"`。 */
  model?: string
  emoji?: string
  avatar?: string
}

/** agents.update 返回值。 */
export interface AgentsUpdateResult {
  ok: true
  agentId: string
}

/** agents.delete 入参。deleteFiles 默认 true,需显式 false 才保留磁盘文件。 */
export interface AgentsDeleteParams {
  agentId: string
  deleteFiles?: boolean
}

/** agents.delete 返回值。removedBindings 是级联清理的 session 绑定数量。 */
export interface AgentsDeleteResult {
  ok: true
  agentId: string
  removedBindings: number
}

// ---------- agent.identity / files / skills / tools ----------

/** agent.identity.get 入参。 */
export interface AgentIdentityGetParams {
  agentId: string
}

/** agent.identity.get 返回。 */
export interface AgentIdentityGetResult {
  agentId: string
  name: string
  avatar: string
  emoji?: string
  /** gateway 计算后可直接展示的 URL（失败时为 undefined）。 */
  avatarUrl?: string
}

/** agents.files.list 入参。 */
export interface AgentFilesListParams {
  agentId: string
}

/** workspace 下的单个文件项。 */
export interface AgentWorkspaceFile {
  name: string
  path: string
  missing?: boolean
  size?: number
  mtime?: number
}

/** agents.files.list 返回。 */
export interface AgentFilesListResult {
  agentId: string
  workspace: string
  files: AgentWorkspaceFile[]
}

/** agents.files.get 入参。 */
export interface AgentFilesGetParams {
  agentId: string
  name: string
}

/** agents.files.get 返回，file 在基础元信息外附 content。 */
export interface AgentFilesGetResult {
  agentId: string
  workspace: string
  file: AgentWorkspaceFile & { content: string }
}

/** agents.files.set 入参。 */
export interface AgentFilesSetParams {
  agentId: string
  name: string
  content: string
}

/** agents.files.set 返回。 */
export interface AgentFilesSetResult {
  ok: true
  agentId: string
  file: AgentWorkspaceFile
}

/** skills.status 入参。 */
export interface SkillsStatusParams {
  agentId: string
}

/** 单个 skill 的状态行。 */
export interface AgentSkillRow {
  name: string
  enabled: boolean
  reasons?: string[]
}

/** skills.status 返回。 */
export interface SkillsStatusResult {
  skills: AgentSkillRow[]
}

/** tools.catalog 入参。 */
export interface ToolsCatalogParams {
  agentId: string
  includePlugins?: boolean
}

/** 工具目录分组。 */
export interface AgentToolGroup {
  section: string
  tools: Array<{ name: string; source?: string; enabled?: boolean }>
}

/** tools.catalog 返回。 */
export interface ToolsCatalogResult {
  groups: AgentToolGroup[]
}

/** tools.effective 入参。 */
export interface ToolsEffectiveParams {
  agentId: string
  sessionKey?: string
}

/** tools.effective 返回。 */
export interface ToolsEffectiveResult {
  groups: AgentToolGroup[]
}

// ---------- models ----------

/** 单个可选模型。 */
export interface ModelChoice {
  id: string
  name: string
  provider: string
  contextWindow?: number
  reasoning?: boolean
}

/** models.list 的完整响应。 */
export interface ModelsListResult {
  models: ModelChoice[]
}
