import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { OverviewTab } from "./components/overview-tab"
import { MessageSquare, Trash2 } from "lucide-react"
import { SessionsTab } from "./components/sessions-tab"
import { WorkspaceTab } from "./components/workspace-tab"
import { useAgentDetail } from "./hooks/use-agent-detail"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeleteAgentDialog } from "../components/delete-dialog"
import { useAgentsStore } from "@/stores/agents"

/**
 * 智能体详情页（路由 /agent/:id）。
 *
 * 和列表页完全解耦：直接调 agent.detail ipc 拉数据，不依赖 useAgentsStore，
 * 支持 deep link 访问（刷新 / 浏览器历史恢复 / URL 直达）。
 * Tab 内数据仍由各 tab 组件自己 lazy 加载（workspace 文件按需读、sessions 按 agentId 拉），
 * 保持原有 lazy loading 架构。
 */
export default function AgentDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, loading, error, refresh } = useAgentDetail(id)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-16 text-sm">
        <span>{t("common.loading")}</span>
      </div>
    )
  }

  if (error || !data) {
    return <div className="bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm">{error ?? t("agent.detail.notFound")}</div>
  }

  const row = data.row
  const live = useAgentsStore.getState().live[row.agent]
  const busy = live?.busy ?? false

  const startChat = () => navigate(`/chat?agentId=${row.agent}`)

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <span className="text-xl">{row.emoji || "🤖"}</span>
              <span className="truncate">{row.name}</span>
            </h1>
            {busy ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                {t("agent.card.busy")}
              </span>
            ) : (
              <span className="border-muted-foreground/20 bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium">
                <span className="bg-muted-foreground/60 size-1.5 rounded-full" />
                {t("agent.overview.idle")}
              </span>
            )}
            {row.sync_state === "orphan-local" && (
              <span className="border-destructive/30 bg-destructive/10 text-destructive inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                {t("agent.card.orphan")}
              </span>
            )}
            {row.sync_state === "workspace-missing" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-500">
                {t("agent.card.workspaceMissing")}
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1 font-mono text-xs">{row.agent}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={startChat}>
            <MessageSquare className="size-4" />
            {t("agent.overview.startChat")}
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0 gap-2" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" />
            {t("agent.delete.confirm")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="grid w-fit shrink-0 grid-cols-3">
          <TabsTrigger value="overview">{t("agent.tab.overview")}</TabsTrigger>
          <TabsTrigger value="workspace">{t("agent.tab.workspace")}</TabsTrigger>
          <TabsTrigger value="sessions">{t("agent.tab.sessions")}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <OverviewTab row={row} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="workspace" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <WorkspaceTab row={row} />
        </TabsContent>
        <TabsContent value="sessions" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <SessionsTab row={row} />
        </TabsContent>
      </Tabs>

      <DeleteAgentDialog
        row={confirmDelete ? row : null}
        onClose={() => setConfirmDelete(false)}
        onDeleted={() => {
          setConfirmDelete(false)
          navigate("/agent")
        }}
      />
    </div>
  )
}
