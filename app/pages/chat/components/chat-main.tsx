import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Send, Sparkles, AlertCircle, RotateCcw, Square, User as UserIcon, Bot, Users, ChevronDown, X, CornerUpLeft } from "lucide-react"
import { toast } from "sonner"
import { Streamdown, type BundledTheme } from "streamdown"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAgentCacheStore } from "@/stores/agent"
import { useChatDataStore, useChatUiStore, type StreamBuffer } from "@/stores/chat"
import type { ChatCard, ChatMember, ChatMention, ChatMessage } from "../../../../electron/features/chat/types"
import { CreateChatDialog } from "./create-dialog"
import { DeliveryChips } from "./delivery-chips"
import { MentionChip } from "./mention-chip"

/** Shiki 代码高亮主题，light/dark 各一套。 */
const SHIKI_THEME: [BundledTheme, BundledTheme] = ["github-light", "github-dark"]

const EMPTY_MESSAGES: ChatMessage[] = []
const EMPTY_MEMBERS: ChatMember[] = []
const EMPTY_STREAMING: Record<string, StreamBuffer> = {}

function messageText(msg: ChatMessage): string {
  const c = msg.content as { text?: string } | null
  return c?.text ?? ""
}

function messageCards(msg: ChatMessage): ChatCard[] {
  const c = msg.content as { cards?: ChatCard[] } | null
  return Array.isArray(c?.cards) ? c.cards : []
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * 把 @agentId 包成 Streamdown 自定义 HTML tag,由 MentionChip 渲染成 chip。
 * 仅匹配 agentIds 中登记的成员;跳过 fenced code block / inline code。
 *
 * 输出示例:`嗨 <mention agent_id="scout">@scout</mention> 看一下`
 */
function wrapMentionsWithTag(text: string, agentIds: string[]): string {
  if (!text || agentIds.length === 0) return text
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]*`)/)
  for (let i = 0; i < parts.length; i += 2) {
    let seg = parts[i]
    for (const id of agentIds) {
      const re = new RegExp(`@${escapeRegex(id)}(?![\\w-])`, "g")
      seg = seg.replace(re, `<mention agent_id="${id}">@${id}</mention>`)
    }
    parts[i] = seg
  }
  return parts.join("")
}

/** Streamdown mention tag 支持的属性白名单 + 字面子节点 + 组件映射。module-level 常量避免 re-render。 */
const STREAMDOWN_ALLOWED_TAGS: { mention: string[] } = { mention: ["agent_id"] }
const STREAMDOWN_LITERAL_TAGS: string[] = ["mention"]
// biome-ignore lint: streamdown Components 类型含 node 等额外 props,用通用签名承接
const STREAMDOWN_COMPONENTS = { mention: MentionChip as unknown as React.ElementType }

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

/** 相邻消息间隔超过这个阈值，在它们之间插时间分割线。5 分钟。 */
const TIME_DIVIDER_GAP_MS = 5 * 60 * 1000

function formatDivider(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const hm = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (d.toDateString() === now.toDateString()) return hm
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return `昨天 ${hm}`
  const sameYear = d.getFullYear() === now.getFullYear()
  const datePart = d.toLocaleDateString([], sameYear ? { month: "short", day: "numeric" } : { year: "numeric", month: "short", day: "numeric" })
  return `${datePart} ${hm}`
}

/** 去掉 provider 前缀显 shortname (e.g. "anthropic/claude-sonnet-4-5" → "claude-sonnet-4-5")。 */
function shortenModel(m: string | null): string | null {
  if (!m) return null
  const idx = m.indexOf("/")
  return idx >= 0 ? m.slice(idx + 1) : m
}

/**
 * 在文本里重新定位每个 agentId 的首个 `@<id>` 出现位置,返回带 range 的 structured mentions。
 * 文本里已不存在对应 `@<id>` 的条目自动丢弃。
 */
function relocateMentions(text: string, agentIds: string[]): ChatMention[] {
  const out: ChatMention[] = []
  const seen = new Set<string>()
  for (const id of agentIds) {
    if (seen.has(id)) continue
    const re = new RegExp(`@${escapeRegex(id)}(?![\\w-])`, "i")
    const m = re.exec(text)
    if (!m) continue
    out.push({ agentId: id, source: "structured", range: [m.index, m.index + m[0].length] })
    seen.add(id)
  }
  return out
}

export function ChatMain() {
  const { t } = useTranslation()
  const [input, setInput] = useState("")
  const [draftMentionIds, setDraftMentionIds] = useState<string[]>([])
  const [replyTarget, setReplyTarget] = useState<{ id: string; name: string; snippet: string } | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createMode, setCreateMode] = useState<"direct" | "group">("direct")

  const currentSessionId = useChatUiStore((s) => s.currentSessionId)
  const drafts = useChatUiStore((s) => s.drafts)
  const setDraft = useChatUiStore((s) => s.setDraft)
  const clearDraft = useChatUiStore((s) => s.clearDraft)
  const sessions = useChatDataStore((s) => s.sessions)
  const allMessages = useChatDataStore((s) => (currentSessionId ? (s.messages[currentSessionId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES))
  const hiddenInSession = useChatDataStore((s) => (currentSessionId ? s.hiddenMessages[currentSessionId] : undefined))
  const hideMessage = useChatDataStore((s) => s.hideMessage)
  const members = useChatDataStore((s) => (currentSessionId ? (s.members[currentSessionId] ?? EMPTY_MEMBERS) : EMPTY_MEMBERS))
  const pending = useChatDataStore((s) => s.pending)
  const setPending = useChatDataStore((s) => s.setPending)
  const loopStatus = useChatDataStore((s) => (currentSessionId ? s.loopStatus[currentSessionId] : undefined))
  const loopEnded = useChatDataStore((s) => (currentSessionId ? s.loopEnded[currentSessionId] : undefined))
  const lastError = useChatDataStore((s) => (currentSessionId ? s.lastError[currentSessionId] : undefined))
  const dismissError = useChatDataStore((s) => s.dismissError)
  const streamingMap = useChatDataStore((s) => (currentSessionId ? (s.streaming[currentSessionId] ?? EMPTY_STREAMING) : EMPTY_STREAMING))
  const byAgentId = useAgentCacheStore((s) => s.byAgentId)
  const setListResult = useAgentCacheStore((s) => s.setListResult)
  const listResult = useAgentCacheStore((s) => s.listResult)

  const session = sessions.find((s) => s.id === currentSessionId) ?? null
  const isHitl = pending !== null && pending.sessionId === currentSessionId
  const isRunning = loopStatus === "started" && !isHitl

  // abort-hidden 过滤:abort 后立即撤回 user 气泡;若 agent 仍回了,store 会自动清 hidden 恢复
  const messages = useMemo(() => {
    if (!hiddenInSession || hiddenInSession.size === 0) return allMessages
    return allMessages.filter((m) => !hiddenInSession.has(m.id))
  }, [allMessages, hiddenInSession])

  // 进 chat 页若 agent cache 空则拉一次，保证头像/名字可渲染
  useEffect(() => {
    if (listResult) return
    void window.electron.agent
      .list()
      .then((res) => setListResult(res))
      .catch(() => {})
  }, [listResult, setListResult])

  // 切 session 时：先存当前 session 的 draft（input 此刻还是上一 session 的），再加载新 session draft
  const prevSessionIdRef = useRef<string | null>(null)
  useEffect(() => {
    const prev = prevSessionIdRef.current
    if (prev && prev !== currentSessionId) {
      setDraft(prev, input)
    }
    if (currentSessionId) {
      setInput(drafts[currentSessionId] ?? "")
    } else {
      setInput("")
    }
    // reply target 不跨 session 保留
    setReplyTarget(null)
    prevSessionIdRef.current = currentSessionId
    // 只在 currentSessionId 变化时同步；input 变化由 setDraft onChange 单独处理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId])

  // loop ended reason → toast（只针对当前 session；seq 变化即触发一次）
  const lastLoopEndedSeqRef = useRef(0)
  useEffect(() => {
    if (!loopEnded) {
      lastLoopEndedSeqRef.current = 0
      return
    }
    if (loopEnded.seq === lastLoopEndedSeqRef.current) return
    lastLoopEndedSeqRef.current = loopEnded.seq
    const reason = loopEnded.reason
    if (!reason) return
    const key: Record<NonNullable<typeof reason>, string> = {
      no_target: "chat.toast.loopEnded.noTarget",
      budget_max_rounds: "chat.toast.loopEnded.budgetRounds",
      stop_phrase: "chat.toast.loopEnded.stopPhrase",
      error: "chat.toast.loopEnded.error",
    }
    const i18nKey = key[reason]
    if (i18nKey) toast.info(t(i18nKey))
  }, [loopEnded, t])

  async function handleAbort() {
    if (!currentSessionId) return
    // 立即隐藏当前 session 最后一条 user msg(乐观撤回);若 agent 稍后仍回复 →
    // appendMessage 检测到 agent msg 会自动清该 session hidden 集合恢复 user msg。
    const lastUser = [...allMessages].reverse().find((m) => m.senderType === "user")
    if (lastUser) hideMessage(currentSessionId, lastUser.id)
    try {
      await window.electron.chat.message.abort(currentSessionId)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  /** 从当前 session 最近一条 user 消息重发。banner retry 入口。 */
  async function handleRetry() {
    if (!currentSessionId) return
    let userMsg: ChatMessage | undefined
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderType === "user") {
        userMsg = messages[i]
        break
      }
    }
    if (!userMsg) {
      toast.error(t("chat.retryNoUserMsg"))
      return
    }
    const text = (userMsg.content as { text?: string } | null)?.text ?? ""
    if (!text.trim()) {
      toast.error(t("chat.retryNoUserMsg"))
      return
    }
    dismissError(currentSessionId)
    try {
      const structured = userMsg.mentions.filter((m) => m.source === "structured")
      await window.electron.chat.message.send(currentSessionId, text, structured.length > 0 ? structured : undefined)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [input])

  // ========== @ mention popover ==========
  // 触发条件：光标前最近一段 @ 起始、没有空白打断
  // 匹配现有成员前缀（name 或 agentId），箭头/回车/点击选中
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null)
  const [mentionIdx, setMentionIdx] = useState(0)

  const memberAgentIds = useMemo(() => members.map((m) => m.agentId), [members])

  const mentionCandidates = useMemo(() => {
    if (!mention) return []
    const q = mention.query.toLowerCase()
    return members
      .map((m) => {
        const agent = byAgentId[m.agentId]
        const name = agent?.name ?? m.agentId
        return { memberId: m.id, agentId: m.agentId, name, avatarUrl: agent?.identity?.avatarUrl, emoji: agent?.identity?.emoji }
      })
      .filter((c) => c.agentId.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
      .slice(0, 6)
  }, [members, mention, byAgentId])

  function detectMentionAt(value: string, caret: number): { start: number; query: string } | null {
    const before = value.slice(0, caret)
    const m = /@([\w-]*)$/.exec(before)
    if (!m) return null
    return { start: m.index, query: m[1] }
  }

  function updateMention(next: { start: number; query: string } | null) {
    setMention((prev) => {
      // query 变化 → 重置高亮索引
      if ((prev?.query ?? null) !== (next?.query ?? null)) setMentionIdx(0)
      return next
    })
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value
    setInput(value)
    if (currentSessionId) setDraft(currentSessionId, value)
    // 清掉已经被编辑破坏的 mention:文本里不再能定位到对应 @<id> 即丢弃。
    setDraftMentionIds((prev) => prev.filter((id) => new RegExp(`@${escapeRegex(id)}(?![\\w-])`, "i").test(value)))
    const caret = e.target.selectionStart ?? value.length
    updateMention(detectMentionAt(value, caret))
  }

  function handleKeyUp(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // 光标用方向键移动时也要刷新 mention 判定
    if (e.key.startsWith("Arrow") || e.key === "Home" || e.key === "End") {
      const el = e.currentTarget
      updateMention(detectMentionAt(el.value, el.selectionStart ?? el.value.length))
    }
  }

  function selectMention(agentId: string) {
    const el = textareaRef.current
    if (!el || !mention) return
    const caret = el.selectionStart ?? input.length
    const next = input.slice(0, mention.start) + `@${agentId} ` + input.slice(caret)
    const nextCaret = mention.start + agentId.length + 2
    setInput(next)
    if (currentSessionId) setDraft(currentSessionId, next)
    setDraftMentionIds((prev) => (prev.includes(agentId) ? prev : [...prev, agentId]))
    setMention(null)
    // focus + caret 下一帧
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(nextCaret, nextCaret)
    })
  }

  async function handleSubmit(e?: React.SyntheticEvent) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || !currentSessionId) return
    const structuredMentions = relocateMentions(text, draftMentionIds)
    const inReplyToMessageId = replyTarget?.id
    setInput("")
    setDraftMentionIds([])
    setReplyTarget(null)
    clearDraft(currentSessionId)
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
    // 发送动作必滚底:对齐 Slack/Discord 惯例(不管此刻滚动位置)
    followBottomRef.current = true
    dismissError(currentSessionId)
    try {
      if (isHitl && pending) {
        await window.electron.chat.message.answer(currentSessionId, { pendingId: pending.pendingId, answer: text })
        setPending(null)
      } else {
        await window.electron.chat.message.send(currentSessionId, text, structuredMentions.length > 0 ? structuredMentions : undefined, inReplyToMessageId)
      }
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // mention popover 打开时：方向键/Enter/Tab/Escape 都先让它吞掉
    if (mention && mentionCandidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setMentionIdx((i) => (i + 1) % mentionCandidates.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setMentionIdx((i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length)
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        const pick = mentionCandidates[mentionIdx]
        if (pick) selectMention(pick.agentId)
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setMention(null)
        return
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const followBottomRef = useRef(true)
  const programmaticScrollRef = useRef(false)
  const scrollRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showJumpBtn, setShowJumpBtn] = useState(false)

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }, [])

  const scrollToBottomProgrammatic = useCallback(
    (smooth = false) => {
      const el = scrollAreaRef.current
      if (!el) return
      programmaticScrollRef.current = true

      const useSmooth = smooth && !prefersReducedMotion
      const scrollTop = el.scrollHeight

      if (typeof el.scrollTo === "function" && useSmooth) {
        el.scrollTo({ top: scrollTop, behavior: "smooth" })
      } else {
        el.scrollTop = scrollTop
      }

      setTimeout(() => {
        programmaticScrollRef.current = false
      }, 0)

      if (scrollRetryTimeoutRef.current) {
        clearTimeout(scrollRetryTimeoutRef.current)
      }
      scrollRetryTimeoutRef.current = setTimeout(() => {
        const el2 = scrollAreaRef.current
        if (!el2 || !followBottomRef.current) return
        const distance = el2.scrollHeight - el2.scrollTop - el2.clientHeight
        if (distance > 1) {
          programmaticScrollRef.current = true
          el2.scrollTop = el2.scrollHeight
          setTimeout(() => {
            programmaticScrollRef.current = false
          }, 0)
        }
      }, 100)
    },
    [prefersReducedMotion],
  )

  const handleScroll = () => {
    if (programmaticScrollRef.current) return
    const el = scrollAreaRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    const atBottom = distance < 150
    followBottomRef.current = atBottom
    setShowJumpBtn(!atBottom)
  }

  const jumpToBottom = () => {
    followBottomRef.current = true
    setShowJumpBtn(false)
    scrollToBottomProgrammatic(true)
  }

  useEffect(() => {
    followBottomRef.current = true
    setShowJumpBtn(false)
    scrollToBottomProgrammatic()
  }, [currentSessionId, scrollToBottomProgrammatic])

  const streamingSig = useMemo(() => Object.values(streamingMap).reduce((acc, buf) => acc + buf.content.length, 0), [streamingMap])
  const sortedStreams = useMemo(() => Object.entries(streamingMap).sort((a, b) => a[1].startedAt - b[1].startedAt), [streamingMap])

  const prevStreamingMapRef = useRef<Record<string, { content: string }>>({})
  const streamJustStarted = useMemo(() => {
    const prev = prevStreamingMapRef.current
    const current = streamingMap
    const justStarted = Object.entries(current).some(([key, buf]) => {
      const prevBuf = prev[key]
      return (!prevBuf || prevBuf.content.length === 0) && buf.content.length > 0
    })
    prevStreamingMapRef.current = Object.fromEntries(Object.entries(current).map(([k, v]) => [k, { content: v.content }]))
    return justStarted
  }, [streamingMap])

  useEffect(() => {
    if (!followBottomRef.current && !streamJustStarted) return
    if (streamJustStarted) {
      followBottomRef.current = true
    }
    scrollToBottomProgrammatic()
  }, [messages.length, streamingSig, streamJustStarted, scrollToBottomProgrammatic])

  useEffect(() => {
    const content = contentRef.current
    if (!content) return
    const ro = new ResizeObserver(() => {
      if (followBottomRef.current) scrollToBottomProgrammatic()
    })
    ro.observe(content)
    return () => {
      ro.disconnect()
      if (scrollRetryTimeoutRef.current) {
        clearTimeout(scrollRetryTimeoutRef.current)
      }
    }
  }, [scrollToBottomProgrammatic])

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
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold tracking-tight">{session?.label ?? currentSessionId}</h2>
          {session && (
            <div className="flex items-center gap-1.5">
              {session.mode === "group" ? <Users className="text-muted-foreground size-3.5" /> : <Bot className="text-muted-foreground size-3.5" />}
              <span className="text-muted-foreground text-[11px]">{session.mode === "group" ? `${members.length} ${t("chat.members.count")}` : t("chat.mode.direct")}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {members.length > 0 && (
            <div className="flex items-center -space-x-1">
              {members.slice(0, 3).map((m) => {
                const agent = byAgentId[m.agentId]
                return (
                  <div
                    key={m.id}
                    className="bg-muted text-muted-foreground ring-card flex size-6 items-center justify-center overflow-hidden rounded-full ring-2"
                    title={agent?.name ?? m.agentId}
                  >
                    {agent?.identity?.avatarUrl ? (
                      <img src={agent.identity.avatarUrl} alt="" className="size-full object-cover" />
                    ) : agent?.identity?.emoji ? (
                      <span className="text-xs">{agent.identity.emoji}</span>
                    ) : (
                      <Bot className="size-3" />
                    )}
                  </div>
                )
              })}
              {members.length > 3 && <span className="text-muted-foreground ml-1 text-[11px]">+{members.length - 3}</span>}
            </div>
          )}
          {isRunning && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex size-2">
                <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
                <span className="bg-primary relative inline-flex size-2 rounded-full" />
              </span>
              <span className="text-primary text-[11px]">{t("chat.status.running")}</span>
            </div>
          )}
        </div>
      </div>

      {lastError &&
        (lastError.kind === "disconnected" ? (
          <div role="status" className="text-foreground mx-4 mt-3 flex items-start gap-2 rounded-lg border-l-4 border-yellow-500/70 bg-yellow-500/10 px-3 py-2 text-xs shadow-sm">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
            <span className="flex-1 whitespace-pre-wrap">{t("chat.error.disconnected")}</span>
            <button
              type="button"
              onClick={() => currentSessionId && dismissError(currentSessionId)}
              aria-label={t("chat.error.dismiss")}
              className="btn-focus text-muted-foreground hover:text-foreground flex size-5 shrink-0 items-center justify-center rounded transition-colors hover:bg-yellow-500/20"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <div role="alert" className="bg-destructive/10 text-foreground border-destructive/60 mx-4 mt-3 flex items-start gap-2 rounded-lg border-l-4 px-3 py-2 text-xs shadow-sm">
            <AlertCircle className="text-destructive mt-0.5 size-3.5 shrink-0" />
            <span className="flex-1 whitespace-pre-wrap">{t("chat.error.banner", { msg: lastError.text })}</span>
            {!isRunning && (
              <button
                type="button"
                onClick={() => void handleRetry()}
                className="btn-focus hover:bg-destructive/20 text-destructive flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-medium transition-colors"
              >
                <RotateCcw className="size-3" />
                <span>{t("chat.retry")}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => currentSessionId && dismissError(currentSessionId)}
              aria-label={t("chat.error.dismiss")}
              className="btn-focus hover:bg-destructive/20 text-muted-foreground hover:text-foreground flex size-5 shrink-0 items-center justify-center rounded transition-colors"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

      <div className="relative flex min-h-0 flex-1 flex-col">
        <button
          onClick={jumpToBottom}
          aria-hidden={!showJumpBtn}
          tabIndex={showJumpBtn ? 0 : -1}
          className={`btn-focus bg-card text-foreground ring-foreground/10 hover:bg-muted absolute bottom-6 left-1/2 z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs shadow-md ring-1 transition-all duration-200 ease-out ${
            showJumpBtn ? "-translate-x-1/2 translate-y-0 opacity-100" : "pointer-events-none -translate-x-1/2 translate-y-2 opacity-0"
          }`}
        >
          <ChevronDown className="size-3.5" />
          <span>{t("chat.jumpToBottom")}</span>
        </button>
        <div
          ref={scrollAreaRef}
          onScroll={handleScroll}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label={t("chat.details.title")}
          className="flex-1 overflow-y-auto p-4"
        >
          {/* 稳定 contentRef:条件渲染切换(EmptyHint ↔ 消息列表)不换引用,RO 持续生效 */}
          <div ref={contentRef}>
            {messages.length === 0 && sortedStreams.length === 0 ? (
              <EmptyHint
                t={t}
                mode={session?.mode}
                onCreate={(mode) => {
                  setCreateOpen(true)
                  setCreateMode(mode)
                }}
              />
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((msg, idx) => {
                  const agent = msg.senderId ? byAgentId[msg.senderId] : undefined
                  const prev = idx > 0 ? messages[idx - 1] : undefined
                  const needDivider = !prev || msg.createdAtLocal - prev.createdAtLocal > TIME_DIVIDER_GAP_MS
                  // 群聊 user 消息下显示多 agent 投递态 chips
                  const showDeliveryChips = session?.mode === "group" && msg.senderType === "user" && currentSessionId != null
                  return (
                    <Fragment key={msg.id}>
                      {needDivider && <TimeDivider ts={msg.createdAtLocal} />}
                      <MessageRow
                        msg={msg}
                        agentName={agent?.name ?? msg.senderId ?? undefined}
                        avatarUrl={agent?.identity?.avatarUrl}
                        emoji={agent?.identity?.emoji}
                        agentModel={agent?.model?.primary}
                        memberAgentIds={memberAgentIds}
                        onReply={(m, name) => {
                          const snippet = messageText(m).slice(0, 60)
                          setReplyTarget({ id: m.id, name, snippet })
                          textareaRef.current?.focus()
                        }}
                        onCardAction={async (_cardId, optionValue) => {
                          if (!currentSessionId) return
                          try {
                            // 卡片按钮 = 带 reply-to 的结构化 user 消息,路由到卡片发起者
                            await window.electron.chat.message.send(currentSessionId, optionValue, undefined, msg.id)
                          } catch (err) {
                            toast.error((err as Error).message)
                          }
                        }}
                      />
                      {showDeliveryChips && <DeliveryChips sessionId={currentSessionId} messageId={msg.id} />}
                    </Fragment>
                  )
                })}
                {/* 流式气泡：按 buffer.openclawSessionKey 反查发言 member → agent（支持 group 多 agent 并发） */}
                {sortedStreams.map(([key, buf]) => {
                  const member = members.find((m) => m.openclawKey === buf.openclawSessionKey)
                  const agentId = member?.agentId
                  const agent = agentId ? byAgentId[agentId] : undefined
                  return (
                    <StreamingRow
                      key={`stream:${key}`}
                      content={buf.content}
                      agentName={agent?.name ?? agentId ?? undefined}
                      avatarUrl={agent?.identity?.avatarUrl}
                      emoji={agent?.identity?.emoji}
                      memberAgentIds={memberAgentIds}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 p-4">
        {isHitl && pending && (
          <div className="mb-3 flex flex-col gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{t("chat.hitl.prompt", { agentId: pending.byAgentId, question: pending.question })}</span>
            </div>
            {pending.options && pending.options.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pl-6">
                {pending.options.map((opt, i) => (
                  <Button
                    key={`${i}-${opt}`}
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!currentSessionId) return
                      try {
                        await window.electron.chat.message.answer(currentSessionId, { pendingId: pending.pendingId, answer: opt })
                        setPending(null)
                      } catch (err) {
                        toast.error((err as Error).message)
                      }
                    }}
                    className="h-7 border-yellow-500/30 bg-yellow-50 px-2 text-xs text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300"
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-card ring-foreground/10 focus-within:ring-primary/20 relative flex flex-col rounded-xl ring-1 transition-shadow focus-within:ring-2">
          {mention && mentionCandidates.length > 0 && (
            <div
              id="chat-mention-listbox"
              role="listbox"
              aria-label={t("chat.details.participants")}
              className="bg-card ring-foreground/10 absolute bottom-full left-0 mb-2 w-64 overflow-hidden rounded-lg shadow-md ring-1"
            >
              {mentionCandidates.map((c, i) => (
                <button
                  key={c.memberId}
                  id={`chat-mention-option-${i}`}
                  role="option"
                  aria-selected={i === mentionIdx}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    selectMention(c.agentId)
                  }}
                  onMouseEnter={() => setMentionIdx(i)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${i === mentionIdx ? "bg-muted" : ""}`}
                >
                  <div className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center overflow-hidden rounded">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt="" className="size-full object-cover" />
                    ) : c.emoji ? (
                      <span className="text-sm">{c.emoji}</span>
                    ) : (
                      <Bot className="size-3" />
                    )}
                  </div>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-muted-foreground truncate text-[11px]">@{c.agentId}</span>
                </button>
              ))}
            </div>
          )}
          {replyTarget && (
            <div className="border-foreground/10 text-muted-foreground flex items-center gap-2 border-b px-3 py-1.5 text-xs">
              <CornerUpLeft className="size-3.5 shrink-0" />
              <span className="font-medium">{t("chat.reply.replyingTo", { name: replyTarget.name })}</span>
              {replyTarget.snippet && <span className="truncate opacity-70">— {replyTarget.snippet}</span>}
              <button
                type="button"
                aria-label={t("chat.reply.cancel")}
                title={t("chat.reply.cancel")}
                onClick={() => setReplyTarget(null)}
                className="hover:bg-accent ml-auto rounded p-0.5"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onBlur={() => setTimeout(() => setMention(null), 150)}
            placeholder={isRunning ? "" : t("chat.placeholder")}
            disabled={isRunning}
            rows={1}
            role={mention ? "combobox" : undefined}
            aria-autocomplete={mention ? "list" : undefined}
            aria-expanded={mention && mentionCandidates.length > 0 ? true : undefined}
            aria-controls={mention && mentionCandidates.length > 0 ? "chat-mention-listbox" : undefined}
            aria-activedescendant={mention && mentionCandidates.length > 0 ? `chat-mention-option-${mentionIdx}` : undefined}
            className="max-h-[200px] min-h-[40px] resize-none border-0 bg-transparent px-3 py-2.5 text-sm shadow-none focus-visible:ring-0"
          />

          <div className="flex items-center justify-end border-t px-2 py-1.5">
            {isRunning ? (
              <Button size="sm" type="button" variant="destructive" onClick={handleAbort} className="h-7 gap-1 px-2 text-xs">
                <Square className="size-3" />
                <span>Stop</span>
              </Button>
            ) : (
              <Button size="sm" type="button" disabled={!input.trim()} onClick={() => handleSubmit()} className="h-7 gap-1 px-2 text-xs">
                <Send className="size-3" />
                <span>Send</span>
              </Button>
            )}
          </div>
        </div>
      </div>
      <CreateChatDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(sessionId) => {
          void window.electron.chat.session.list().then(() => {
            useChatDataStore.getState().refreshSessions()
            useChatUiStore.getState().setCurrent(sessionId)
          })
        }}
        defaultMode={createMode}
      />
    </div>
  )
}

function EmptyHint({ t, mode, onCreate }: { t: (k: string) => string; mode?: "direct" | "group"; onCreate?: (mode: "direct" | "group") => void }) {
  const Icon = mode === "group" ? Users : mode === "direct" ? Bot : Sparkles
  return (
    <div className="flex h-full items-center justify-center transition-opacity duration-500 ease-out">
      <div className="animate-in fade-in-0 zoom-in-95 flex flex-col items-center gap-5 text-center duration-500">
        <div className="from-primary/20 via-primary/10 ring-primary/20 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br to-transparent ring-1">
          <Icon className="text-primary size-8" />
        </div>
        <div className="space-y-1.5">
          <p className="text-foreground text-lg font-medium tracking-tight">{t("chat.empty.title")}</p>
          <p className="text-muted-foreground mx-auto max-w-[280px] text-sm leading-relaxed">{t("chat.empty.description")}</p>
        </div>
        {onCreate && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onCreate("direct")}>
              <Bot className="mr-1 size-4" />
              {t("chat.empty.newDirect")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onCreate("group")}>
              <Users className="mr-1 size-4" />
              {t("chat.empty.newGroup")}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

interface RowProps {
  msg: ChatMessage
  agentName?: string
  avatarUrl?: string
  emoji?: string
  agentModel?: string
  memberAgentIds: string[]
  onReply?: (msg: ChatMessage, displayName: string) => void
  onCardAction?: (cardId: string, optionValue: string) => void
}

function MessageRow({ msg, agentName, avatarUrl, emoji, agentModel, memberAgentIds, onReply, onCardAction }: RowProps) {
  const { t } = useTranslation()
  const isUser = msg.senderType === "user"
  const isAborted = msg.tags?.includes("aborted")
  const isSystem = msg.senderType === "system"
  const text = messageText(msg)
  const cards = messageCards(msg)
  const rendered = isUser || !isSystem ? wrapMentionsWithTag(text, memberAgentIds) : text
  // user 自己的消息回复没意义,只对 agent 消息暴露 reply 按钮
  const canReply = !isUser && !isSystem && !!onReply

  // system：居中、小字灰色、无气泡
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
      <div className={`flex max-w-[85%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        <div className="flex items-start gap-1">
          {canReply && (
            <button
              type="button"
              aria-label={t("chat.reply.action")}
              title={t("chat.reply.action")}
              onClick={() => onReply?.(msg, agentName ?? msg.senderId ?? "")}
              className="text-muted-foreground hover:text-foreground hover:bg-accent mt-1 rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <CornerUpLeft className="size-3.5" />
            </button>
          )}
          <div
            className={`min-w-0 overflow-hidden rounded-2xl px-3 py-2 text-sm ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"} ${
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
        <MessageFooter msg={msg} agentName={agentName} isUser={isUser} agentModel={agentModel} />
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

function TimeDivider({ ts }: { ts: number }) {
  return (
    <div className="my-2 flex items-center gap-3">
      <div className="border-border/40 flex-1 border-t" />
      <span className="text-muted-foreground text-[11px]">{formatDivider(ts)}</span>
      <div className="border-border/40 flex-1 border-t" />
    </div>
  )
}

function StreamingRow({
  content,
  agentName,
  avatarUrl,
  emoji,
  memberAgentIds,
}: {
  content: string
  agentName?: string
  avatarUrl?: string
  emoji?: string
  memberAgentIds: string[]
}) {
  const rendered = wrapMentionsWithTag(content, memberAgentIds)
  return (
    <div className="flex flex-row gap-3" aria-live="polite" aria-busy="true">
      <Avatar isUser={false} avatarUrl={avatarUrl} emoji={emoji} />
      <div className="flex max-w-[85%] flex-col items-start gap-1">
        <div className="bg-muted text-foreground ring-primary/30 rounded-2xl px-3 py-2 text-sm ring-1">
          {content ? (
            <Streamdown
              mode="streaming"
              parseIncompleteMarkdown
              caret="block"
              shikiTheme={SHIKI_THEME}
              className="markdown-prose"
              allowedTags={STREAMDOWN_ALLOWED_TAGS}
              literalTagContent={STREAMDOWN_LITERAL_TAGS}
              components={STREAMDOWN_COMPONENTS}
            >
              {rendered}
            </Streamdown>
          ) : (
            <span className="text-muted-foreground">…</span>
          )}
        </div>
        {agentName && <p className="text-muted-foreground px-1 text-[11px]">{agentName}</p>}
      </div>
    </div>
  )
}

function Avatar({ isUser, avatarUrl, emoji }: { isUser: boolean; avatarUrl?: string; emoji?: string }) {
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

function MessageFooter({ msg, agentName, isUser, agentModel }: { msg: ChatMessage; agentName?: string; isUser: boolean; agentModel?: string }) {
  // per-message usage 龙虾 chat.history 不暴露,永远 null → 不展示 token 徽章。
  // session 级 usage 已在 MemberCard / 会话详情页显示。
  const time = formatTime(msg.createdAtLocal)
  const model = shortenModel(msg.model ?? agentModel ?? null)

  const parts: React.ReactNode[] = []
  parts.push(
    <span key="t" className="text-muted-foreground">
      {time}
    </span>,
  )
  if (!isUser && agentName) parts.push(<span key="n">{agentName}</span>)
  if (!isUser && model)
    parts.push(
      <code key="m" className="bg-muted rounded px-1.5 py-0.5 text-[10px]">
        {model}
      </code>,
    )
  // 正常结束不显示 stopReason；只有异常值（max_tokens / tool_use / content_filter / error 等）才显
  const NORMAL_STOP = new Set(["end_turn", "stop", "stop_sequence"])
  if (msg.stopReason && !NORMAL_STOP.has(msg.stopReason)) {
    parts.push(
      <span key="sr" className="text-muted-foreground">
        · {msg.stopReason}
      </span>,
    )
  }

  return <div className={`text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[11px] ${isUser ? "flex-row-reverse" : ""}`}>{parts}</div>
}
