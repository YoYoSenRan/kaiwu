import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { MessageSquare, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useChatDataStore, useChatUiStore } from "@/stores/chat"

export function ChatSidebar() {
  const { t } = useTranslation()
  const sessions = useChatDataStore((s) => s.sessions)
  const refreshSessions = useChatDataStore((s) => s.refreshSessions)
  const refreshMessages = useChatDataStore((s) => s.refreshMessages)
  const refreshMembers = useChatDataStore((s) => s.refreshMembers)
  const currentSessionId = useChatUiStore((s) => s.currentSessionId)
  const setCurrent = useChatUiStore((s) => s.setCurrent)

  useEffect(() => {
    refreshSessions()
  }, [refreshSessions])

  function handleSelect(id: string) {
    setCurrent(id)
    refreshMessages(id)
    refreshMembers(id)
  }

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
        {sessions.length === 0 ? (
          <p className="text-muted-foreground px-3 py-4 text-center text-sm">{t("chat.sessions.empty")}</p>
        ) : (
          sessions.map((s) => {
            const active = s.id === currentSessionId
            return (
              <button
                key={s.id}
                onClick={() => handleSelect(s.id)}
                className={`hover:bg-muted/80 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${active ? "bg-primary/10 text-primary font-medium" : "text-foreground"}`}
              >
                <MessageSquare className={`size-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <div className="flex w-full flex-col items-start truncate">
                  <span className="mb-1.5 w-full truncate text-left leading-none">{s.label ?? s.id}</span>
                  <span className={`text-[11px] leading-none ${active ? "text-primary/70" : "text-muted-foreground"}`}>{s.mode}</span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
