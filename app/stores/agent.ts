import { create } from "zustand"
import type { AgentListResult } from "@contracts/agent"

/**
 * agent 跨页面缓存。
 *
 * 职责：
 *   - list 页拉 agents.list 后写入，detail 页读 seed 避免首次渲染空白
 *   - detail 页进入即从此拿 gateway 行，显示 header/overview，后台补 identity/files/skills
 */
interface AgentCacheState {
  /** 最近一次 list RPC 的完整结果。 */
  listResult: AgentListResult | null
  setListResult: (res: AgentListResult) => void
  /** 从缓存取某个 agent 的 gateway 行；找不到返回 undefined。 */
  getGatewayRow: (agentId: string) => AgentListResult["mine"][number]["gateway"] | undefined
}

export const useAgentCacheStore = create<AgentCacheState>((set, get) => ({
  listResult: null,
  setListResult: (res) => set({ listResult: res }),
  getGatewayRow: (agentId) => {
    const res = get().listResult
    if (!res) return undefined
    const hit = res.mine.find((e) => e.agentId === agentId) ?? res.unsynced.find((e) => e.agentId === agentId)
    return hit?.gateway
  },
}))
