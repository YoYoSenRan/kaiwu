/**
 * sessions.* RPC 契约类型。
 *
 * 镜像 openclaw/src/gateway 侧 sessions 方法的入参结构。
 */

export interface SessionCreateParams {
  key?: string
  agentId?: string
  label?: string
  model?: string
  parentSessionKey?: string
  task?: string
  message?: string
}

export interface SessionListParams {
  limit?: number
  agentId?: string
  search?: string
  includeGlobal?: boolean
  includeDerivedTitles?: boolean
  includeLastMessage?: boolean
}

export interface SessionPatchParams {
  key: string
  label?: string | null
  model?: string | null
  thinkingLevel?: string | null
}

export interface SessionDeleteParams {
  key: string
}
