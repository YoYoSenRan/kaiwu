import type { Agent } from "@kaiwu/db"
import type { AgentStatus } from "./components/AgentStatusDot"
import { STAGE_LABELS } from "./constants"

interface AgentConfigShape {
  allowAgents?: unknown
  workspace?: unknown
}

export interface AgentNetworkItem {
  agent: Agent
  status: AgentStatus
  allowAgents: string[]
  workspace: string | null
  dependentCount: number
  coordinationScore: number
  lastSeenLabel: string
  isAttentionNeeded: boolean
  attentionReasons: string[]
}

export interface AgentNetworkSummary {
  items: AgentNetworkItem[]
  coreAgents: AgentNetworkItem[]
  linkedAgents: AgentNetworkItem[]
  standaloneAgents: AgentNetworkItem[]
  attentionAgents: AgentNetworkItem[]
  totalLinks: number
  stats: { total: number; configured: number; attention: number; online: number; enabled: number }
  statusBreakdown: Record<AgentStatus, number>
}

const STATUS_PRIORITY: Record<AgentStatus, number> = { error: 0, unsynced: 1, offline: 2, idle: 3, online: 4 }

function isConfigShape(value: unknown): value is AgentConfigShape {
  return typeof value === "object" && value !== null
}

export function getAgentStatus(agent: Agent): AgentStatus {
  const status = agent.status as AgentStatus | null
  return status ?? "offline"
}

export function getAllowAgents(agent: Pick<Agent, "config">): string[] {
  if (!isConfigShape(agent.config)) return []
  if (!Array.isArray(agent.config.allowAgents)) return []

  return agent.config.allowAgents.filter((value): value is string => typeof value === "string" && value.length > 0)
}

export function getWorkspace(agent: Pick<Agent, "config">): string | null {
  if (!isConfigShape(agent.config)) return null
  return typeof agent.config.workspace === "string" && agent.config.workspace.length > 0 ? agent.config.workspace : null
}

export function getStageLabel(stageType: string): string {
  return STAGE_LABELS[stageType] ?? stageType
}

export function formatRelativeLastSeen(lastSeenAt: Date | string | null | undefined): string {
  if (!lastSeenAt) return "从未活跃"

  const date = typeof lastSeenAt === "string" ? new Date(lastSeenAt) : lastSeenAt
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60_000)

  if (minutes < 1) return "刚刚"
  if (minutes < 60) return `${minutes} 分钟前`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`

  return `${Math.floor(hours / 24)} 天前`
}

export function formatAbsoluteTime(lastSeenAt: Date | string | null | undefined): string {
  if (!lastSeenAt) return "从未活跃"

  const date = typeof lastSeenAt === "string" ? new Date(lastSeenAt) : lastSeenAt
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date)
}

function getAttentionReasons(agent: Agent, status: AgentStatus): string[] {
  const reasons: string[] = []

  if (!agent.model) reasons.push("未配置模型")
  if (!agent.isEnabled) reasons.push("已停用")
  if (status === "error") reasons.push("运行异常")
  if (status === "unsynced") reasons.push("未同步")

  return reasons
}

function compareAgents(a: AgentNetworkItem, b: AgentNetworkItem): number {
  if (a.coordinationScore !== b.coordinationScore) return b.coordinationScore - a.coordinationScore
  if (STATUS_PRIORITY[a.status] !== STATUS_PRIORITY[b.status]) return STATUS_PRIORITY[b.status] - STATUS_PRIORITY[a.status]
  return a.agent.name.localeCompare(b.agent.name, "zh-CN")
}

export function buildAgentNetworkSummary(agents: Agent[]): AgentNetworkSummary {
  const dependentCountMap = new Map<string, number>()

  for (const agent of agents) {
    for (const target of getAllowAgents(agent)) {
      dependentCountMap.set(target, (dependentCountMap.get(target) ?? 0) + 1)
    }
  }

  const items = agents
    .map((agent) => {
      const status = getAgentStatus(agent)
      const allowAgents = getAllowAgents(agent)
      const dependentCount = dependentCountMap.get(agent.id) ?? 0
      const attentionReasons = getAttentionReasons(agent, status)

      return {
        agent,
        status,
        allowAgents,
        workspace: getWorkspace(agent),
        dependentCount,
        coordinationScore: allowAgents.length + dependentCount,
        lastSeenLabel: formatRelativeLastSeen(agent.lastSeenAt),
        isAttentionNeeded: attentionReasons.length > 0,
        attentionReasons,
      } satisfies AgentNetworkItem
    })
    .toSorted(compareAgents)

  const coreAgents = items.filter((item) => item.allowAgents.length > 1 || item.dependentCount > 1 || item.coordinationScore >= 3)
  const standaloneAgents = items.filter((item) => item.allowAgents.length === 0 && item.dependentCount === 0)
  const standaloneIds = new Set(standaloneAgents.map((item) => item.agent.id))
  const coreIds = new Set(coreAgents.map((item) => item.agent.id))
  const linkedAgents = items.filter((item) => !coreIds.has(item.agent.id) && !standaloneIds.has(item.agent.id))
  const attentionAgents = items.filter((item) => item.isAttentionNeeded).toSorted((a, b) => b.attentionReasons.length - a.attentionReasons.length || compareAgents(a, b))

  return {
    items,
    coreAgents,
    linkedAgents,
    standaloneAgents,
    attentionAgents,
    totalLinks: items.reduce((sum, item) => sum + item.allowAgents.length, 0),
    stats: {
      total: items.length,
      configured: items.filter((item) => Boolean(item.agent.model)).length,
      attention: attentionAgents.length,
      online: items.filter((item) => item.status === "online").length,
      enabled: items.filter((item) => item.agent.isEnabled).length,
    },
    statusBreakdown: {
      online: items.filter((item) => item.status === "online").length,
      idle: items.filter((item) => item.status === "idle").length,
      offline: items.filter((item) => item.status === "offline").length,
      error: items.filter((item) => item.status === "error").length,
      unsynced: items.filter((item) => item.status === "unsynced").length,
    },
  }
}
