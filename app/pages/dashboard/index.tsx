import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useGatewayStore } from "@/stores/gateway"
import { gatewayDotColor } from "@/utils/gateway"
import { Activity, BrainCircuit, Cpu, Database, HardDrive, ListChecks, Plug, Plus, Terminal } from "lucide-react"

type KnowledgeBase = Awaited<ReturnType<typeof window.electron.knowledge.base.list>>[number]

export default function Dashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [list, setList] = useState<KnowledgeBase[]>([])

  useEffect(() => {
    void window.electron.knowledge.base.list().then(setList)
  }, [])

  const recent = list.slice(0, 3)
  const totalDocs = list.reduce((sum, kb) => sum + (kb.doc_count ?? 0), 0)

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {/* 左侧主要区域 */}
      <div className="space-y-5 xl:col-span-2">
        {/* 系统概览指标 */}
        <div className="grid gap-5 sm:grid-cols-3">
          <OverviewMetric title={t("dashboard.systemStatus.tasks", "Tasks")} value="0" icon={ListChecks} />
          <OverviewMetric title={t("dashboard.systemStatus.knowledgeBases", "Knowledge Bases")} value={list.length.toString()} icon={Database} />
          <OverviewMetric title={t("dashboard.systemStatus.documents", "Documents")} value={totalDocs.toString()} icon={HardDrive} />
        </div>

        <QuickActions onNew={() => navigate("/knowledge")} onConnect={() => navigate("/connect")} onTasks={() => navigate("/task")} />

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

        <RecentActivityCard />
      </div>

      {/* 右侧边栏区域 */}
      <div className="space-y-5">
        <GatewayStatusCard />
        <ResourceUsageCard />
        <LocalModelsCard />
      </div>
    </div>
  )
}

function OverviewMetric({ title, value, icon: Icon }: { title: string; value: string; icon: any }) {
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

function ResourceUsageCard() {
  // 模拟的系统资源数据
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <Cpu className="size-4" />
            System Resources
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">CPU</span>
              <span className="font-mono">14%</span>
            </div>
            <div className="bg-secondary h-1.5 w-full overflow-hidden rounded-full">
              <div className="bg-primary h-full w-[14%]" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Memory (RAM)</span>
              <span className="font-mono">8.2 / 32 GB</span>
            </div>
            <div className="bg-secondary h-1.5 w-full overflow-hidden rounded-full">
              <div className="bg-primary h-full w-[25%]" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">GPU VRAM</span>
              <span className="font-mono">2.1 / 24 GB</span>
            </div>
            <div className="bg-secondary h-1.5 w-full overflow-hidden rounded-full">
              <div className="bg-primary h-full w-[8%]" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LocalModelsCard() {
  // 模拟的本地模型列表
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <BrainCircuit className="size-4" />
            Local AI Models
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-foreground/10 divide-y">
          <div className="flex items-center justify-between py-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Qwen-1.5-7B</p>
              <p className="text-muted-foreground text-xs">Text Generation</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
              <span className="size-1.5 rounded-full bg-emerald-500" /> Loaded
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">BGE-M3</p>
              <p className="text-muted-foreground text-xs">Embedding</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
              <span className="size-1.5 rounded-full bg-emerald-500" /> Loaded
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RecentActivityCard() {
  const { t } = useTranslation()
  // 模拟日志数据
  const logs = [
    { time: "Just now", msg: "Knowledge Base 'Internal Docs' index updated." },
    { time: "2m ago", msg: "Gateway connection established successfully." },
    { time: "15m ago", msg: "Model Qwen-1.5-7B loaded into memory (4.2GB)." },
    { time: "1h ago", msg: "System initialization completed." },
  ]

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
        <div className="space-y-4">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-4">
              <div className="text-muted-foreground mt-[3px] w-16 shrink-0 text-right font-mono text-[10px] leading-none">{log.time}</div>
              <div className="relative pt-0.5 pb-5 last:pb-0">
                {/* Timeline line */}
                {i !== logs.length - 1 && <div className="bg-foreground/10 absolute top-4 bottom-0 left-[3.5px] w-[1px]" />}
                {/* Timeline dot */}
                <div className="border-background bg-primary absolute top-1 left-0 size-2 rounded-full border-[1.5px]" />
                <p className="text-foreground/80 pl-4 text-sm leading-snug">{log.msg}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
