import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useAgents } from "../hooks/use-agents"
import { AgentGrid } from "./components/grid"
import { Card, CardContent } from "@/components/ui/card"
import { Bot, Plus, RefreshCw, Trash2 } from "lucide-react"
import { CreateAgentDialog } from "../components/create-dialog"

/**
 * 智能体列表页（路由 /agent）。
 *
 * 列表数据由 useAgents hook 管理，通过全局 useAgentsStore 缓存；点击卡片后走路由
 * 跳转到 /agent/:id，详情页通过 agent.detail ipc 独立拉取数据（不依赖本页 store）。
 */
export default function AgentList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { rows, syncing, error, refresh, sync } = useAgents()
  const [createOpen, setCreateOpen] = useState(false)

  const orphans = rows.filter((r) => r.sync_state === "orphan-local").length

  const cleanup = async () => {
    const removed = await window.electron.agent.cleanupOrphans()
    if (removed > 0) await refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{t("agent.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("agent.description")}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {orphans > 0 && (
            <Button variant="outline" size="sm" onClick={cleanup} className="gap-1.5">
              <Trash2 className="size-3.5" />
              {t("agent.sync.cleanOrphans", { count: orphans })}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={sync} disabled={syncing} className="gap-1.5">
            <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? t("agent.sync.syncing") : t("agent.sync.button")}
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="size-3.5" />
            {t("agent.createAgent")}
          </Button>
        </div>
      </div>

      {error && <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-xs">{t("agent.sync.syncFailed", { message: error })}</div>}

      {rows.length === 0 && !syncing ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="bg-muted flex size-12 items-center justify-center rounded-full">
              <Bot className="text-muted-foreground size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("agent.emptyTitle")}</p>
              <p className="text-muted-foreground text-xs">{t("agent.emptyDescription")}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              {t("agent.createAgent")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <AgentGrid rows={rows} onSelect={(id) => navigate(`/agent/${id}`)} />
      )}

      <CreateAgentDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refresh} />
    </div>
  )
}
