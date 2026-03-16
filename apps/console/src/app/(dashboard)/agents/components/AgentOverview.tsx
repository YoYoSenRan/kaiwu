import type { Agent } from "@kaiwu/db"
import { Badge } from "@/components/ui/badge"
import { AgentStatusDot } from "./AgentStatusDot"
import { AgentRuntimeControls } from "./AgentRuntimeControls"
import { formatAbsoluteTime, getAllowAgents, getStageLabel, getWorkspace } from "../presentation"

interface AgentOverviewProps {
  agent: Agent
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
      <p className="mb-1 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">{label}</p>
      <p className="text-sm leading-6 text-foreground">{value}</p>
    </div>
  )
}

export function AgentOverview({ agent }: AgentOverviewProps) {
  const status = (agent.status as "online" | "idle" | "offline" | "error" | "unsynced") ?? "offline"
  const allowAgents = getAllowAgents(agent)
  const workspace = getWorkspace(agent)

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <div className="space-y-6">
        <section className="rounded-3xl border border-border/70 bg-card/90 p-5">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-tight">身份与职责</h3>
              <p className="mt-1 text-sm text-muted-foreground">把角色、模型和工作区放在一处看清楚，避免来回切 tab 找关键信息。</p>
            </div>
            <Badge variant="outline">{getStageLabel(agent.stageType)}</Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoItem label="ID" value={agent.id} />
            <InfoItem label="细分角色" value={agent.subRole ?? "未细分"} />
            <InfoItem label="模型" value={agent.model ?? "未配置"} />
            <InfoItem label="工作区" value={workspace ?? "未记录"} />
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card/90 p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold tracking-tight">协作配置</h3>
            <p className="mt-1 text-sm text-muted-foreground">这里展示当前 Agent 主动允许调用的协作对象，方便快速判断它偏编排还是偏执行。</p>
          </div>

          {allowAgents.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {allowAgents.map((agentId) => (
                <Badge key={agentId} variant="outline" className="bg-background/80">
                  {agentId}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
              当前没有显式配置可调用对象，更偏向独立运行或等待被其他节点调度。
            </div>
          )}
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-3xl border border-border/70 bg-card/90 p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold tracking-tight">运行时状态</h3>
            <p className="mt-1 text-sm text-muted-foreground">这部分更适合拿来判断“现在能不能用”，而不是解释它是谁。</p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="mb-2 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">状态</p>
              <AgentStatusDot status={status} showLabel />
            </div>
            <InfoItem label="最后活跃" value={formatAbsoluteTime(agent.lastSeenAt)} />
            <InfoItem label="启用状态" value={agent.isEnabled ? "已启用" : "已禁用"} />
            <InfoItem label="可调用对象" value={`${allowAgents.length} 个`} />
          </div>
        </section>

        <AgentRuntimeControls agentId={agent.id} model={agent.model} isEnabled={agent.isEnabled} />
      </div>
    </div>
  )
}
