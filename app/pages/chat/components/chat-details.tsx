import { useTranslation } from "react-i18next"
import { Info } from "lucide-react"
import { AgentRow } from "./agent-row"
import { SAMPLE_AGENTS } from "../data"

export function ChatDetails() {
  const { t } = useTranslation()

  return (
    <div className="bg-card text-card-foreground ring-foreground/10 hidden w-72 flex-col overflow-hidden rounded-xl ring-1 xl:flex">
      <div className="border-border/50 flex h-16 shrink-0 items-center gap-2 border-b px-5">
        <Info className="text-muted-foreground size-5" />
        <h3 className="text-sm font-semibold tracking-tight">{t("chat.details.title")}</h3>
      </div>
      <div className="flex-1 space-y-8 overflow-y-auto p-5">
        <div className="space-y-4">
          <h4 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">{t("chat.details.participants")}</h4>
          <div className="-mx-2 space-y-1">
            {SAMPLE_AGENTS.map((agent) => (
              <AgentRow key={agent.id} agent={agent} />
            ))}
          </div>
        </div>

        <div className="border-border/50 space-y-4 border-t pt-6">
          <h4 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">{t("chat.details.configuration")}</h4>
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("chat.details.defaultModel")}</span>
              <span className="font-medium">GPT-4 Turbo</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("chat.details.toolsAvailable")}</span>
              <span className="text-primary font-medium">{t("chat.details.enabledCount", { count: 5 })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
