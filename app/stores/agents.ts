import { create } from "zustand"
import type { AgentRow } from "@/types/agent"

/** 单个 agent 的实时运行态（由 Phase 4 的 chat.event 订阅维护）。 */
interface AgentLive {
  busy: boolean
  lastActivityAt: number
}

interface AgentsState {
  rows: AgentRow[]
  syncing: boolean
  error: string | null
  /** 按 openclaw agentId 索引的实时态。 */
  live: Record<string, AgentLive>
  setRows: (rows: AgentRow[]) => void
  setSyncing: (syncing: boolean) => void
  setError: (error: string | null) => void
  setLive: (agentId: string, patch: Partial<AgentLive>) => void
  clearLive: () => void
}

/**
 * Agents 列表 store。不 persist——列表本身是业务数据，由 sqlite 托管，
 * zustand 只做内存缓存，重启后重新拉取即可（参考 persistence.md）。
 */
export const useAgentsStore = create<AgentsState>()((set) => ({
  rows: [],
  syncing: false,
  error: null,
  live: {},
  setRows: (rows) => set({ rows }),
  setSyncing: (syncing) => set({ syncing }),
  setError: (error) => set({ error }),
  setLive: (agentId, patch) =>
    set((s) => {
      const existing = s.live[agentId] ?? { busy: false, lastActivityAt: 0 }
      return { live: { ...s.live, [agentId]: { ...existing, ...patch } } }
    }),
  clearLive: () => set({ live: {} }),
}))
