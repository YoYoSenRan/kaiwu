import { useTranslation } from "react-i18next"
import { Send, Sparkles, Users, Bot, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ChatMain() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 px-5">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <div className="z-10 flex size-9 items-center justify-center rounded-full bg-primary/20 ring-2 ring-background">
              <Bot className="size-5 text-primary" />
            </div>
            <div className="z-0 flex size-9 items-center justify-center rounded-full bg-blue-500/20 ring-2 ring-background">
              <Users className="size-5 text-blue-500" />
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="mb-1.5 text-sm leading-none font-semibold tracking-tight">{t("chat.sample.title", "UI Layout Design")}</h2>
            <p className="text-[11px] leading-none text-muted-foreground">{t("chat.sample.description", "Multi-agent collaboration")}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <MoreVertical />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex h-full items-center justify-center">
          <div className="flex animate-in flex-col items-center gap-5 text-center fade-in zoom-in duration-500">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent shadow-sm ring-1 ring-primary/20">
              <Sparkles className="size-8 text-primary" />
            </div>
            <div className="space-y-1.5">
              <p className="text-lg font-medium tracking-tight text-foreground">{t("chat.empty", "How can I help you today?")}</p>
              <p className="mx-auto max-w-[280px] text-sm leading-relaxed text-muted-foreground">
                {t("chat.empty.description", "Ask questions, explore knowledge bases, or trigger local tools.")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-border/50 p-4">
        <div className="flex items-center gap-2">
          <Input placeholder={t("chat.placeholder", "Ask anything... (@ to mention agents)")} />
          <Button size="icon">
            <Send />
          </Button>
        </div>
      </div>
    </div>
  )
}
