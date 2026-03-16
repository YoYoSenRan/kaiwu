import Link from "next/link"
import { notFound } from "next/navigation"
import { getAgentById } from "../queries"
import { AgentDetailTabs } from "../components/AgentDetailTabs"
import { AgentOverview } from "../components/AgentOverview"
import { AgentFiles } from "../components/AgentFiles"
import { AgentTasks } from "../components/AgentTasks"
import { AgentCosts } from "../components/AgentCosts"
import { AgentStatusDot } from "../components/AgentStatusDot"
import type { DetailTab } from "../constants"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; period?: string }>
}

export default async function AgentDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { period = "week" } = await searchParams

  const agent = await getAgentById(id)
  if (!agent) notFound()

  const status = (agent.status as "online" | "idle" | "offline" | "error" | "unsynced") ?? "offline"

  const tabs: Record<DetailTab, React.ReactNode> = {
    overview: <AgentOverview agent={agent} />,
    files: <AgentFiles agentId={agent.id} />,
    tasks: <AgentTasks tasks={[]} />,
    costs: <AgentCosts agentId={agent.id} period={period as "day" | "week" | "month"} />,
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <div className="mb-2">
          <Link href="/agents" className="text-sm text-muted-foreground hover:text-foreground">
            ← 返回列表
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{agent.name}</h1>
          <AgentStatusDot status={status} showLabel />
        </div>
      </div>

      <AgentDetailTabs agentId={agent.id}>{tabs}</AgentDetailTabs>
    </div>
  )
}
