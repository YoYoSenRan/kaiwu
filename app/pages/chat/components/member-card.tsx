/**
 * 对话详情里每成员一张卡片。三行布局:
 *   行1: 头像 + 名字 + 状态 chip + replyMode 切换 + 移除按钮
 *   行2: 模型 · 成本($)或(缓存)
 *   行3: context 进度条 + 数字 + 占用率
 *
 * 活跃/失败态通过卡片外层 ring 颜色 + 呼吸动画体现,语义源自 deliveries 最新态。
 */

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { AlertTriangle, Bot, Brain, CheckCheck, MoreHorizontal, Wrench, X } from "lucide-react"
import { useAgentCacheStore } from "@/stores/agent"
import { useChatDataStore, type DeliveryState } from "@/stores/chat"
import type { ChatMember, SessionUsage } from "../../../../electron/features/chat/types"

interface Props {
  sessionId: string
  member: ChatMember
  usage: SessionUsage | undefined
  disabled?: boolean
  onToggleReplyMode: () => void
  onRemove: () => void
  /** 是否显示移除按钮(单聊 1 员时不给移除)。 */
  allowRemove: boolean
}

/** 取该 member 最近一次 delivery 的终态(或进行中)。用于卡片 ring 色。 */
function useLatestDeliveryState(sessionId: string, memberId: string): DeliveryState | undefined {
  const deliveries = useChatDataStore((s) => s.deliveries[sessionId])
  return useMemo(() => {
    if (!deliveries) return undefined
    let latest: DeliveryState | undefined
    for (const anchorBucket of Object.values(deliveries)) {
      const st = anchorBucket[memberId]
      if (!st) continue
      if (!latest || st.at > latest.at) latest = st
    }
    return latest
  }, [deliveries, memberId])
}

/** 形如 "anthropic/claude-sonnet-4-5" → "claude-sonnet-4-5"。 */
function shortenModel(m: string | null | undefined): string | null {
  if (!m) return null
  const idx = m.indexOf("/")
  return idx >= 0 ? m.slice(idx + 1) : m
}

function formatCompact(n: number | null | undefined): string {
  if (n == null || n <= 0) return "--"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return String(n)
}

function formatCost(usd: number | null): string | null {
  if (usd == null) return null
  if (usd <= 0) return null
  if (usd >= 0.01) return `$${usd.toFixed(2)}`
  if (usd >= 0.0001) return `$${usd.toFixed(4)}`
  return `$<0.0001`
}

function formatRelative(ts: number | null, locale: string): string | null {
  if (!ts) return null
  const diffMs = Date.now() - ts
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return locale === "en" ? "just now" : "刚刚"
  const min = Math.floor(sec / 60)
  if (min < 60) return locale === "en" ? `${min}m ago` : `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return locale === "en" ? `${hr}h ago` : `${hr} 小时前`
  const day = Math.floor(hr / 24)
  return locale === "en" ? `${day}d ago` : `${day} 天前`
}

export function MemberCard({ sessionId, member, usage, disabled, onToggleReplyMode, onRemove, allowRemove }: Props) {
  const { t, i18n } = useTranslation()
  // 订阅 byAgentId(Record 引用随 listResult 变化)以触发 re-render;method ref 订阅无效
  const agent = useAgentCacheStore((s) => s.byAgentId[member.agentId])
  const name = agent?.name ?? member.agentId
  const avatarUrl = agent?.identity?.avatarUrl
  const emoji = agent?.identity?.emoji
  const delivery = useLatestDeliveryState(sessionId, member.id)
  const primaryModel = agent?.model?.primary

  const model = shortenModel(usage?.model ?? primaryModel ?? null)
  const totalT = usage?.totalTokens ?? null
  const ctxT = usage?.contextTokens ?? null
  const fresh = usage?.fresh ?? true
  const pct = totalT != null && ctxT != null && ctxT > 0 ? Math.min(100, (totalT / ctxT) * 100) : null
  const warn = pct != null && pct >= 80
  const notice = pct != null && pct >= 60 && pct < 80

  const cost = formatCost(usage?.estimatedCostUsd ?? null)
  const compactionLabel = formatRelative(usage?.latestCompactionAt ?? null, i18n.language.startsWith("en") ? "en" : "zh")

  // 卡片 ring 色:活跃(primary 呼吸) > 失败(destructive) > 已完成(emerald) > 默认
  // 边框态持久显示,反映"上次投递结果";新投递到来会覆盖
  const ringCls = (() => {
    switch (delivery?.status) {
      case "queued":
      case "thinking":
      case "tool":
      case "replying":
        return "ring-2 ring-primary/60 animate-pulse"
      case "error":
        return "ring-1 ring-destructive/60"
      case "done":
        return "ring-1 ring-emerald-400/40"
      case "aborted":
        return "ring-1 ring-muted-foreground/30"
      default:
        return "ring-1 ring-foreground/10"
    }
  })()

  const barCls = warn ? "bg-destructive" : notice ? "bg-amber-500" : "bg-primary"

  const tooltipTitle = [name, model, `${formatCompact(totalT)} / ${formatCompact(ctxT)}${pct != null ? ` (${pct.toFixed(1)}%)` : ""}`, cost ?? undefined, compactionLabel ? t("chat.memberCard.lastCompaction", { when: compactionLabel }) : undefined]
    .filter(Boolean)
    .join(" · ")

  return (
    <div title={tooltipTitle} className={`bg-card text-card-foreground rounded-lg p-2.5 transition-all ${ringCls} ${!fresh ? "opacity-70" : ""}`}>
      {/* 行1: 身份 + 状态 + 操作 */}
      <div className="flex items-center gap-2">
        <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg">
          {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : emoji ? <span className="text-lg">{emoji}</span> : <Bot className="size-5" />}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="truncate text-sm font-medium leading-tight">{name}</span>
          <StatusChip state={delivery} />
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onToggleReplyMode}
          title={t("chat.members.replyModeHint")}
          className={`btn-focus shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-50 ${
            member.replyMode === "auto" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {member.replyMode === "auto" ? t("chat.members.replyAuto") : t("chat.members.replyMention")}
        </button>
        {allowRemove && (
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            title={t("chat.members.remove")}
            aria-label={t("chat.members.remove")}
            className="btn-focus text-muted-foreground hover:text-destructive flex size-6 shrink-0 items-center justify-center rounded transition-colors disabled:opacity-50"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* 行2: 模型 + 成本 / 缓存态 */}
      <div className="text-muted-foreground mt-1.5 flex items-center gap-1.5 pl-11 text-[11px]">
        {model ? <code className="bg-muted rounded px-1.5 py-0.5 text-[10px]">{model}</code> : <span className="italic">{t("chat.memberCard.noModel")}</span>}
        {cost && (
          <>
            <span>·</span>
            <span>{cost}</span>
          </>
        )}
        {!fresh && totalT != null && (
          <>
            <span>·</span>
            <span className="italic">{t("chat.usage.stale")}</span>
          </>
        )}
      </div>

      {/* 行3: context 进度条 */}
      <div className="mt-2 pl-11">
        {ctxT == null && totalT == null ? (
          <div className="text-muted-foreground text-[11px] italic">{t("chat.memberCard.noContext")}</div>
        ) : (
          <div className="space-y-1">
            <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
              <div className={`h-full transition-all ${barCls} ${!fresh ? "opacity-60" : ""}`} style={{ width: `${pct ?? 0}%` }} />
            </div>
            <div className="text-muted-foreground flex items-center justify-between text-[10px]">
              <span>
                {formatCompact(totalT)} / {formatCompact(ctxT)}
              </span>
              {pct != null && (
                <span className={warn ? "text-destructive font-medium" : ""}>
                  {warn && <AlertTriangle className="mr-0.5 inline size-2.5" aria-hidden />}
                  {pct.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusChip({ state }: { state: DeliveryState | undefined }) {
  const { t } = useTranslation()
  if (!state) return null
  const status = state.status
  if (status === "queued") return <span className="text-muted-foreground inline-flex shrink-0 items-center gap-0.5 text-[10px]"><MoreHorizontal className="size-3" aria-hidden /> {t("chat.delivery.queued")}</span>
  if (status === "thinking") return <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400"><Brain className="size-3 animate-pulse" aria-hidden /> {t("chat.delivery.thinking")}</span>
  if (status === "tool") {
    const label = state.toolName ? t("chat.delivery.toolNamed", { name: state.toolName }) : t("chat.delivery.tool")
    return <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] text-sky-600 dark:text-sky-400"><Wrench className="size-3 animate-pulse" aria-hidden /> <span className="max-w-24 truncate">{label}</span></span>
  }
  if (status === "replying") return (
    <span className="text-primary inline-flex shrink-0 items-center gap-1 text-[10px]">
      <TypingDots />
      {t("chat.delivery.replying")}
    </span>
  )
  if (status === "done") return <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400"><CheckCheck className="size-3" aria-hidden /> {t("chat.delivery.done")}</span>
  if (status === "error") return <span className="text-destructive inline-flex shrink-0 items-center gap-0.5 text-[10px]"><AlertTriangle className="size-3" aria-hidden /> {t("chat.delivery.error")}</span>
  return <span className="text-muted-foreground inline-flex shrink-0 items-center gap-0.5 text-[10px]">{t("chat.delivery.aborted")}</span>
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label="typing">
      <span className="bg-current inline-block size-1 animate-bounce rounded-full [animation-delay:-0.3s]" />
      <span className="bg-current inline-block size-1 animate-bounce rounded-full [animation-delay:-0.15s]" />
      <span className="bg-current inline-block size-1 animate-bounce rounded-full" />
    </span>
  )
}
