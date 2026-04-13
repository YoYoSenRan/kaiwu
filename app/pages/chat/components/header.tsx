import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useChatStore } from "@/stores/chat"
import { Brain, Pause, Play, Square, Wrench } from "lucide-react"

interface ChatHeaderProps {
  chat: { id: string; title: string; mode: string; config: string }
}

/** 中间面板顶栏，展示当前对话标题和圆桌控制按钮。 */
export function ChatHeader({ chat }: ChatHeaderProps) {
  const { t } = useTranslation()
  const members = useChatStore((s) => s.members)
  const roundtableStatus = useChatStore((s) => s.roundtableStatus)
  const currentRound = useChatStore((s) => s.currentRound)

  const isRoundtable = chat.mode === "roundtable"

  const config = useMemo(() => {
    try {
      return JSON.parse(chat.config) as Record<string, unknown>
    } catch {
      return {}
    }
  }, [chat.config])
  const showToolCalls = config.showToolCalls === true
  const showThinking = config.showThinking === true

  const toggleConfig = (key: string, current: boolean) => {
    window.electron.chat
      .updateConfig(chat.id, { [key]: !current })
      .then(() => window.electron.chat.detail(chat.id))
      .then((updated) => {
        const chats = useChatStore.getState().chats.map((c) => (c.id === updated.id ? updated : c))
        useChatStore.getState().setChats(chats)
      })
  }

  return (
    <div className="border-border flex shrink-0 items-center justify-between border-b px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        {isRoundtable ? (
          <div className="flex -space-x-1.5">
            {members.slice(0, 4).map((m, i) => (
              <span
                key={m.agent_id}
                className="bg-muted text-muted-foreground border-background flex size-7 items-center justify-center rounded-full border-2 text-xs font-medium"
                style={{ zIndex: members.length - i }}
              >
                {(m.agent_id ?? "?").slice(0, 2).toUpperCase()}
              </span>
            ))}
          </div>
        ) : (
          <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-full text-xs font-medium">
            {members[0]?.agent_id?.slice(0, 2).toUpperCase() ?? "AI"}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{chat.title}</p>
          {isRoundtable && roundtableStatus !== "idle" && (
            <p className="text-muted-foreground text-xs">
              {roundtableStatus === "running" ? `${t("chat.roundtable.discussing")} · ${t("chat.roundtable.round", { n: currentRound })}` : t("chat.status.paused")}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => toggleConfig("showToolCalls", showToolCalls)}
          title={t("chat.toggle.toolCalls")}
          className={showToolCalls ? "text-foreground" : "text-muted-foreground/40"}
        >
          <Wrench className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => toggleConfig("showThinking", showThinking)}
          title={t("chat.toggle.thinking")}
          className={showThinking ? "text-foreground" : "text-muted-foreground/40"}
        >
          <Brain className="size-3.5" />
        </Button>

        {isRoundtable && (
          <>
            {roundtableStatus === "idle" && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.electron.chat.roundtable.start(chat.id, chat.title)}>
                <Play className="size-3.5" />
                {t("chat.roundtable.start")}
              </Button>
            )}
            {roundtableStatus === "running" && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.electron.chat.roundtable.pause(chat.id)}>
                <Pause className="size-3.5" />
                {t("chat.roundtable.pause")}
              </Button>
            )}
            {roundtableStatus === "paused" && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.electron.chat.roundtable.resume(chat.id)}>
                <Play className="size-3.5" />
                {t("chat.roundtable.resume")}
              </Button>
            )}
            {roundtableStatus !== "idle" && (
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => window.electron.chat.roundtable.stop(chat.id)}>
                <Square className="size-3.5" />
                {t("chat.roundtable.stop")}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
