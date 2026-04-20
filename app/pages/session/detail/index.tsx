import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ArrowLeft } from "lucide-react"
import { NavLink, useParams } from "react-router"
import { ModeBadge } from "../components/mode-badge"
import { useSessionDetail } from "../hooks/use-session-detail"
import { StatsPanel } from "./components/stats-panel"
import { Timeline } from "./components/timeline"
import { TurnInspector } from "./components/turn-inspector"

export default function SessionDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { detail, loading, error } = useSessionDetail(id)
  const [inspectTurnId, setInspectTurnId] = useState<string | null>(null)

  if (!id) return <div className="text-muted-foreground p-8 text-sm">{t("session.detail.noId")}</div>
  if (loading && !detail) return <div className="text-muted-foreground p-8 text-sm">{t("session.detail.loading")}</div>
  if (error) return <div className="text-destructive p-8 text-sm">{t("session.detail.error", { msg: error })}</div>
  if (!detail) return <div className="text-muted-foreground p-8 text-sm">{t("session.detail.notFound")}</div>

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <NavLink to="/session" className="btn-focus text-muted-foreground hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors">
          <ArrowLeft className="size-4" />
        </NavLink>
        <ModeBadge mode={detail.session.mode} />
        <h1 className="truncate text-base font-semibold tracking-tight">{detail.session.label ?? t("session.untitled")}</h1>
        <span className="text-muted-foreground ml-1 truncate font-mono text-[11px]">{detail.session.id}</span>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="bg-card ring-foreground/10 flex-1 overflow-y-auto rounded-xl p-4 ring-1">
          <Timeline messages={detail.messages} onInspectTurn={setInspectTurnId} />
        </div>
        <StatsPanel session={detail.session} messages={detail.messages} turns={detail.turns} />
      </div>

      <TurnInspector turnRunId={inspectTurnId} turns={detail.turns} messages={detail.messages} onClose={() => setInspectTurnId(null)} />
    </div>
  )
}
