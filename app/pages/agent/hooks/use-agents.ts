import { useCallback, useEffect } from "react"
import { useAgentsStore } from "@/stores/agents"

/**
 * 组件入口 hook：
 * - 首屏立即从本地 sqlite 拉列表（stale）
 * - 异步调 sync 与 gateway 对齐（revalidate），成功后覆盖 rows
 * - 暴露 refresh / sync 给调用方在 mutation 后主动刷新
 */
export function useAgents() {
  const rows = useAgentsStore((s) => s.rows)
  const syncing = useAgentsStore((s) => s.syncing)
  const error = useAgentsStore((s) => s.error)
  const setRows = useAgentsStore((s) => s.setRows)
  const setSyncing = useAgentsStore((s) => s.setSyncing)
  const setError = useAgentsStore((s) => s.setError)

  const refresh = useCallback(async () => {
    try {
      const data = await window.electron.agent.list()
      setRows(data)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [setRows, setError])

  const sync = useCallback(async () => {
    setSyncing(true)
    try {
      const data = await window.electron.agent.sync()
      setRows(data)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSyncing(false)
    }
  }, [setRows, setSyncing, setError])

  useEffect(() => {
    void refresh()
    void sync()
  }, [refresh, sync])

  return { rows, syncing, error, refresh, sync }
}
