import { Unlink } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { AgentListResult } from "@contracts/agent"

interface Props {
  entries: AgentListResult["missing"]
  onChanged: () => void
}

export function MissingTab({ entries, onChanged }: Props) {
  const { t } = useTranslation()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const handleUnlink = async (agentId: string) => {
    setPendingId(agentId)
    try {
      await window.electron.agent.delete({ agentId, strategy: { kind: "unlink" } })
      toast.success(t("agent.toast.delete.unlink"))
      onChanged()
    } catch (err) {
      toast.error(t("agent.toast.delete.error", { msg: (err as Error).message }))
    } finally {
      setPendingId(null)
    }
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-muted-foreground py-10 text-center text-sm">{t("agent.list.missingEmpty")}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-destructive/10 text-destructive ring-destructive/30 rounded-lg px-4 py-3 ring-1">
        <p className="text-sm">{t("agent.list.missingBanner", { count: entries.length })}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((e) => (
          <Card key={e.agentId}>
            <CardContent>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-medium">{e.agentId}</p>
                  {e.local && (
                    <p className="text-muted-foreground/70 text-[11px]">
                      {new Date(e.local.createdAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => handleUnlink(e.agentId)} disabled={pendingId === e.agentId}>
                  <Unlink className="mr-1.5 size-4" />
                  {t("agent.list.unlink")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
