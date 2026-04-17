/**
 * sessions.* RPC 契约类型。
 *
 * 镜像 openclaw/src/gateway 侧 sessions 方法的入参结构。
 */

/** `sessions.create` 入参。key 不传时由 gateway 自动生成。 */
export interface SessionCreateParams {
  key?: string
  agentId?: string
  label?: string
  model?: string
  parentSessionKey?: string
  task?: string
  message?: string
}

/** `sessions.list` 入参。所有字段可选,不传则返回默认范围内的全部会话。 */
export interface SessionListParams {
  limit?: number
  agentId?: string
  search?: string
  includeGlobal?: boolean
  includeDerivedTitles?: boolean
  includeLastMessage?: boolean
}

/** `sessions.patch` 入参。字段传 null 表示清空,不传表示不动。 */
export interface SessionPatchParams {
  key: string
  label?: string | null
  model?: string | null
  thinkingLevel?: string | null
}

/** `sessions.delete` 入参。 */
export interface SessionDeleteParams {
  key: string
}
