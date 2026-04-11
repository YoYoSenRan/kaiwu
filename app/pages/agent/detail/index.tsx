import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { OverviewTab } from "./components/overview-tab"
import { Trash2 } from "lucide-react"
import { SessionsTab } from "./components/sessions-tab"
import { WorkspaceTab } from "./components/workspace-tab"
import { useAgentDetail } from "./hooks/use-agent-detail"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeleteAgentDialog } from "../components/delete-dialog"

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

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <span className="text-xl">{row.emoji || "🤖"}</span>
            <span className="truncate">{row.name}</span>
          </h1>
          <p className="text-muted-foreground mt-1 font-mono text-xs">{row.agent}</p>
        </div>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0 gap-2" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="size-4" />
          {t("agent.delete.confirm")}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="grid w-fit shrink-0 grid-cols-3">
          <TabsTrigger value="overview">{t("agent.tab.overview")}</TabsTrigger>
          <TabsTrigger value="workspace">{t("agent.tab.workspace")}</TabsTrigger>
          <TabsTrigger value="sessions">{t("agent.tab.sessions")}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="min-h-0 flex-1 overflow-y-auto">
          <OverviewTab row={row} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="workspace" className="min-h-0 flex-1 overflow-hidden">
          <WorkspaceTab row={row} />
        </TabsContent>
        <TabsContent value="sessions" className="min-h-0 flex-1 overflow-y-auto">
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
