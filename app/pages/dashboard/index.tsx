import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useGatewayStore } from "@/stores/gateway"
import { gatewayDotColor } from "@/utils/gateway"
import { ListChecks, Plug, Plus } from "lucide-react"

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
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <QuickActions onNew={() => navigate("/knowledge")} onConnect={() => navigate("/connect")} onTasks={() => navigate("/task")} />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("dashboard.recentKnowledge")}</CardTitle>
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
                    className="hover:bg-muted/50 flex items-center justify-between rounded-md border p-3 text-left transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{kb.name}</p>
                      {kb.description && <p className="text-muted-foreground truncate text-xs">{kb.description}</p>}
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">{kb.doc_count} docs</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <GatewayStatusCard />
        <SystemOverviewCard kbCount={list.length} docCount={totalDocs} />
      </div>
    </div>
  )
}

function QuickActions({ onNew, onConnect, onTasks }: { onNew: () => void; onConnect: () => void; onTasks: () => void }) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t("dashboard.quickActions.title")}</CardTitle>
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
        <CardTitle className="text-sm font-medium">Gateway</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${gatewayDotColor(status)}`} />
          <span className="text-sm font-medium">{t(`connect.status.${status}`)}</span>
        </div>
        <p className="text-muted-foreground font-mono text-xs">{label}</p>
        {status === "connected" && ping != null && <p className="text-muted-foreground font-mono text-xs">{ping}ms</p>}
      </CardContent>
    </Card>
  )
}

function SystemOverviewCard({ kbCount, docCount }: { kbCount: number; docCount: number }) {
  const { t } = useTranslation()
  const items = [
    { label: t("dashboard.systemStatus.tasks"), value: 0 },
    { label: t("dashboard.systemStatus.knowledgeBases"), value: kbCount },
    { label: t("dashboard.systemStatus.documents"), value: docCount },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t("dashboard.systemStatus.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-center">
          {items.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="text-2xl font-bold">{item.value}</div>
              <div className="text-muted-foreground text-xs">{item.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
