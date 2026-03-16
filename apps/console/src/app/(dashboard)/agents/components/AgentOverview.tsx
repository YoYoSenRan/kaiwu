"use client"

import type { Agent } from "@kaiwu/db"
import { AgentStatusDot } from "./AgentStatusDot"
import { STAGE_LABELS } from "../constants"

interface AgentOverviewProps {
  agent: Agent
}

export function AgentOverview({ agent }: AgentOverviewProps) {
  const status = (agent.status as "online" | "idle" | "offline" | "error" | "unsynced") ?? "offline"

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">基本信息</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <InfoItem label="ID" value={agent.id} />
          <InfoItem label="阶段类型" value={STAGE_LABELS[agent.stageType] ?? agent.stageType} />
          <InfoItem label="细分角色" value={agent.subRole ?? "—"} />
          <InfoItem label="模型" value={agent.model ?? "未配置"} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">运行时状态</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border p-3">
            <p className="mb-1 text-xs text-muted-foreground">状态</p>
            <AgentStatusDot status={status} showLabel />
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="mb-1 text-xs text-muted-foreground">最后活跃</p>
            <p className="text-sm">{agent.lastSeenAt ? formatTime(agent.lastSeenAt) : "从未活跃"}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="mb-1 text-xs text-muted-foreground">启用状态</p>
            <p className="text-sm">{agent.isEnabled ? "已启用" : "已禁用"}</p>
          </div>
        </div>
      </section>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm">{value}</p>
    </div>
  )
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date)
}
