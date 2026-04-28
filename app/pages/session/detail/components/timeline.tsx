import { useTranslation } from "react-i18next"
import { Bot, Eye, User as UserIcon } from "lucide-react"
import { useAgentCacheStore } from "@/stores/agent"
import type { ChatMessage } from "../../../../../electron/features/chat/types"

interface Props {
  messages: ChatMessage[]
  onInspectTurn: (turnRunId: string) => void
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function fmtCompact(n: number | undefined): string | null {
  if (!n || n <= 0) return null
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

/** 消息时间线:每条消息一行,点"查看本轮"看 turn 注入快照。 */
export function Timeline({ messages, onInspectTurn }: Props) {
  const { t } = useTranslation()
  const byAgentId = useAgentCacheStore((s) => s.byAgentId)

  if (messages.length === 0) {
    return <div className="text-muted-foreground flex-1 py-12 text-center text-sm">{t("session.detail.emptyMessages")}</div>
  }

  return (
    <div className="space-y-2">
      {messages.map((msg) => {
        const isUser = msg.senderType === "user"
        const isSystem = msg.senderType === "system"
        const isTool = msg.senderType === "tool"
        const agent = msg.senderId ? byAgentId[msg.senderId] : undefined
        const name = isUser ? t("session.detail.user") : isSystem ? "system" : isTool ? "tool" : (agent?.name ?? msg.senderId ?? "?")
        const text = (msg.content as { text?: string } | null)?.text ?? ""
        const isAborted = msg.tags?.includes("aborted")
        const usage = msg.usage
        const ttl = fmtCompact(usage?.total ?? (usage?.input ?? 0) + (usage?.output ?? 0))

        return (
          <div key={msg.id} className="bg-card ring-foreground/10 rounded-lg p-3 ring-1">
            <div className="flex items-start gap-2">
              <div className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md">
                {isUser ? (
                  <UserIcon className="size-3.5" />
                ) : agent?.identity?.avatarUrl ? (
                  <img src={agent.identity.avatarUrl} alt="" className="size-full object-cover" />
                ) : agent?.identity?.emoji ? (
                  <span className="text-xs">{agent.identity.emoji}</span>
                ) : (
                  <Bot className="size-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-semibold">{name}</span>
                  <span className="text-muted-foreground text-[10px]">·</span>
                  <span className="text-muted-foreground font-mono text-[10px]">{formatTime(msg.createdAtLocal)}</span>
                  <span className="text-muted-foreground text-[10px]">·</span>
                  <span className="text-muted-foreground text-[10px]">seq {msg.seq}</span>
                  {isAborted && <span className="text-destructive ml-1 text-[10px]">{t("chat.aborted")}</span>}
                  {msg.stopReason && msg.stopReason !== "end_turn" && msg.stopReason !== "stop" && msg.stopReason !== "stop_sequence" && !isAborted && (
                    <span className="text-muted-foreground ml-1 text-[10px]">· {msg.stopReason}</span>
                  )}
                </div>
                <div className="mt-1 text-xs leading-relaxed break-words whitespace-pre-wrap">{text || <span className="text-muted-foreground italic">(empty)</span>}</div>
                <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-2 text-[10px]">
                  {msg.model && <code className="bg-muted rounded px-1.5 py-0.5 text-[10px]">{msg.model}</code>}
                  {ttl && <span>{ttl} tok</span>}
                  {msg.turnRunId && (
                    <button
                      type="button"
                      onClick={() => onInspectTurn(msg.turnRunId!)}
                      className="btn-focus text-primary hover:text-primary/80 ml-auto inline-flex items-center gap-1 font-medium transition-colors"
                    >
                      <Eye className="size-3" />
                      {t("session.detail.inspectTurn")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
