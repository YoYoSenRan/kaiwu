import { readConfig, type AgentEntry } from "../gateway"

export interface AgentInfo {
  id: string
  name: string
  model: string | null
  enabled: boolean
  workspace: string | null
  allowAgents: string[]
}

/**
 * 从 openclaw.json 读取所有 Agent 列表
 */
export async function listAgents(): Promise<AgentInfo[]> {
  const config = await readConfig()
  const agentList = config.agents?.list ?? []

  return agentList.map((entry: AgentEntry) => ({
    id: entry.id,
    name: (entry.name as string) ?? entry.id,
    model: (entry.model as string) ?? null,
    enabled: entry.enabled !== false,
    workspace: (entry.workspace as string) ?? null,
    allowAgents: entry.subagents?.allowAgents ?? [],
  }))
}

/**
 * 从 openclaw.json 获取单个 Agent
 */
export async function getAgent(agentId: string): Promise<AgentInfo | null> {
  const agents = await listAgents()
  return agents.find((a) => a.id === agentId) ?? null
}
