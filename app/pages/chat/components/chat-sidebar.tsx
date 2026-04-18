import { useTranslation } from "react-i18next"
import { MessageSquare, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SAMPLE_SESSIONS } from "../data"

export function ChatSidebar() {
  const { t } = useTranslation()

  return (
    <div className="bg-card text-card-foreground ring-foreground/10 hidden w-64 flex-col overflow-hidden rounded-xl ring-1 md:flex lg:w-72">
      <div className="border-border/50 flex shrink-0 flex-col gap-3 border-b p-4">
        <Button>
          <Plus />
          <span>{t("chat.new")}</span>
        </Button>
        <Input placeholder={t("chat.search")} />
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {SAMPLE_SESSIONS.map((s) => (
          <button
            key={s.id}
            className={`hover:bg-muted/80 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${s.active ? "bg-primary/10 text-primary font-medium" : "text-foreground"}`}
          >
            <MessageSquare className={`size-4 shrink-0 ${s.active ? "text-primary" : "text-muted-foreground"}`} />
            <div className="flex w-full flex-col items-start truncate">
              <span className="mb-1.5 w-full truncate text-left leading-none">{t(s.titleKey, s.titleParams)}</span>
              <span className={`text-[11px] leading-none ${s.active ? "text-primary/70" : "text-muted-foreground"}`}>{t(s.timeKey, s.timeParams)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
