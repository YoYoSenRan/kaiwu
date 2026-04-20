import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useGatewayStore } from "@/stores/gateway"
import { useChatDataStore } from "@/stores/chat"
import { useAgentCacheStore } from "@/stores/agent"
import { gatewayDotColor } from "@/utils/gateway"
import {
  Activity,
  Bot,
  Database,
  HardDrive,
  ListChecks,
  MessageSquare,
  Plug,
  Plus,
  Terminal,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

type KnowledgeBase = Awaited<ReturnType<typeof window.electron.knowledge.base.list>>[number]

export default function Dashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [list, setList] = useState<KnowledgeBase[]>([])
  const [agentData, setAgentData] = useState<Awaited<ReturnType<typeof window.electron.agent.list>> | null>(null)
  const [monitorEvents, setMonitorEvents] = useState<MonitorEventItem[]>([])

  const sessions = useChatDataStore((s) => s.sessions)
  const messages = useChatDataStore((s) => s.messages)
  const unread = useChatDataStore((s) => s.unread)

  useEffect(() => {
    void window.electron.knowledge.base.list().then(setList)
  }, [])

  useEffect(() => {
    void window.electron.agent.list().then((res) => {
      setAgentData(res)
      useAgentCacheStore.getState().setListResult(res)
    })
  }, [])

  useEffect(() => {
    const off = window.electron.openclaw.plugin.on.monitor((event) => {
      setMonitorEvents((prev) => {
        const next = [
          {
            id: `${event.ts}-${Math.random()}`,
            time: new Date().toLocaleTimeString(),
            msg: formatMonitorEvent(event),
            ts: event.ts,
          },
          ...prev,
        ]
        return next.slice(0, 20)
      })
    })
    return () => off()
  }, [])

  const recent = list.slice(0, 3)
  const totalDocs = list.reduce((sum, kb) => sum + (kb.doc_count ?? 0), 0)

  const activeSessions = sessions.filter((s) => !s.archived).length
  const totalMessages = Object.values(messages).reduce((sum, msgs) => sum + msgs.length, 0)
  const totalUnread = Object.values(unread).reduce((sum, count) => sum + count, 0)

  const totalAgents = (agentData?.mine?.length ?? 0) + (agentData?.unsynced?.length ?? 0)
  const mineCount = agentData?.mine?.length ?? 0
  const unsyncedCount = agentData?.unsynced?.length ?? 0
  const missingCount = agentData?.missing?.length ?? 0

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <div className="space-y-5 xl:col-span-2">
        <div className="grid gap-5 sm:grid-cols-3">
          <OverviewMetric
            title={t("dashboard.systemStatus.sessions", "Active Sessions")}
            value={activeSessions.toString()}
            icon={MessageSquare}
          />
          <OverviewMetric
            title={t("dashboard.systemStatus.knowledgeBases", "Knowledge Bases")}
            value={list.length.toString()}
            icon={Database}
          />
          <OverviewMetric
            title={t("dashboard.systemStatus.documents", "Documents")}
            value={totalDocs.toString()}
            icon={HardDrive}
          />
        </div>

        <QuickActions onNew={() => navigate("/knowledge")} onConnect={() => navigate("/connect")} onTasks={() => navigate("/task")} />

        <AgentOverviewCard
          totalAgents={totalAgents}
          mineCount={mineCount}
          unsyncedCount={unsyncedCount}
          missingCount={missingCount}
        />

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.recentKnowledge")}</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">{t("common.noData")}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {recent.map((kb) => (
                  <button
                    key={kb.id}
                    type="button"
                    onClick={() => navigate(`/knowledge/${kb.id}`)}
                    className="bg-background hover:bg-muted/50 ring-foreground/10 hover:ring-foreground/20 flex items-center justify-between rounded-lg p-3 text-left ring-1 transition-all"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{kb.name}</p>
                      {kb.description && <p className="text-muted-foreground mt-0.5 truncate text-xs">{kb.description}</p>}
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">{kb.doc_count} docs</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        <GatewayStatusCard />

        <ChatOverviewCard
          totalSessions={sessions.length}
          activeSessions={activeSessions}
          totalMessages={totalMessages}
          totalUnread={totalUnread}
        />

        <RecentActivityCard events={monitorEvents} />
      </div>
    </div>
  )
}

function OverviewMetric({ title, value, icon: Icon }: { title: string; value: string; icon: LucideIcon }) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
            <Icon className="size-5" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{title}</p>
            <p className="text-2xl leading-tight font-bold tracking-tight">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickActions({ onNew, onConnect, onTasks }: { onNew: () => void; onConnect: () => void; onTasks: () => void }) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.quickActions.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onNew}>
            <Plus className="mr-1.5 size-4" />
            {t("dashboard.quickActions.newKnowledge")}
          </Button>
          <Button variant="outline" size="sm" onClick={onConnect}>
            <Plug className="mr-1.5 size-4" />
            {t("dashboard.quickActions.connect")}
          </Button>
          <Button variant="outline" size="sm" onClick={onTasks}>
            <ListChecks className="mr-1.5 size-4" />
            {t("dashboard.quickActions.viewTasks")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ChatOverviewCard({
  totalSessions,
  activeSessions,
  totalMessages,
  totalUnread,
}: {
  totalSessions: number
  activeSessions: number
  totalMessages: number
  totalUnread: number
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <MessageSquare className="size-4" />
            {t("dashboard.chatOverview.title", "Chat Overview")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">{t("dashboard.chatOverview.totalSessions", "Total Sessions")}</p>
            <p className="text-xl font-bold">{totalSessions}</p>
            <p className="text-muted-foreground text-xs">{activeSessions} active</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">{t("dashboard.chatOverview.totalMessages", "Total Messages")}</p>
            <p className="text-xl font-bold">{totalMessages}</p>
            {totalUnread > 0 && (
              <p className="text-xs text-amber-500">{totalUnread} unread</p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => navigate("/chat")}>
          <MessageSquare className="mr-1.5 size-4" />
          Open Chat
        </Button>
      </CardContent>
    </Card>
  )
}

function AgentOverviewCard({
  totalAgents,
  mineCount,
  unsyncedCount,
  missingCount,
}: {
  totalAgents: number
  mineCount: number
  unsyncedCount: number
  missingCount: number
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <Bot className="size-4" />
            {t("dashboard.agentOverview.title", "Agent Overview")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">{t("dashboard.agentOverview.totalAgents", "Total Agents")}</span>
            <span className="text-xl font-bold">{totalAgents}</span>
          </div>
          <div className="space-y-2">
            <StatusBar label={t("dashboard.agentOverview.mine", "Synced")} count={mineCount} total={totalAgents} color="bg-emerald-500" />
            <StatusBar label={t("dashboard.agentOverview.unsynced", "Unsynced")} count={unsyncedCount} total={totalAgents} color="bg-amber-500" />
            <StatusBar label={t("dashboard.agentOverview.missing", "Missing")} count={missingCount} total={totalAgents} color="bg-red-500" />
          </div>
        </div>
        <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => navigate("/agent")}>
          <Bot className="mr-1.5 size-4" />
          Manage Agents
        </Button>
      </CardContent>
    </Card>
  )
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">
          {count} ({pct}%)
        </span>
      </div>
      <div className="bg-secondary h-1.5 w-full overflow-hidden rounded-full">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function GatewayStatusCard() {
  const { t } = useTranslation()
  const status = useGatewayStore((s) => s.status)
  const url = useGatewayStore((s) => s.url)
  const ping = useGatewayStore((s) => s.pingLatencyMs)

  const label = status === "connected" && url ? url.replace("ws://", "") : t(`connect.status.${status}`)

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <Activity className="size-4" />
            Gateway Node
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`size-2 rounded-full ${gatewayDotColor(status)}`} />
            <span className="text-sm leading-none font-medium">{t(`connect.status.${status}`)}</span>
          </div>
          <p className="text-muted-foreground font-mono text-xs">{label}</p>
          {status === "connected" && ping != null && <p className="text-muted-foreground font-mono text-xs">{ping}ms</p>}
        </div>
      </CardContent>
    </Card>
  )
}

interface MonitorEventItem {
  id: string
  time: string
  msg: string
  ts: number
}

function RecentActivityCard({ events }: { events: MonitorEventItem[] }) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <Terminal className="size-4" />
            {t("dashboard.activityTitle", "Recent Activity")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">{t("dashboard.activityEmpty", "No activity yet")}</p>
        ) : (
          <div className="space-y-4">
            {events.map((log, i) => (
              <div key={log.id} className="flex gap-4">
                <div className="text-muted-foreground mt-[3px] w-16 shrink-0 text-right font-mono text-[10px] leading-none">{log.time}</div>
                <div className="relative pt-0.5 pb-5 last:pb-0">
                  {i !== events.length - 1 && <div className="bg-foreground/10 absolute top-4 bottom-0 left-[3.5px] w-[1px]" />}
                  <div className="border-background bg-primary absolute top-1 left-0 size-2 rounded-full border-[1.5px]" />
                  <p className="text-foreground/80 pl-4 text-sm leading-snug">{log.msg}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatMonitorEvent(event: { hookName: string; ctx?: { agentId?: string }; event?: unknown }): string {
  const agentId = event.ctx?.agentId ?? "unknown"
  switch (event.hookName) {
    case "llm_input":
      return `Agent ${agentId} started LLM call`
    case "llm_output":
      return `Agent ${agentId} received LLM response`
    case "agent_end":
      return `Agent ${agentId} completed turn`
    case "before_tool_call":
      return `Agent ${agentId} calling tool`
    case "after_tool_call":
      return `Agent ${agentId} tool call completed`
    case "message_received":
      return `Agent ${agentId} received message`
    case "message_sending":
      return `Agent ${agentId} sending message`
    case "message_sent":
      return `Agent ${agentId} message sent`
    default:
      return `Agent ${agentId}: ${event.hookName}`
  }
}
