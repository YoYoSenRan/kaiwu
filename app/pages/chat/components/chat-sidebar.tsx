import { useTranslation } from "react-i18next"
import { MessageSquare, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ChatSidebar() {
  const { t } = useTranslation()

  return (
    <div className="hidden w-64 flex-col overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10 md:flex lg:w-72">
      <div className="flex shrink-0 flex-col gap-3 border-b border-border/50 p-4">
        <Button>
          <Plus />
          <span>{t("chat.new", "New Chat")}</span>
        </Button>
        <Input placeholder={t("chat.search", "Search history...")} />
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors hover:bg-muted/80 ${i === 1 ? "bg-primary/10 font-medium text-primary" : "text-foreground"}`}
          >
            <MessageSquare className={`size-4 shrink-0 ${i === 1 ? "text-primary" : "text-muted-foreground"}`} />
            <div className="flex w-full flex-col items-start truncate">
              <span className="mb-1.5 w-full truncate text-left leading-none">
                {i === 1 ? t("chat.sample.title", "UI Layout Design") : `${t("chat.sample.previous", "Previous Session")} ${i}`}
              </span>
              <span className={`text-[11px] leading-none ${i === 1 ? "text-primary/70" : "text-muted-foreground"}`}>
                {i === 1 ? t("chat.time.justNow", "Just now") : `${i} ${t("chat.time.hoursAgo", "hours ago")}`}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
