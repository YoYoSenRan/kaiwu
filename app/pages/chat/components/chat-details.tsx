import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Info, Bot } from "lucide-react"
import { toast } from "sonner"
import { useAgentCacheStore } from "@/stores/agent"
import { useChatDataStore, useChatUiStore } from "@/stores/chat"
import type { ChatMember, ReplyMode } from "../../../../electron/features/chat/types"

/** 稳定的空数组引用，避免 zustand selector 每次返回新 `[]` 触发无限重渲染。 */
const EMPTY_MEMBERS: ChatMember[] = []

export function ChatDetails() {
  const { t } = useTranslation()
  const currentSessionId = useChatUiStore((s) => s.currentSessionId)
  const members = useChatDataStore((s) => (currentSessionId ? (s.members[currentSessionId] ?? EMPTY_MEMBERS) : EMPTY_MEMBERS))
  const refreshMembers = useChatDataStore((s) => s.refreshMembers)
  const getGatewayRow = useAgentCacheStore((s) => s.getGatewayRow)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function toggleReplyMode(member: ChatMember) {
    if (!currentSessionId) return
    const next: ReplyMode = member.replyMode === "auto" ? "mention" : "auto"
    setTogglingId(member.id)
    try {
      await window.electron.chat.member.patch(currentSessionId, member.id, { replyMode: next })
      await refreshMembers(currentSessionId)
    } catch (err) {
      toast.error(t("chat.members.patchFailed", { msg: (err as Error).message }))
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="bg-card text-card-foreground ring-foreground/10 hidden w-72 flex-col overflow-hidden rounded-xl ring-1 xl:flex">
      <div className="border-border/50 flex h-16 shrink-0 items-center gap-2 border-b px-5">
        <Info className="text-muted-foreground size-5" />
        <h3 className="text-sm font-semibold tracking-tight">{t("chat.details.title")}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-4">
          <h4 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">{t("chat.details.participants")}</h4>
          {members.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <Bot className="text-muted-foreground size-8" />
              <p className="text-muted-foreground text-sm">{t("chat.members.empty")}</p>
            </div>
          ) : (
            <div className="-mx-2 space-y-1">
              {members.map((m) => {
                const agent = getGatewayRow(m.agentId)
                const name = agent?.name ?? m.agentId
                const avatarUrl = agent?.identity?.avatarUrl
                const emoji = agent?.identity?.emoji
                const model = agent?.model?.primary
                const disabled = togglingId === m.id
                return (
                  <div key={m.id} className="hover:bg-muted/50 flex items-center gap-3 rounded-md p-2 transition-colors">
                    <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="size-full object-cover" />
                      ) : emoji ? (
                        <span className="text-lg">{emoji}</span>
                      ) : (
                        <Bot className="size-5" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <span className="truncate text-sm font-medium leading-tight">{name}</span>
                      {model && <span className="text-muted-foreground truncate text-[11px] leading-tight">{model}</span>}
                    </div>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleReplyMode(m)}
                      title={t("chat.members.replyModeHint")}
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-50 ${
                        m.replyMode === "auto" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {m.replyMode === "auto" ? t("chat.members.replyAuto") : t("chat.members.replyMention")}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
