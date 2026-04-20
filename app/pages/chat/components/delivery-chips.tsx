/**
 * 投递态 chips:user 消息底下一行小角标,IM 风格反映每个 target agent 的处理进度。
 *
 * 状态视觉(对齐微信/Slack 的送达-已读-回复态):
 *   queued    ⏱  排队中(已收到,未开始处理)
 *   replying  ⋯  正在输入(带三点动画)
 *   done      ✓✓ 已回复(双勾绿色)
 *   error     ⚠  失败(红色,hover 看错误)
 *   aborted   ⊘  已中断(灰色)
 *
 * 数据源:store.deliveries[sessionId][anchorMsgId][memberId]
 * 仅群聊 user 消息下渲染(单聊无展示价值)。
 */

import { useTranslation } from "react-i18next"
import { AlertTriangle, Bot, Brain, CheckCheck, CircleSlash, Clock, Wrench } from "lucide-react"
import { useAgentCacheStore } from "@/stores/agent"
import { useChatDataStore, type DeliveryState } from "@/stores/chat"
import type { ChatMember } from "../../../../electron/features/chat/types"

const EMPTY_MEMBERS: ChatMember[] = []

interface Props {
  sessionId: string
  messageId: string
}

export function DeliveryChips({ sessionId, messageId }: Props) {
  const bucket = useChatDataStore((s) => s.deliveries[sessionId]?.[messageId])
  const members = useChatDataStore((s) => s.members[sessionId] ?? EMPTY_MEMBERS)
  const byAgentId = useAgentCacheStore((s) => s.byAgentId)

  if (!bucket) return null
  const entries = Object.entries(bucket)
  if (entries.length === 0) return null

  return (
    <div className="mt-1.5 flex flex-wrap justify-end gap-1.5">
      {entries.map(([memberId, state]) => {
        const member = members.find((m) => m.id === memberId)
        if (!member) return null
        const agent = byAgentId[member.agentId]
        const name = agent?.name ?? member.agentId
        return <DeliveryChip key={memberId} name={name} avatarUrl={agent?.identity?.avatarUrl} emoji={agent?.identity?.emoji} state={state} />
      })}
    </div>
  )
}

/** 状态 → 色调类(bg + text + ring)。色调语义化,参考 Slack 的 activity 指示器。 */
const TONE: Record<DeliveryState["status"], string> = {
  queued: "bg-muted/70 text-muted-foreground ring-foreground/10",
  thinking: "bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:text-amber-400",
  tool: "bg-sky-500/10 text-sky-700 ring-sky-500/30 dark:text-sky-400",
  replying: "bg-primary/10 text-primary ring-primary/30",
  done: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30 dark:text-emerald-400",
  error: "bg-destructive/10 text-destructive ring-destructive/30",
  aborted: "bg-muted/60 text-muted-foreground/80 ring-foreground/10",
}

function DeliveryChip({ name, avatarUrl, emoji, state }: { name: string; avatarUrl?: string; emoji?: string; state: DeliveryState }) {
  const { t } = useTranslation()
  const label = state.status === "tool" && state.toolName ? t("chat.delivery.toolNamed", { name: state.toolName }) : t(`chat.delivery.${state.status}`)
  const title = state.errorMsg ? `${name} · ${label}: ${state.errorMsg}` : `${name} · ${label}`
  return (
    <span title={title} className={`inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 text-[11px] leading-none ring-1 ${TONE[state.status]}`}>
      <span className="bg-background/70 flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full">
        {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : emoji ? <span className="text-[10px] leading-none">{emoji}</span> : <Bot className="size-2.5" />}
      </span>
      <span className="max-w-28 truncate font-medium">{name}</span>
      <StatusIndicator status={state.status} />
      <span className="max-w-40 truncate whitespace-nowrap">{label}</span>
    </span>
  )
}

function StatusIndicator({ status }: { status: DeliveryState["status"] }) {
  if (status === "queued") return <Clock className="size-3 shrink-0" aria-hidden />
  if (status === "thinking") return <Brain className="size-3 shrink-0 animate-pulse" aria-hidden />
  if (status === "tool") return <Wrench className="size-3 shrink-0 animate-pulse" aria-hidden />
  if (status === "replying") return <TypingDots />
  if (status === "done") return <CheckCheck className="size-3 shrink-0" aria-hidden />
  if (status === "error") return <AlertTriangle className="size-3 shrink-0" aria-hidden />
  return <CircleSlash className="size-3 shrink-0" aria-hidden />
}

/** 三点跳动 typing 动画。用 tailwind animate-bounce + 延迟偏移。 */
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label="typing">
      <span className="bg-current inline-block size-1 animate-bounce rounded-full [animation-delay:-0.3s]" />
      <span className="bg-current inline-block size-1 animate-bounce rounded-full [animation-delay:-0.15s]" />
      <span className="bg-current inline-block size-1 animate-bounce rounded-full" />
    </span>
  )
}
