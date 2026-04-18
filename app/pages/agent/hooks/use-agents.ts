import { useAgentCacheStore } from "@/stores/agent"

/**
 * agent 列表共享 hook。聚合 kaiwu 本地表 + openclaw gateway 返回的三分区。
 * 拉到数据后同步写入 useAgentCacheStore，供 detail 页 seed 渲染。
 */
export function useAgentList() {
  const [data, setData] = useState<Awaited<ReturnType<typeof window.electron.agent.list>> | null>(null)
  const [loading, setLoading] = useState(true)
  const setCache = useAgentCacheStore((s) => s.setListResult)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.electron.agent.list()
      setData(res)
      setCache(res)
    } finally {
      setLoading(false)
    }
  }, [setCache])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, refresh }
}
