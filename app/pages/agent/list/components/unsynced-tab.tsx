import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AgentCard } from "./card"
import type { AgentListResult } from "@contracts/agent"

interface Props {
  entries: AgentListResult["unsynced"]
  onChanged: () => void
}

export function UnsyncedTab({ entries, onChanged }: Props) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const handleSyncAll = async () => {
    if (entries.length === 0) return
    setLoading(true)
    try {
      const res = await window.electron.agent.importUnsynced({ agentIds: entries.map((e) => e.agentId) })
      toast.success(t("agent.toast.sync.success", { n: res.imported }))
      onChanged()
    } catch (err) {
      toast.error(t("agent.toast.sync.error", { msg: (err as Error).message }))
    } finally {
      setLoading(false)
    }
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-muted-foreground py-10 text-center text-sm">{t("agent.list.unsyncedEmpty")}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted/40 ring-foreground/10 flex items-center justify-between rounded-lg px-4 py-3 ring-1">
        <p className="text-sm">{t("agent.list.unsyncedBanner", { count: entries.length })}</p>
        <div className="shrink-0">
          <Button size="sm" onClick={handleSyncAll} disabled={loading}>
            {t("agent.list.syncAll")}
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((e) => (
          <AgentCard
            key={e.agentId}
            id={e.agentId}
            name={e.gateway?.name}
            workspace={e.gateway?.workspace}
            modelPrimary={e.gateway?.model?.primary}
            avatarUrl={e.gateway?.identity?.avatarUrl}
            emoji={e.gateway?.identity?.emoji}
          />
        ))}
      </div>
    </div>
  )
}
