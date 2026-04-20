import { useAgentCacheStore } from "@/stores/agent"
import type { AgentDetail } from "@contracts/agent"

/**
 * detail 数据 hook。
 *
 * 流程:
 *   1. 首帧同步从 useAgentCacheStore 取 list 已拉的 gateway 行做 seed，立即 setDetail
 *   2. 后台异步拉 agent.detail（补 identity / files / skills），到达后覆盖
 *   3. seed 缺失时（比如深链直接访问）走完整 skeleton
 */
export function useAgentDetail(agentId: string | undefined) {
  const getGatewayRow = useAgentCacheStore((s) => s.getGatewayRow)

  const [detail, setDetail] = useState<AgentDetail | null>(() => {
    if (!agentId) return null
    const gateway = getGatewayRow(agentId)
    return gateway ? { agentId, gateway } : null
  })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!agentId) return
    setLoading(true)
    try {
      const res = await window.electron.agent.detail(agentId)
      setDetail(res)
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { detail, loading, refresh }
}
