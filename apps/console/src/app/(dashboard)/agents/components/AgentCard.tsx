"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { AgentStatusDot, type AgentStatus } from "./AgentStatusDot"

interface AgentCardProps {
  agent: { id: string; name: string; stageType: string; subRole: string | null; model: string | null; isEnabled: boolean }
  status?: AgentStatus
  lastSeenAt?: string | null
}

const STAGE_LABELS: Record<string, string> = { triage: "分拣", planning: "规划", review: "审核", dispatch: "派发", execute: "执行", publish: "发布" }

function formatLastSeen(lastSeenAt: string | null | undefined): string {
  if (!lastSeenAt) return "从未活跃"
  const diff = Date.now() - new Date(lastSeenAt).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "刚刚"
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

export function AgentCard({ agent, status = "offline", lastSeenAt }: AgentCardProps) {
  return (
    <Link href={`/agents/${agent.id}`} className={cn("block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50", !agent.isEnabled && "opacity-50")}>
      <div className="mb-3 flex items-center gap-2">
        <AgentStatusDot status={status} />
        <span className="font-medium">{agent.name}</span>
      </div>

      <div className="space-y-1 text-sm text-muted-foreground">
        <div className="flex justify-between">
          <span>阶段</span>
          <span>{STAGE_LABELS[agent.stageType] ?? agent.stageType}</span>
        </div>
        {agent.model && (
          <div className="flex justify-between">
            <span>模型</span>
            <span className="truncate ml-2 max-w-[140px]">{agent.model}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>活跃</span>
          <span>{formatLastSeen(lastSeenAt)}</span>
        </div>
      </div>
    </Link>
  )
}
