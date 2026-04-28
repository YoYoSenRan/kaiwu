import { create } from "zustand"
import type { AgentListResult } from "@contracts/agent"

type GatewayRow = AgentListResult["mine"][number]["gateway"]

/**
 * agent 跨页面缓存。
 *
 * 职责：
 *   - list 页拉 agents.list 后写入，detail 页读 seed 避免首次渲染空白
 *   - detail 页进入即从此拿 gateway 行，显示 header/overview，后台补 identity/files/skills
 *
 * byAgentId 派生:selector 订阅 method 引用不会触发 re-render,派生 Record 才能让所有
 * consumer 在 listResult 更新后正确重渲(直接订阅 `byAgentId` 或具体 `byAgentId[id]`)。
 */
interface AgentCacheState {
  /** 最近一次 list RPC 的完整结果。 */
  listResult: AgentListResult | null
  /** 派生:agentId → gateway row 的 O(1) 查询表,listResult 变则新对象引用。 */
  byAgentId: Record<string, GatewayRow>
  setListResult: (res: AgentListResult) => void
  /** 从缓存取某个 agent 的 gateway 行;找不到返 undefined。 */
  getGatewayRow: (agentId: string) => GatewayRow | undefined
}

function buildIndex(res: AgentListResult): Record<string, GatewayRow> {
  const out: Record<string, GatewayRow> = {}
  for (const e of res.mine) if (e.gateway) out[e.agentId] = e.gateway
  for (const e of res.unsynced) if (e.gateway) out[e.agentId] = e.gateway
  return out
}

export const useAgentCacheStore = create<AgentCacheState>((set, get) => ({
  listResult: null,
  byAgentId: {},
  setListResult: (res) => set({ listResult: res, byAgentId: buildIndex(res) }),
  getGatewayRow: (agentId) => get().byAgentId[agentId],
}))
