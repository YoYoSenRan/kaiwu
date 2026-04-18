import { Plus, WifiOff } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MineTab } from "./components/mine-tab"
import { UnsyncedTab } from "./components/unsynced-tab"
import { MissingTab } from "./components/missing-tab"
import { CreateAgentDialog } from "../components/create-dialog"
import { useAgentList } from "../hooks/use-agents"

export default function AgentList() {
  const { t } = useTranslation()
  const { data, loading, refresh } = useAgentList()
  const [createOpen, setCreateOpen] = useState(false)
  const [tab, setTab] = useState<"mine" | "unsynced" | "missing">("mine")

  const mine = data?.mine ?? []
  const unsynced = data?.unsynced ?? []
  const missing = data?.missing ?? []
  const gatewayReady = data?.gatewayReady ?? false
  const gatewayEmpty = data?.gatewayEmpty ?? false

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-base font-semibold tracking-tight">{t("agent.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("agent.description")}</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!gatewayReady}>
          <Plus className="mr-1.5 size-4" />
          {t("agent.create")}
        </Button>
      </div>

      {!loading && !gatewayReady && (
        <div className="shrink-0">
          <Card>
            <CardContent>
              <div className="text-muted-foreground flex items-center gap-3 py-3 text-sm">
                <WifiOff className="size-4 shrink-0" />
                <span>{t("agent.list.gatewayOffline")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {gatewayReady && gatewayEmpty && (
        <div className="bg-destructive/10 text-destructive ring-destructive/30 shrink-0 rounded-lg px-4 py-3 ring-1">
          <p className="text-sm">{t("agent.list.emptyGateway")}</p>
        </div>
      )}

      <div className="tabs-fill">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "mine" | "unsynced" | "missing")}>
          <TabsList>
            <TabsTrigger value="mine">
              <span>{t("agent.tabs.list.mine")}</span>
              <Badge variant="secondary">{mine.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="unsynced">
              <span>{t("agent.tabs.list.unsynced")}</span>
              <Badge variant={unsynced.length > 0 ? "default" : "secondary"}>{unsynced.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="missing">
              <span>{t("agent.tabs.list.missing")}</span>
              <Badge variant={missing.length > 0 ? "destructive" : "secondary"}>{missing.length}</Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="mine">
            <div className="min-h-0 flex-1 overflow-y-auto p-0.5">
              <MineTab entries={mine} />
            </div>
          </TabsContent>
          <TabsContent value="unsynced">
            <div className="min-h-0 flex-1 overflow-y-auto p-0.5">
              <UnsyncedTab entries={unsynced} onChanged={refresh} />
            </div>
          </TabsContent>
          <TabsContent value="missing">
            <div className="min-h-0 flex-1 overflow-y-auto p-0.5">
              <MissingTab entries={missing} onChanged={refresh} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CreateAgentDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refresh} />
    </div>
  )
}
