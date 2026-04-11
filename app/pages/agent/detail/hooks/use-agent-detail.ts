import type { AgentDetailData } from "@/types/agent"

/**
 * 详情页数据入口：按 id 调 main 进程 agent.detail ipc 拉单个 agent 数据。
 * 不依赖 list store，detail 路由可以 deep link 直接访问。
 * 返回 data / loading / error 三态 + refresh 函数。
 */
export function useAgentDetail(id: string | undefined) {
  const [data, setData] = useState<AgentDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!id) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await window.electron.agent.detail(id)
      setData(result)
    } catch (e) {
      setError((e as Error).message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}
