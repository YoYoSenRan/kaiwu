import { useTranslation } from "react-i18next"
import { Send, Sparkles, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SAMPLE_AGENTS } from "../data"

export function ChatMain() {
  const { t } = useTranslation()

  return (
    <div className="bg-card text-card-foreground ring-foreground/10 flex flex-1 flex-col overflow-hidden rounded-xl ring-1">
      <div className="border-border/50 flex h-16 shrink-0 items-center justify-between border-b px-5">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {SAMPLE_AGENTS.map((agent, idx) => {
              const Icon = agent.icon
              return (
                <div
                  key={agent.id}
                  className={`ring-background flex size-9 items-center justify-center rounded-full ring-2 ${idx === 0 ? "bg-primary/10" : "bg-chart-2/10"}`}
                  style={{ zIndex: SAMPLE_AGENTS.length - idx }}
                >
                  <Icon className={`size-5 ${idx === 0 ? "text-primary" : "text-chart-2"}`} />
                </div>
              )
            })}
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="mb-1.5 text-sm leading-none font-semibold tracking-tight">{t("chat.sample.title")}</h2>
            <p className="text-muted-foreground text-[11px] leading-none">{t("chat.sample.description")}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <MoreVertical />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex h-full items-center justify-center">
          <div className="animate-in fade-in-0 zoom-in-95 flex flex-col items-center gap-5 text-center duration-500">
            <div className="from-primary/20 via-primary/10 ring-primary/20 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br to-transparent ring-1">
              <Sparkles className="text-primary size-8" />
            </div>
            <div className="space-y-1.5">
              <p className="text-foreground text-lg font-medium tracking-tight">{t("chat.empty.title")}</p>
              <p className="text-muted-foreground mx-auto max-w-[280px] text-sm leading-relaxed">{t("chat.empty.description")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-border/50 shrink-0 border-t p-4">
        <div className="flex items-center gap-2">
          <Input placeholder={t("chat.placeholder")} />
          <Button size="icon">
            <Send />
          </Button>
        </div>
      </div>
    </div>
  )
}
