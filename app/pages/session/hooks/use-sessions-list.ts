/**
 * 拉全部会话列表。使用 chat store 的 sessions 数据(已在 App 启动时 refreshSessions)。
 * 若 store 空则触发一次加载。
 */

import { useEffect } from "react"
import { useChatDataStore } from "@/stores/chat"

export function useSessionsList() {
  const sessions = useChatDataStore((s) => s.sessions)
  const refreshSessions = useChatDataStore((s) => s.refreshSessions)

  useEffect(() => {
    if (sessions.length === 0) void refreshSessions()
  }, [sessions.length, refreshSessions])

  return { sessions, refresh: refreshSessions }
}
