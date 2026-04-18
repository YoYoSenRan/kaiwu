import { useNavigate, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AgentDetailHeader } from "./components/header"
import { OverviewTab } from "./components/overview-tab"
import { WorkspaceTab } from "./components/workspace-tab"
import { SkillsTab } from "./components/skills-tab"
import { SettingsTab } from "./components/settings-tab"
import { useAgentDetail } from "./hooks/use-agent-detail"

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { detail, loading, refresh } = useAgentDetail(id)

  if (!id) return null

  if (loading && !detail) {
    return <DetailSkeleton />
  }

  if (!detail) return null

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <AgentDetailHeader detail={detail} />

      <div className="tabs-fill">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">{t("agent.tabs.overview")}</TabsTrigger>
            <TabsTrigger value="workspace">{t("agent.tabs.workspace")}</TabsTrigger>
            <TabsTrigger value="skills">{t("agent.tabs.skills")}</TabsTrigger>
            <TabsTrigger value="settings">{t("agent.tabs.settings")}</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <div className="min-h-0 flex-1 overflow-y-auto p-0.5">
              <OverviewTab detail={detail} />
            </div>
          </TabsContent>
          <TabsContent value="workspace">
            <div className="flex min-h-0 flex-1 flex-col p-0.5">
              <WorkspaceTab detail={detail} onRefresh={refresh} />
            </div>
          </TabsContent>
          <TabsContent value="skills">
            <div className="min-h-0 flex-1 overflow-y-auto p-0.5">
              <SkillsTab detail={detail} />
            </div>
          </TabsContent>
          <TabsContent value="settings">
            <div className="min-h-0 flex-1 overflow-y-auto p-0.5">
              <SettingsTab detail={detail} onUpdated={refresh} onDeleted={() => navigate("/agent")} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="size-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-32" />
      </div>
      <Skeleton className="h-9 w-80 rounded-lg" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}
