/**
 * 拉会话详情(session + members + messages + turns)。按需加载,无全局缓存。
 */

import { useEffect, useState } from "react"
import type { ChatSessionDetail } from "../../../../electron/features/chat/types"

export interface UseSessionDetailResult {
  detail: ChatSessionDetail | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useSessionDetail(sessionId: string | undefined): UseSessionDetailResult {
  const [detail, setDetail] = useState<ChatSessionDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const d = await window.electron.chat.inspect.getSessionDetail(id)
      setDetail(d)
    } catch (err) {
      setError((err as Error).message)
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!sessionId) {
      setDetail(null)
      return
    }
    void load(sessionId)
  }, [sessionId])

  return {
    detail,
    loading,
    error,
    refresh: async () => {
      if (sessionId) await load(sessionId)
    },
  }
}
