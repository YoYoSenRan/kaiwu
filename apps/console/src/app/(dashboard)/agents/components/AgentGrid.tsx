import type { ComponentType } from "react"
import Link from "next/link"
import { Activity, Bot, Cpu, Network, TriangleAlert } from "lucide-react"
import type { Agent } from "@kaiwu/db"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AgentCard } from "./AgentCard"
import { buildAgentNetworkSummary, type AgentNetworkItem } from "../presentation"

interface AgentGridProps {
  agents: Agent[]
}

function StatCard({ icon: Icon, label, value, hint }: { icon: ComponentType<{ className?: string }>; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
      <div className="mb-3 flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs font-medium tracking-[0.16em] uppercase">{label}</span>
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}

function AgentSection({ title, description, items, emphasisLabel }: { title: string; description: string; items: AgentNetworkItem[]; emphasisLabel?: string }) {
  if (items.length === 0) return null

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline">{items.length} 个节点</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {items.map((item) => (
          <AgentCard
            key={item.agent.id}
            agent={item.agent}
            status={item.status}
            allowAgents={item.allowAgents}
            dependentCount={item.dependentCount}
            lastSeenLabel={item.lastSeenLabel}
            emphasisLabel={emphasisLabel}
          />
        ))}
      </div>
    </section>
  )
}

export function AgentGrid({ agents }: AgentGridProps) {
  if (agents.length === 0) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 p-8">
        <div className="max-w-sm text-center">
          <p className="text-base font-medium">当前还没有可展示的智能体</p>
          <p className="mt-2 text-sm text-muted-foreground">先去部署模板，系统才会生成一张真正能看的协作面板。</p>
          <Link href="/templates" className="text-sm text-primary underline">
            前往模板管理部署
          </Link>
        </div>
      </div>
    )
  }

  const summary = buildAgentNetworkSummary(agents)

  return (
    <div className="space-y-8">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <Card className="overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/30 py-0">
          <CardHeader className="gap-3 border-b border-border/60 py-6">
            <Badge variant="outline" className="w-fit bg-background/70">
              系统视角
            </Badge>
            <CardTitle className="text-2xl font-semibold tracking-tight">先看协作结构，再看单个 Agent</CardTitle>
            <CardDescription className="max-w-2xl">
              这个页面现在不只是列表，而是一张简化的运行面板。你可以先盯住中枢节点、配置缺口和协作连线，再决定要深入哪个智能体。
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 py-6">
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              <StatCard icon={Bot} label="已注册" value={`${summary.stats.total}`} hint={`已启用 ${summary.stats.enabled} 个`} />
              <StatCard icon={Network} label="协作连线" value={`${summary.totalLinks}`} hint={`协作中枢 ${summary.coreAgents.length} 个`} />
              <StatCard icon={Cpu} label="模型就绪" value={`${summary.stats.configured}`} hint={`未配置 ${summary.stats.total - summary.stats.configured} 个`} />
              <StatCard icon={TriangleAlert} label="需关注" value={`${summary.stats.attention}`} hint={`在线 ${summary.stats.online} 个`} />
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">关键节点</p>
                <p className="mt-2 text-sm text-muted-foreground">高连通度节点更适合优先巡检，它们一旦失配，会比普通 Agent 影响更大。</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {summary.coreAgents.length > 0 ? (
                    summary.coreAgents.slice(0, 6).map((item) => (
                      <Badge key={item.agent.id} variant="outline" className="bg-card">
                        {item.agent.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">当前还没有明显的协作中枢。</span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">运行分布</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline">在线 {summary.statusBreakdown.online}</Badge>
                  <Badge variant="outline">空闲 {summary.statusBreakdown.idle}</Badge>
                  <Badge variant="outline">离线 {summary.statusBreakdown.offline}</Badge>
                  <Badge variant="outline">异常 {summary.statusBreakdown.error}</Badge>
                  <Badge variant="outline">未同步 {summary.statusBreakdown.unsynced}</Badge>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">如果某个状态异常增多，先去看协作中枢，再排查具体执行节点。</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-border/70 bg-card/90">
          <CardHeader className="gap-2 py-6">
            <Badge variant="outline" className="w-fit bg-background/70">
              关注项
            </Badge>
            <CardTitle className="text-xl font-semibold tracking-tight">优先处理这些配置缺口</CardTitle>
            <CardDescription>只把真正需要动作的节点拉出来，避免被一堆“离线但正常”的状态刷屏。</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 pb-6">
            {summary.attentionAgents.length > 0 ? (
              summary.attentionAgents.slice(0, 5).map((item) => (
                <Link
                  key={item.agent.id}
                  href={`/agents/${item.agent.id}`}
                  className="block rounded-2xl border border-border/60 bg-background/80 p-4 transition-colors hover:bg-accent/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.agent.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.attentionReasons.join(" / ")}</p>
                    </div>
                    <Activity className="size-4 text-muted-foreground" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-5 text-sm text-muted-foreground">
                当前没有明显的配置缺口，这批 Agent 可以继续保持观察。
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <AgentSection title="协作中枢" description="这些节点承担调度、承接或转发职责，通常是最值得优先看的地方。" items={summary.coreAgents} emphasisLabel="中枢" />

      <AgentSection title="协作节点" description="这些节点与系统存在明确连线，但不承担核心枢纽职责，更适合按任务上下文逐个查看。" items={summary.linkedAgents} />

      <AgentSection title="独立单元" description="当前没有显式协作关系的节点，适合做单点实验或备用配置。" items={summary.standaloneAgents} />
    </div>
  )
}
