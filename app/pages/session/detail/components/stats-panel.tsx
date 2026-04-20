import { useTranslation } from "react-i18next"
import type { ChatMessage, ChatSession, ChatTurn } from "../../../../../electron/features/chat/types"

interface Props {
  session: ChatSession
  messages: ChatMessage[]
  turns: ChatTurn[]
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

/** 右侧统计汇总:消息 / turn / token / 错误。 */
export function StatsPanel({ session, messages, turns }: Props) {
  const { t } = useTranslation()
  const totalTokens = messages.reduce((sum, m) => sum + (m.usage?.total ?? (m.usage?.input ?? 0) + (m.usage?.output ?? 0)), 0)
  const inputTok = messages.reduce((sum, m) => sum + (m.usage?.input ?? 0), 0)
  const outputTok = messages.reduce((sum, m) => sum + (m.usage?.output ?? 0), 0)
  const cacheR = messages.reduce((sum, m) => sum + (m.usage?.cacheRead ?? 0), 0)
  const cacheW = messages.reduce((sum, m) => sum + (m.usage?.cacheWrite ?? 0), 0)

  const userMsgs = messages.filter((m) => m.senderType === "user").length
  const agentMsgs = messages.filter((m) => m.senderType === "agent").length
  const abortedMsgs = messages.filter((m) => m.tags?.includes("aborted")).length
  const errorMsgs = messages.filter((m) => m.stopReason && m.stopReason !== "end_turn" && m.stopReason !== "stop" && m.stopReason !== "stop_sequence" && m.stopReason !== "aborted").length

  return (
    <aside className="bg-card ring-foreground/10 w-64 shrink-0 space-y-4 overflow-y-auto rounded-xl p-4 ring-1">
      <Row label={t("session.stats.created")} value={new Date(session.createdAt).toLocaleString()} />
      <Row label={t("session.stats.updated")} value={new Date(session.updatedAt).toLocaleString()} />

      <Group label={t("session.stats.messages")}>
        <Row label={t("session.stats.userMsgs")} value={String(userMsgs)} />
        <Row label={t("session.stats.agentMsgs")} value={String(agentMsgs)} />
        <Row label={t("session.stats.aborted")} value={String(abortedMsgs)} />
        <Row label={t("session.stats.errors")} value={String(errorMsgs)} warn={errorMsgs > 0} />
        <Row label={t("session.stats.turns")} value={String(turns.length)} />
      </Group>

      <Group label={t("session.stats.tokens")}>
        <Row label={t("session.stats.totalTokens")} value={fmt(totalTokens)} />
        <Row label={t("session.stats.inputTokens")} value={fmt(inputTok)} />
        <Row label={t("session.stats.outputTokens")} value={fmt(outputTok)} />
        {cacheR > 0 && <Row label={t("session.stats.cacheRead")} value={fmt(cacheR)} />}
        {cacheW > 0 && <Row label={t("session.stats.cacheWrite")} value={fmt(cacheW)} />}
      </Group>
    </aside>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">{label}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[11px]">
      <span className="text-muted-foreground truncate">{label}</span>
      <span className={`font-mono ${warn ? "text-destructive font-medium" : ""}`}>{value}</span>
    </div>
  )
}
