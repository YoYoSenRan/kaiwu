import { useTranslation } from "react-i18next"
import { Users, Bot, Info } from "lucide-react"

export function ChatDetails() {
  const { t } = useTranslation()

  return (
    <div className="hidden w-72 flex-col overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10 xl:flex">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-border/50 px-5">
        <Info className="size-5 text-muted-foreground" />
        <h3 className="text-sm font-semibold tracking-tight">{t("chat.details.title", "Chat Details")}</h3>
      </div>
      <div className="flex-1 space-y-8 overflow-y-auto p-5">
        <div className="space-y-4">
          <h4 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{t("chat.details.participants", "Participants")}</h4>
          <div className="-mx-2 space-y-1">
            <div className="group flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/50">
              <div className="flex size-9 items-center justify-center rounded-full border border-primary/20 bg-primary/10 shadow-sm transition-colors group-hover:bg-primary/20">
                <Bot className="size-5 text-primary" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="mb-1.5 text-sm leading-none font-medium">{t("chat.agent.coder.name", "Coder Agent")}</span>
                <span className="text-[11px] leading-none text-muted-foreground">{t("chat.agent.coder.desc", "Writes & reviews code")}</span>
              </div>
            </div>
            <div className="group flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/50">
              <div className="flex size-9 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 shadow-sm transition-colors group-hover:bg-blue-500/20">
                <Users className="size-5 text-blue-500" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="mb-1.5 text-sm leading-none font-medium">{t("chat.agent.designer.name", "Designer Agent")}</span>
                <span className="text-[11px] leading-none text-muted-foreground">{t("chat.agent.designer.desc", "UI/UX guidance")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t border-border/50 pt-6">
          <h4 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{t("chat.details.configuration", "Configuration")}</h4>
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("chat.details.defaultModel", "Default Model")}</span>
              <span className="font-medium">GPT-4 Turbo</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("chat.details.toolsAvailable", "Tools Available")}</span>
              <span className="font-medium text-primary">{t("chat.details.enabledCount", "5 Enabled")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
