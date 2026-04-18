import { useTranslation } from "react-i18next"
import { Send, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

export default function Chat() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 space-y-0.5">
        <h1 className="text-xl font-semibold tracking-tight">{t("chat.title", "Chat")}</h1>
        <p className="text-muted-foreground text-sm">{t("chat.description", "Interact with knowledge bases and tools")}</p>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden bg-background/50 border-border/50 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-border/5">
        {/* Chat messages area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-5 text-center animate-in fade-in zoom-in duration-500">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent ring-1 ring-primary/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                <Sparkles className="size-8 text-primary drop-shadow-[0_0_8px_rgba(var(--color-primary),0.5)]" />
              </div>
              <div className="space-y-1.5">
                <p className="text-lg font-medium tracking-tight text-foreground">{t("chat.empty", "How can I help you today?")}</p>
                <p className="text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
                  {t("chat.empty.description", "Ask questions, explore knowledge bases, or trigger local tools.")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-border/50 bg-background/80 p-4 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="relative group">
            <Input 
              placeholder={t("chat.placeholder", "Ask anything...")} 
              className="pr-12 bg-background/50 backdrop-blur-sm border-border/50 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] h-12 rounded-xl"
            />
            <Button size="icon" className="absolute right-1.5 top-1.5 size-9 rounded-lg transition-transform active:scale-95 group-focus-within:bg-primary group-focus-within:text-primary-foreground bg-primary/90">
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
