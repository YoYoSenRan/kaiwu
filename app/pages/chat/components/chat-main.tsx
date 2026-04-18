import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Send, Sparkles, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useChatDataStore, useChatUiStore } from "@/stores/chat"
import type { ChatMessage } from "../../../../electron/features/chat/types"

/** 稳定的空数组引用，避免 zustand selector 每次返回新 `[]` 触发无限重渲染。 */
const EMPTY_MESSAGES: ChatMessage[] = []

function messageText(msg: ChatMessage): string {
  const c = msg.content as { text?: string } | null
  return c?.text ?? ""
}

export function ChatMain() {
  const { t } = useTranslation()
  const [input, setInput] = useState("")

  const currentSessionId = useChatUiStore((s) => s.currentSessionId)
  const sessions = useChatDataStore((s) => s.sessions)
  const messages = useChatDataStore((s) => (currentSessionId ? (s.messages[currentSessionId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES))
  const pending = useChatDataStore((s) => s.pending)
  const setPending = useChatDataStore((s) => s.setPending)

  const session = sessions.find((s) => s.id === currentSessionId) ?? null
  const isHitl = pending !== null && pending.sessionId === currentSessionId

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const text = input.trim()
    if (!text || !currentSessionId) return
    setInput("")
    if (isHitl && pending) {
      await window.electron.chat.message.answer(currentSessionId, { pendingId: pending.pendingId, answer: text })
      setPending(null)
    } else {
      await window.electron.chat.message.send(currentSessionId, text)
    }
  }

  if (!currentSessionId) {
    return (
      <div className="bg-card text-card-foreground ring-foreground/10 flex flex-1 items-center justify-center rounded-xl ring-1">
        <p className="text-muted-foreground text-sm">{t("chat.select")}</p>
      </div>
    )
  }

  return (
    <div className="bg-card text-card-foreground ring-foreground/10 flex flex-1 flex-col overflow-hidden rounded-xl ring-1">
      <div className="border-border/50 flex h-16 shrink-0 items-center justify-between border-b px-5">
        <h2 className="text-sm font-semibold tracking-tight">{session?.label ?? currentSessionId}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
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
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isUser = msg.senderType === "user"
              return (
                <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {messageText(msg)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-border/50 shrink-0 border-t p-4">
        {isHitl && pending && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{t("chat.hitl.prompt", { agentId: pending.byAgentId, question: pending.question })}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("chat.placeholder")} />
          <Button size="icon" type="submit" disabled={!input.trim()}>
            <Send />
          </Button>
        </form>
      </div>
    </div>
  )
}
