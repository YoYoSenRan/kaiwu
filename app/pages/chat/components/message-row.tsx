/**
 * 单条消息行:头像 + 悬浮工具条 + 气泡 + 卡片 + 尾注。
 * 根据 senderType=user/agent/system 切换对齐与视觉。
 */

import { useTranslation } from "react-i18next"
import { Bot, Copy, CornerUpLeft, Trash2, User as UserIcon } from "lucide-react"
import { toast } from "sonner"
import { Streamdown, type BundledTheme } from "streamdown"
import { Button } from "@/components/ui/button"
import { wrapMentionsWithTag } from "@/lib/chat-mention"
import { MentionChip } from "./mention-chip"
import type { ChatCard, ChatMessage } from "../../../../electron/features/chat/types"

const SHIKI_THEME: [BundledTheme, BundledTheme] = ["github-light", "github-dark"]
const STREAMDOWN_ALLOWED_TAGS: { mention: string[] } = { mention: ["agent_id"] }
const STREAMDOWN_LITERAL_TAGS: string[] = ["mention"]
// biome-ignore lint: streamdown Components 类型含 node 等额外 props,用通用签名承接
const STREAMDOWN_COMPONENTS = { mention: MentionChip as unknown as React.ElementType }

const NORMAL_STOP: ReadonlySet<string> = new Set(["end_turn", "stop", "stop_sequence"])

function messageText(msg: ChatMessage): string {
  const c = msg.content as { text?: string } | null
  return c?.text ?? ""
}

function messageCards(msg: ChatMessage): ChatCard[] {
  const c = msg.content as { cards?: ChatCard[] } | null
  return Array.isArray(c?.cards) ? c.cards : []
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function shortenModel(m: string | null): string | null {
  if (!m) return null
  const idx = m.indexOf("/")
  return idx >= 0 ? m.slice(idx + 1) : m
}

/** 压缩展示 token 数:1234 → "1.2k"; 1_200_000 → "1.2M"。 */
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`
  return String(n)
}

interface RowProps {
  msg: ChatMessage
  agentName?: string
  avatarUrl?: string
  emoji?: string
  agentModel?: string
  /** agent 消息对应成员的 context window 容量(token 数);用来算 ctx% 占用率。 */
  contextWindow?: number | null
  memberAgentIds: string[]
  onReply?: (msg: ChatMessage, displayName: string) => void
  onHide?: (msgId: string) => void
  onCardAction?: (cardId: string, optionValue: string) => void
}

export function MessageRow({ msg, agentName, avatarUrl, emoji, agentModel, contextWindow, memberAgentIds, onReply, onHide, onCardAction }: RowProps) {
  const { t } = useTranslation()
  const isUser = msg.senderType === "user"
  const isAborted = msg.tags?.includes("aborted")
  const isSystem = msg.senderType === "system"
  const text = messageText(msg)
  const cards = messageCards(msg)
  const rendered = isUser || !isSystem ? wrapMentionsWithTag(text, memberAgentIds) : text
  const canReply = !isUser && !isSystem && !!onReply

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(t("chat.message.copied"))
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  // system:居中小字灰色,无气泡
  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <span className="text-muted-foreground max-w-[80%] text-[11px] whitespace-pre-wrap">{text || "—"}</span>
      </div>
    )
  }

  return (
    <div className={`group flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <Avatar isUser={isUser} avatarUrl={avatarUrl} emoji={emoji} />
      <div className={`flex max-w-[72%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        <div className="flex items-start gap-1">
          <div
            className={`bg-card ring-foreground/10 mt-1 flex shrink-0 items-center rounded-md opacity-0 shadow-sm ring-1 transition-opacity group-hover:opacity-100 focus-within:opacity-100 ${isUser ? "order-1" : "order-2"}`}
          >
            {canReply && (
              <button
                type="button"
                aria-label={t("chat.reply.action")}
                title={t("chat.reply.action")}
                onClick={() => onReply?.(msg, agentName ?? msg.senderId ?? "")}
                className="btn-focus text-muted-foreground hover:text-foreground hover:bg-muted flex size-6 items-center justify-center rounded transition-colors"
              >
                <CornerUpLeft className="size-3.5" />
              </button>
            )}
            {text && (
              <button
                type="button"
                aria-label={t("chat.message.copy")}
                title={t("chat.message.copy")}
                onClick={() => void handleCopy()}
                className="btn-focus text-muted-foreground hover:text-foreground hover:bg-muted flex size-6 items-center justify-center rounded transition-colors"
              >
                <Copy className="size-3.5" />
              </button>
            )}
            {onHide && (
              <button
                type="button"
                aria-label={t("chat.message.delete")}
                title={t("chat.message.delete")}
                onClick={() => onHide(msg.id)}
                className="btn-focus text-muted-foreground hover:text-destructive hover:bg-muted flex size-6 items-center justify-center rounded transition-colors"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
          <div
            className={`${isUser ? "order-2" : "order-1"} min-w-0 overflow-hidden rounded-2xl px-3 py-2 text-sm ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"} ${
              isAborted ? "ring-muted-foreground/40 ring-dashed ring-1" : ""
            }`}
          >
            <Streamdown
              mode="static"
              shikiTheme={SHIKI_THEME}
              className="markdown-prose"
              allowedTags={STREAMDOWN_ALLOWED_TAGS}
              literalTagContent={STREAMDOWN_LITERAL_TAGS}
              components={STREAMDOWN_COMPONENTS}
            >
              {rendered || "—"}
            </Streamdown>
            {isAborted && <span className="text-muted-foreground mt-1 block text-[10px]">{t("chat.aborted")}</span>}
          </div>
        </div>
        {cards.length > 0 && (
          <div className="flex flex-col gap-2">
            {cards.map((card) => (
              <CardBlock key={card.id} card={card} onAction={onCardAction} />
            ))}
          </div>
        )}
        <MessageFooter msg={msg} agentName={agentName} isUser={isUser} agentModel={agentModel} contextWindow={contextWindow} />
      </div>
    </div>
  )
}

function CardBlock({ card, onAction }: { card: ChatCard; onAction?: (cardId: string, optionValue: string) => void }) {
  return (
    <div className="bg-card ring-foreground/10 flex flex-col gap-2 rounded-lg p-3 ring-1">
      {card.title && <div className="text-sm font-medium">{card.title}</div>}
      {card.description && <div className="text-muted-foreground text-xs">{card.description}</div>}
      <div className="flex flex-wrap gap-1.5">
        {card.options.map((opt, i) => {
          const variant: "default" | "destructive" | "outline" = opt.style === "primary" ? "default" : opt.style === "danger" ? "destructive" : "outline"
          return (
            <Button key={`${card.id}-${i}`} variant={variant} size="sm" onClick={() => onAction?.(card.id, opt.value)}>
              {opt.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export function Avatar({ isUser, avatarUrl, emoji }: { isUser: boolean; avatarUrl?: string; emoji?: string }) {
  return (
    <div className={`flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg ${isUser ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
      {!isUser && avatarUrl ? (
        <img src={avatarUrl} alt="" className="size-full object-cover" />
      ) : !isUser && emoji ? (
        <span className="text-lg">{emoji}</span>
      ) : isUser ? (
        <UserIcon className="size-4" />
      ) : (
        <Bot className="size-4" />
      )}
    </div>
  )
}

function MessageFooter({
  msg,
  agentName,
  isUser,
  agentModel,
  contextWindow,
}: {
  msg: ChatMessage
  agentName?: string
  isUser: boolean
  agentModel?: string
  contextWindow?: number | null
}) {
  const time = formatTime(msg.createdAtLocal)
  const model = shortenModel(msg.model ?? agentModel ?? null)
  const usage = msg.usage
  // ctx% 用 input tokens 对比 context window 容量(对齐 openclaw 口径)
  const ctxPct = !isUser && usage?.input && contextWindow && contextWindow > 0 ? Math.min(100, Math.round((usage.input / contextWindow) * 100)) : null

  const parts: React.ReactNode[] = []
  parts.push(
    <span key="t" className="text-muted-foreground">
      {time}
    </span>,
  )
  if (!isUser && agentName) parts.push(<span key="n">{agentName}</span>)
  // token 用量 + cache 统计(仅 agent 消息)
  if (!isUser && usage?.input)
    parts.push(
      <span key="in" className="text-muted-foreground tabular-nums">
        ↑{fmtTokens(usage.input)}
      </span>,
    )
  if (!isUser && usage?.output)
    parts.push(
      <span key="out" className="text-muted-foreground tabular-nums">
        ↓{fmtTokens(usage.output)}
      </span>,
    )
  if (!isUser && usage?.cacheRead)
    parts.push(
      <span key="cr" className="text-muted-foreground tabular-nums">
        R{fmtTokens(usage.cacheRead)}
      </span>,
    )
  if (!isUser && usage?.cacheWrite)
    parts.push(
      <span key="cw" className="text-muted-foreground tabular-nums">
        W{fmtTokens(usage.cacheWrite)}
      </span>,
    )
  if (ctxPct != null) {
    const cls = ctxPct >= 90 ? "text-destructive" : ctxPct >= 75 ? "text-warn" : "text-muted-foreground"
    parts.push(
      <span key="ctx" className={`${cls} tabular-nums`}>
        {ctxPct}% ctx
      </span>,
    )
  }
  if (!isUser && model)
    parts.push(
      <code key="m" className="bg-muted rounded px-1.5 py-0.5 text-[10px]">
        {model}
      </code>,
    )
  if (msg.stopReason && !NORMAL_STOP.has(msg.stopReason)) {
    parts.push(
      <span key="sr" className="text-muted-foreground">
        · {msg.stopReason}
      </span>,
    )
  }

  const hasAnomaly = !!msg.stopReason && !NORMAL_STOP.has(msg.stopReason)
  const visibility = hasAnomaly ? "opacity-100" : "opacity-50 group-hover:opacity-100 transition-opacity"
  return <div className={`text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[11px] ${visibility} ${isUser ? "flex-row-reverse" : ""}`}>{parts}</div>
}
