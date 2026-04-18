import { useTranslation } from "react-i18next"
import { Info, Bot } from "lucide-react"
import { useChatDataStore, useChatUiStore } from "@/stores/chat"

export function ChatDetails() {
  const { t } = useTranslation()
  const currentSessionId = useChatUiStore((s) => s.currentSessionId)
  const members = useChatDataStore((s) => (currentSessionId ? (s.members[currentSessionId] ?? []) : []))

  return (
    <div className="bg-card text-card-foreground ring-foreground/10 hidden w-72 flex-col overflow-hidden rounded-xl ring-1 xl:flex">
      <div className="border-border/50 flex h-16 shrink-0 items-center gap-2 border-b px-5">
        <Info className="text-muted-foreground size-5" />
        <h3 className="text-sm font-semibold tracking-tight">{t("chat.details.title")}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-4">
          <h4 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">{t("chat.details.participants")}</h4>
          {members.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("chat.members.empty")}</p>
          ) : (
            <div className="-mx-2 space-y-1">
              {members.map((m) => (
                <div key={m.id} className="hover:bg-muted/50 flex items-center gap-3 rounded-md p-2 transition-colors">
                  <div className="bg-primary/10 ring-primary/20 flex size-9 items-center justify-center rounded-full ring-1">
                    <Bot className="text-primary size-5" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="mb-1.5 text-sm leading-none font-medium">{m.agentId}</span>
                    <span className="text-muted-foreground text-[11px] leading-none">{m.replyMode}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
