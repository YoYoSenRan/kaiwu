/**
 * session 能力契约（主进程侧）。
 *
 * 定义会话的状态机和对外类型。kaiwu 管理的每个 agent 会话都有一个 SessionEntry，
 * 跟踪从创建到关闭的完整生命周期。
 */

/** 会话状态机。 */
export type SessionStatus = "creating" | "active" | "closing" | "closed" | "error"

/** 一条活跃会话的运行时信息。 */
export interface SessionEntry {
  /** OpenClaw sessionKey，如 "agent:x:kaiwu:task-42"。 */
  sessionKey: string
  /** 关联的 agent ID。 */
  agentId?: string
  /** 当前状态。 */
  status: SessionStatus
  /** 会话标签（用户可见）。 */
  label?: string
  /** 会话使用的模型。 */
  model?: string
  /** 创建时间戳（ms）。 */
  createdAt: number
  /** 最后活跃时间戳（ms）。 */
  lastActiveAt: number
  /** 最后一条消息的 runId，用于 abort。 */
  lastRunId?: string
  /** 错误信息（status=error 时有值）。 */
  error?: string
}

/** 来自 OpenClaw 的会话生命周期事件（插件侧镜像）。 */
export interface SessionLifecycleEvent {
  sessionKey: string
  reason: string
  parentSessionKey?: string
  label?: string
  displayName?: string
}
