/**
 * 活跃会话状态管理器。
 *
 * 维护 kaiwu 发起的所有 agent 会话的运行时状态，不负责 RPC 调用——
 * 调用方（chat/handler、context/orchestrator）先走 gateway RPC，
 * 成功后调 manager 的方法更新状态。
 *
 * 数据仅在内存中，不持久化。kaiwu 重启后由 renderer 重新拉取 OpenClaw 会话列表恢复。
 */

import type { SessionEntry, SessionStatus } from "./contract"

const sessions = new Map<string, SessionEntry>()
const changeListeners = new Set<() => void>()

/** 通知所有变更监听者。 */
function notifyChange(): void {
  for (const fn of changeListeners) fn()
}

/**
 * 注册一条新会话。
 * @param sessionKey OpenClaw sessionKey
 * @param opts 可选的初始属性
 */
export function registerSession(sessionKey: string, opts?: { agentId?: string; label?: string; model?: string }): SessionEntry {
  const entry: SessionEntry = {
    sessionKey,
    agentId: opts?.agentId,
    status: "creating",
    label: opts?.label,
    model: opts?.model,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  }
  sessions.set(sessionKey, entry)
  notifyChange()
  return entry
}

/**
 * 更新会话状态。
 * @param sessionKey 目标会话
 * @param status 新状态
 * @param extra 附加更新字段
 */
export function updateSessionStatus(sessionKey: string, status: SessionStatus, extra?: Partial<Pick<SessionEntry, "lastRunId" | "error">>): void {
  const entry = sessions.get(sessionKey)
  if (!entry) return
  entry.status = status
  entry.lastActiveAt = Date.now()
  if (extra?.lastRunId !== undefined) entry.lastRunId = extra.lastRunId
  if (extra?.error !== undefined) entry.error = extra.error
  notifyChange()
}

/**
 * 标记会话有新活动（更新 lastActiveAt）。
 * @param sessionKey 目标会话
 */
export function touchSession(sessionKey: string): void {
  const entry = sessions.get(sessionKey)
  if (!entry) return
  entry.lastActiveAt = Date.now()
}

/**
 * 移除会话。
 * @param sessionKey 目标会话
 */
export function removeSession(sessionKey: string): void {
  if (sessions.delete(sessionKey)) notifyChange()
}

/**
 * 获取指定会话。
 * @param sessionKey 目标会话
 */
export function getSession(sessionKey: string): SessionEntry | undefined {
  return sessions.get(sessionKey)
}

/** 获取所有活跃会话（快照）。 */
export function listSessions(): SessionEntry[] {
  return [...sessions.values()]
}

/**
 * 订阅会话列表变更，返回取消函数。
 * @param listener 变更回调（不带参数，调用方自行 listSessions 获取最新快照）
 */
export function onSessionChange(listener: () => void): () => void {
  changeListeners.add(listener)
  return () => changeListeners.delete(listener)
}
