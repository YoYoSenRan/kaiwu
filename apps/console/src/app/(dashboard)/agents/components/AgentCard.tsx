import type { ComponentType } from "react"
import Link from "next/link"
import { ArrowUpRight, Clock3, Network, Radar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { AgentStatusDot, type AgentStatus } from "./AgentStatusDot"
import { getStageLabel } from "../presentation"

interface AgentCardProps {
  agent: { id: string; name: string; stageType: string; subRole: string | null; model: string | null; isEnabled: boolean }
  status: AgentStatus
  allowAgents: string[]
  dependentCount: number
  lastSeenLabel: string
  emphasisLabel?: string
}

function getSummaryText(allowAgents: string[], dependentCount: number): string {
  if (allowAgents.length > 0 && dependentCount > 0) return "既能调度下游，也被上游依赖，属于高频协作节点。"
  if (allowAgents.length > 0) return `当前可调用 ${allowAgents.length} 个协作对象，更偏向编排与派发。`
  if (dependentCount > 0) return `当前被 ${dependentCount} 个节点依赖，更偏向被调度执行。`
  return "当前没有显式协作关系，更适合做独立实验或单点运行。"
}

function Metric({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-3">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

export function AgentCard({ agent, status, allowAgents, dependentCount, lastSeenLabel, emphasisLabel }: AgentCardProps) {
  return (
    <Link
      href={`/agents/${agent.id}`}
      className={cn(
        "group block rounded-3xl border border-border/70 bg-card/90 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-lg",
        emphasisLabel && "bg-gradient-to-br from-card via-card to-muted/30",
        !agent.isEnabled && "ring-1 ring-amber-500/15"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold tracking-tight">{agent.name}</span>
            {emphasisLabel && <Badge variant="secondary">{emphasisLabel}</Badge>}
            {!agent.isEnabled && <Badge variant="outline">已停用</Badge>}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AgentStatusDot status={status} showLabel />
            <span className="text-muted-foreground/60">/</span>
            <span>{getSummaryText(allowAgents, dependentCount)}</span>
          </div>
        </div>
        <ArrowUpRight className="mt-1 size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Badge variant="outline">{getStageLabel(agent.stageType)}</Badge>
        {agent.subRole && <Badge variant="outline">{agent.subRole}</Badge>}
        <Badge variant={agent.model ? "secondary" : "destructive"}>{agent.model ?? "未配置模型"}</Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric icon={Network} label="可调用" value={`${allowAgents.length} 个`} />
        <Metric icon={Radar} label="被依赖" value={`${dependentCount} 个`} />
        <Metric icon={Clock3} label="最后活跃" value={lastSeenLabel} />
      </div>

      {allowAgents.length > 0 && (
        <div className="mt-5 border-t border-border/60 pt-4">
          <p className="mb-2 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">协作范围</p>
          <div className="flex flex-wrap gap-2">
            {allowAgents.slice(0, 5).map((agentId) => (
              <Badge key={agentId} variant="outline" className="bg-background/80">
                {agentId}
              </Badge>
            ))}
            {allowAgents.length > 5 && (
              <Badge variant="outline" className="bg-background/80">
                +{allowAgents.length - 5}
              </Badge>
            )}
          </div>
        </div>
      )}
    </Link>
  )
}
