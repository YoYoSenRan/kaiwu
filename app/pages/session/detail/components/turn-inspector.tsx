import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Copy } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { useAgentCacheStore } from "@/stores/agent"
import type { ChatMessage, ChatTurn } from "../../../../../electron/features/chat/types"

interface Props {
  turnRunId: string | null
  turns: ChatTurn[]
  messages: ChatMessage[]
  onClose: () => void
}

/** 单 turn 详情:输入(trigger + sent_message) + 注入(system_prompt + history_text) + 输出(assistant reply)。 */
export function TurnInspector({ turnRunId, turns, messages, onClose }: Props) {
  const { t } = useTranslation()
  const [fetched, setFetched] = useState<ChatTurn | null>(null)
  const byAgentId = useAgentCacheStore((s) => s.byAgentId)

  // 优先本地 turns 列表找(详情 API 一次返全量);找不到再 fallback 调 IPC
  const local = useMemo(() => (turnRunId ? turns.find((tt) => tt.turnRunId === turnRunId) ?? null : null), [turnRunId, turns])
  const turn = local ?? fetched

  useEffect(() => {
    if (!turnRunId || local) return
    let cancelled = false
    void window.electron.chat.inspect
      .getTurn(turnRunId)
      .then((res) => {
        if (!cancelled) setFetched(res)
      })
      .catch(() => {
        if (!cancelled) setFetched(null)
      })
    return () => {
      cancelled = true
    }
  }, [turnRunId, local])

  if (!turnRunId) return null

  const trigger = turn ? messages.find((m) => m.id === turn.triggerMessageId) : undefined
  const assistant = messages.find((m) => m.turnRunId === turnRunId && m.senderType === "agent")
  const agent = turn ? byAgentId[turn.agentId] : undefined

  const triggerText = (trigger?.content as { text?: string } | null)?.text ?? ""
  const assistantText = (assistant?.content as { text?: string } | null)?.text ?? ""

  return (
    <Dialog open={turnRunId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[85vh] w-[min(90vw,760px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        <DialogHeader className="border-border/50 gap-2 border-b px-5 py-3 pr-12">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <span>{t("session.inspect.title")}</span>
            <span className="text-muted-foreground font-mono text-[11px]">{turnRunId}</span>
          </DialogTitle>
        </DialogHeader>

        {!turn ? (
          <div className="text-muted-foreground p-12 text-center text-sm">{t("session.inspect.notFound")}</div>
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <Meta turn={turn} agentName={agent?.name} />

            {trigger && (
              <Section title={t("session.inspect.trigger")} hint={`${trigger.senderType} · ${new Date(trigger.createdAtLocal).toLocaleTimeString()}`} text={triggerText} />
            )}

            <Section title={t("session.inspect.sentMessage")} hint={t("session.inspect.sentMessageHint")} text={turn.sentMessage} />

            <Section title={t("session.inspect.systemPrompt")} hint={t("session.inspect.systemPromptHint")} text={turn.systemPrompt} />

            {turn.historyText && (
              <Section title={t("session.inspect.historyText")} hint={t("session.inspect.historyTextHint")} text={turn.historyText} maxHeight="max-h-80" />
            )}

            {assistant && (
              <Section title={t("session.inspect.assistantReply")} hint={`${assistant.model ?? "?"} · ${assistant.stopReason ?? "?"}`} text={assistantText} tone="primary">
                {assistant.usage && (
                  <div className="text-muted-foreground mt-2 flex flex-wrap gap-3 text-[11px]">
                    {assistant.usage.input ? <span>↑{assistant.usage.input}</span> : null}
                    {assistant.usage.output ? <span>↓{assistant.usage.output}</span> : null}
                    {assistant.usage.cacheRead ? <span>R {assistant.usage.cacheRead}</span> : null}
                    {assistant.usage.cacheWrite ? <span>W {assistant.usage.cacheWrite}</span> : null}
                    {assistant.usage.total ? <span>total {assistant.usage.total}</span> : null}
                  </div>
                )}
              </Section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Meta({ turn, agentName }: { turn: ChatTurn; agentName?: string }) {
  const { t } = useTranslation()
  return (
    <div className="bg-muted grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-md p-3 text-[11px]">
      <MetaRow k={t("session.inspect.metaAgent")} v={agentName ?? turn.agentId} />
      <MetaRow k={t("session.inspect.metaModel")} v={turn.model ?? "—"} />
      <MetaRow k={t("session.inspect.metaSentAt")} v={new Date(turn.sentAt).toLocaleString()} />
      <MetaRow k={t("session.inspect.metaSessionKey")} v={turn.sessionKey} mono />
    </div>
  )
}

function MetaRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <span className="text-muted-foreground mr-1.5">{k}:</span>
      <span className={`${mono ? "font-mono text-[10px]" : ""} break-all`}>{v}</span>
    </div>
  )
}

/** 短内容(≤120 字符且无换行) → 紧凑 inline chip;长内容 → pre 多行块,避免 4xl 宽度下短字居左大片空白。 */
function Section({
  title,
  hint,
  text,
  maxHeight,
  tone,
  children,
}: {
  title: string
  hint?: string
  text: string
  maxHeight?: string
  tone?: "primary"
  children?: React.ReactNode
}) {
  const { t } = useTranslation()
  const isShort = text.length > 0 && text.length <= 120 && !text.includes("\n")
  const containerTone = tone === "primary" ? "bg-primary/5 ring-primary/20 ring-1" : "bg-muted"

  const onCopy = async () => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    toast.success(t("session.inspect.copied"))
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h4 className="text-xs font-semibold">{title}</h4>
          {hint && <span className="text-muted-foreground text-[10px]">{hint}</span>}
        </div>
        {text && (
          <button type="button" onClick={onCopy} className="btn-focus text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[10px]">
            <Copy className="size-2.5" /> {t("session.inspect.copy")}
          </button>
        )}
      </div>
      {!text ? (
        <span className="text-muted-foreground text-xs italic">(empty)</span>
      ) : isShort ? (
        <span className={`inline-block max-w-full rounded-md px-2 py-1 font-mono text-xs break-all ${containerTone}`}>{text}</span>
      ) : (
        <pre className={`${containerTone} overflow-x-auto rounded-md p-3 text-xs whitespace-pre-wrap ${maxHeight ?? ""}`}>{text}</pre>
      )}
      {children}
    </div>
  )
}
