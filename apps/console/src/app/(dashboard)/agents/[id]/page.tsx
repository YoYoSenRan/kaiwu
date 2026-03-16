import Link from "next/link"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { getAgentById } from "../server/queries"
import { AgentDetailTabs } from "../components/AgentDetailTabs"
import { AgentOverview } from "../components/AgentOverview"
import { AgentFiles } from "../components/AgentFiles"
import { AgentTasks } from "../components/AgentTasks"
import { AgentCosts } from "../components/AgentCosts"
import { AgentStatusDot } from "../components/AgentStatusDot"
import type { DetailTab } from "../constants"
import { formatRelativeLastSeen, getAllowAgents, getStageLabel, getWorkspace } from "../presentation"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; period?: string }>
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
      <p className="mb-1 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">{label}</p>
      <p className="text-sm leading-6 text-foreground">{value}</p>
    </div>
  )
}

export default async function AgentDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { period = "week" } = await searchParams

  const agent = await getAgentById(id)
  if (!agent) notFound()

  const status = (agent.status as "online" | "idle" | "offline" | "error" | "unsynced") ?? "offline"
  const allowAgents = getAllowAgents(agent)
  const workspace = getWorkspace(agent)

  const tabs: Record<DetailTab, React.ReactNode> = {
    overview: <AgentOverview agent={agent} />,
    files: <AgentFiles agentId={agent.id} />,
    tasks: <AgentTasks tasks={[]} />,
    costs: <AgentCosts agentId={agent.id} period={period as "day" | "week" | "month"} />,
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-3">
        <Link href="/agents" className="text-sm text-muted-foreground hover:text-foreground">
          ← 返回列表
        </Link>
      </div>

      <section className="mb-6 overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/30">
        <div className="p-5 md:p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/70">
                  Agent 详情
                </Badge>
                <Badge variant="outline" className="bg-background/70">
                  {getStageLabel(agent.stageType)}
                </Badge>
                {agent.subRole && (
                  <Badge variant="outline" className="bg-background/70">
                    {agent.subRole}
                  </Badge>
                )}
                {!agent.isEnabled && <Badge variant="outline">已停用</Badge>}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight">{agent.name}</h1>
                <AgentStatusDot status={status} showLabel />
              </div>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">这里先给你一眼看清这个 Agent 的角色、状态和协作范围，再进入文件、任务和消耗这些更细的视图。</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant={agent.model ? "secondary" : "destructive"}>{agent.model ?? "未配置模型"}</Badge>
                {workspace && (
                  <Badge variant="outline" className="bg-background/70">
                    {workspace.split("/").pop() ?? workspace}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[380px]">
              <SummaryItem label="启用状态" value={agent.isEnabled ? "已启用" : "已禁用"} />
              <SummaryItem label="最后活跃" value={formatRelativeLastSeen(agent.lastSeenAt)} />
              <SummaryItem label="可调用对象" value={`${allowAgents.length} 个`} />
              <SummaryItem label="工作区" value={workspace?.split("/").pop() ?? "未记录"} />
            </div>
          </div>
        </div>
      </section>

      <AgentDetailTabs agentId={agent.id}>{tabs}</AgentDetailTabs>
    </div>
  )
}
