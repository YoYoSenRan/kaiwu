import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Send, Sparkles, AlertCircle, ArrowDown, ArrowUp, RotateCcw, Square, User as UserIcon, Bot, Users, ChevronDown, X } from "lucide-react"
import { toast } from "sonner"
import { Streamdown, type BundledTheme } from "streamdown"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAgentCacheStore } from "@/stores/agent"
import { useChatDataStore, useChatUiStore, type StreamBuffer } from "@/stores/chat"
import type { ChatMember, ChatMessage } from "../../../../electron/features/chat/types"
import { CreateChatDialog } from "./create-dialog"
import { DeliveryChips } from "./delivery-chips"

/** Shiki 代码高亮主题，light/dark 各一套。 */
const SHIKI_THEME: [BundledTheme, BundledTheme] = ["github-light", "github-dark"]

const EMPTY_MESSAGES: ChatMessage[] = []
const EMPTY_MEMBERS: ChatMember[] = []
const EMPTY_STREAMING: Record<string, StreamBuffer> = {}

function messageText(msg: ChatMessage): string {
  const c = msg.content as { text?: string } | null
  return c?.text ?? ""
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * 把 @agentId 包成行内标记,与正文文字区分开。仅匹配 members 中已存在的 agentId;跳过 code 块内的匹配。
 *
 * 样式按气泡色分流:
 *   - user 气泡(bg-primary): 用 `**@id**` 加粗(code 样式在 primary 背景上底色冲突)
 *   - agent 气泡(bg-muted): 用 `\`@id\`` 行内 code(现状)
 */
function highlightMentions(text: string, agentIds: string[], isUser: boolean): string {
  if (!text || agentIds.length === 0) return text
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]*`)/)
  for (let i = 0; i < parts.length; i += 2) {
    let seg = parts[i]
    for (const id of agentIds) {
      const re = new RegExp(`@${escapeRegex(id)}(?![\\w-])`, "g")
      seg = seg.replace(re, isUser ? `**@${id}**` : `\`@${id}\``)
    }
    parts[i] = seg
  }
  return parts.join("")
}

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

function formatCompact(n: number | undefined): string | null {
  if (!n || n <= 0) return null
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return String(n)
}

/** 去掉 provider 前缀显 shortname (e.g. "anthropic/claude-sonnet-4-5" → "claude-sonnet-4-5")。 */
function shortenModel(m: string | null): string | null {
  if (!m) return null
  const idx = m.indexOf("/")
  return idx >= 0 ? m.slice(idx + 1) : m
}

export function ChatMain() {
  const { t } = useTranslation()
  const [input, setInput] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [createMode, setCreateMode] = useState<"direct" | "group">("direct")

  const currentSessionId = useChatUiStore((s) => s.currentSessionId)
  const drafts = useChatUiStore((s) => s.drafts)
  const setDraft = useChatUiStore((s) => s.setDraft)
  const clearDraft = useChatUiStore((s) => s.clearDraft)
  const sessions = useChatDataStore((s) => s.sessions)
  const messages = useChatDataStore((s) => (currentSessionId ? (s.messages[currentSessionId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES))
  const members = useChatDataStore((s) => (currentSessionId ? (s.members[currentSessionId] ?? EMPTY_MEMBERS) : EMPTY_MEMBERS))
  const pending = useChatDataStore((s) => s.pending)
  const setPending = useChatDataStore((s) => s.setPending)
  const loopStatus = useChatDataStore((s) => (currentSessionId ? s.loopStatus[currentSessionId] : undefined))
  const loopEnded = useChatDataStore((s) => (currentSessionId ? s.loopEnded[currentSessionId] : undefined))
  const lastError = useChatDataStore((s) => (currentSessionId ? s.lastError[currentSessionId] : undefined))
  const dismissError = useChatDataStore((s) => s.dismissError)
  const streamingMap = useChatDataStore((s) => (currentSessionId ? (s.streaming[currentSessionId] ?? EMPTY_STREAMING) : EMPTY_STREAMING))
  const getGatewayRow = useAgentCacheStore((s) => s.getGatewayRow)
  const setListResult = useAgentCacheStore((s) => s.setListResult)
  const listResult = useAgentCacheStore((s) => s.listResult)

  const session = sessions.find((s) => s.id === currentSessionId) ?? null
  const isHitl = pending !== null && pending.sessionId === currentSessionId
  const isRunning = loopStatus === "started" && !isHitl

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
      budget_max_tokens: "chat.toast.loopEnded.budgetTokens",
      budget_wall_clock: "chat.toast.loopEnded.budgetWallClock",
      stop_phrase: "chat.toast.loopEnded.stopPhrase",
      error: "chat.toast.loopEnded.error",
    }
    const i18nKey = key[reason]
    if (i18nKey) toast.info(t(i18nKey))
  }, [loopEnded, t])

  async function handleAbort() {
    if (!currentSessionId) return
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
      await window.electron.chat.message.send(currentSessionId, text)
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
        const agent = getGatewayRow(m.agentId)
        const name = agent?.name ?? m.agentId
        return { memberId: m.id, agentId: m.agentId, name, avatarUrl: agent?.identity?.avatarUrl, emoji: agent?.identity?.emoji }
      })
      .filter((c) => c.agentId.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
      .slice(0, 6)
  }, [members, mention, getGatewayRow])

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
    setInput("")
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
        await window.electron.chat.message.send(currentSessionId, text)
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

  // ========== sticky bottom scroll ==========
  // 核心设计:
  //   - followBottomRef 追踪"是否应该跟随底部"(用户贴底 + 刚发送消息)
  //   - 程序触发的 scrollTop = scrollHeight 会发 scroll 事件,需 programmaticScrollRef 防竞态
  //     (否则 chip 异步挂载抬高 scrollHeight 时,scroll event 里 distance 被误判为 >40)
  //   - ResizeObserver 观察稳定的 contentRef(而非 firstElementChild,避免条件渲染切换失效)
  //   - 切 session / 发送 / 手动 jump 都强制 follow=true
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const followBottomRef = useRef(true)
  const programmaticScrollRef = useRef(false)
  const [showJumpBtn, setShowJumpBtn] = useState(false)

  /** 程序触发的底部滚动:设 flag 屏蔽一次 handleScroll 的竞态判定。 */
  const scrollToBottomProgrammatic = () => {
    const el = scrollAreaRef.current
    if (!el) return
    programmaticScrollRef.current = true
    el.scrollTop = el.scrollHeight
    // 清 flag:scroll 事件可能 sync 或 next tick 派发,双保险用 rAF + setTimeout(0) 都不够稳,
    // 最保险是 next microtask + rAF。setTimeout 0 够用且简单。
    setTimeout(() => {
      programmaticScrollRef.current = false
    }, 0)
  }

  const handleScroll = () => {
    // 程序触发的滚动跳过判定,避免 chip 异步挂载高度争用
    if (programmaticScrollRef.current) return
    const el = scrollAreaRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    const atBottom = distance < 40
    followBottomRef.current = atBottom
    setShowJumpBtn(!atBottom)
  }

  const jumpToBottom = () => {
    followBottomRef.current = true
    setShowJumpBtn(false)
    scrollToBottomProgrammatic()
  }

  // 切 session 时重置
  useEffect(() => {
    followBottomRef.current = true
    setShowJumpBtn(false)
    scrollToBottomProgrammatic()
  }, [currentSessionId])

  // 消息 / 流式长度变化时,follow 模式下贴底
  const streamingSig = useMemo(() => Object.values(streamingMap).reduce((acc, buf) => acc + buf.content.length, 0), [streamingMap])
  const sortedStreams = useMemo(() => Object.entries(streamingMap).sort((a, b) => a[1].startedAt - b[1].startedAt), [streamingMap])

  useEffect(() => {
    if (!followBottomRef.current) return
    scrollToBottomProgrammatic()
  }, [messages.length, streamingSig])

  // 观察稳定 contentRef 的高度变化:DeliveryChips / footer badges 等异步挂载节点使
  // scrollHeight 增长时 messages.length 不变,useEffect 不触发,RO 兜底。
  useEffect(() => {
    const content = contentRef.current
    if (!content) return
    const ro = new ResizeObserver(() => {
      if (followBottomRef.current) scrollToBottomProgrammatic()
    })
    ro.observe(content)
    return () => ro.disconnect()
  }, [])

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
              {session.mode === "group" ? (
                <Users className="size-3.5 text-muted-foreground" />
              ) : (
                <Bot className="size-3.5 text-muted-foreground" />
              )}
              <span className="text-[11px] text-muted-foreground">
                {session.mode === "group" 
                  ? `${members.length} ${t("chat.members.count")}` 
                  : t("chat.mode.direct")
                }
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {members.length > 0 && (
            <div className="flex items-center -space-x-1">
              {members.slice(0, 3).map((m) => {
                const agent = getGatewayRow(m.agentId)
                return (
                  <div
                    key={m.id}
                    className="bg-muted text-muted-foreground flex size-6 items-center justify-center overflow-hidden rounded-full ring-2 ring-card"
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
              {members.length > 3 && (
                <span className="text-muted-foreground ml-1 text-[11px]">+{members.length - 3}</span>
              )}
            </div>
          )}
          {isRunning && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              <span className="text-[11px] text-primary">{t("chat.status.running")}</span>
            </div>
          )}
        </div>
      </div>

      {lastError &&
        (lastError.kind === "disconnected" ? (
          <div
            role="status"
            className="text-foreground mx-4 mt-3 flex items-start gap-2 rounded-lg border-l-4 border-yellow-500/70 bg-yellow-500/10 px-3 py-2 text-xs shadow-sm"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
            <span className="flex-1 whitespace-pre-wrap">{t("chat.error.disconnected")}</span>
            <button
              type="button"
              onClick={() => currentSessionId && dismissError(currentSessionId)}
              aria-label={t("chat.error.dismiss")}
              className="btn-focus hover:bg-yellow-500/20 text-muted-foreground hover:text-foreground flex size-5 shrink-0 items-center justify-center rounded transition-colors"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <div
            role="alert"
            className="bg-destructive/10 text-foreground border-destructive/60 mx-4 mt-3 flex items-start gap-2 rounded-lg border-l-4 px-3 py-2 text-xs shadow-sm"
          >
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
            <EmptyHint t={t} mode={session?.mode} onCreate={(mode) => { setCreateOpen(true); setCreateMode(mode); }} />
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg, idx) => {
                const agent = msg.senderId ? getGatewayRow(msg.senderId) : undefined
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
                    />
                    {showDeliveryChips && <DeliveryChips sessionId={currentSessionId} messageId={msg.id} />}
                  </Fragment>
                )
              })}
              {/* 流式气泡：按 buffer.openclawSessionKey 反查发言 member → agent（支持 group 多 agent 并发） */}
              {sortedStreams.map(([key, buf]) => {
                const member = members.find((m) => m.openclawKey === buf.openclawSessionKey)
                const agentId = member?.agentId
                const agent = agentId ? getGatewayRow(agentId) : undefined
                return (
                  <StreamingRow
                    key={`stream:${key}`}
                    content={buf.content}
                    agentName={agent?.name ?? agentId ?? undefined}
                    avatarUrl={agent?.identity?.avatarUrl}
                    emoji={agent?.identity?.emoji}
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
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{t("chat.hitl.prompt", { agentId: pending.byAgentId, question: pending.question })}</span>
          </div>
        )}

        <div className="bg-card ring-foreground/10 relative flex flex-col rounded-xl ring-1 transition-shadow focus-within:ring-2 focus-within:ring-primary/20">
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
            className="min-h-[40px] max-h-[200px] resize-none border-0 bg-transparent px-3 py-2.5 text-sm shadow-none focus-visible:ring-0"
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
              <Bot className="size-4 mr-1" />
              {t("chat.empty.newDirect")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onCreate("group")}>
              <Users className="size-4 mr-1" />
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
}

function MessageRow({ msg, agentName, avatarUrl, emoji, agentModel, memberAgentIds }: RowProps) {
  const { t } = useTranslation()
  const isUser = msg.senderType === "user"
  const isAborted = msg.tags?.includes("aborted")
  const isSystem = msg.senderType === "system"
  const text = messageText(msg)
  const rendered = isUser || !isSystem ? highlightMentions(text, memberAgentIds, isUser) : text

  // system：居中、小字灰色、无气泡
  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <span className="text-muted-foreground max-w-[80%] text-[11px] whitespace-pre-wrap">{text || "—"}</span>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <Avatar isUser={isUser} avatarUrl={avatarUrl} emoji={emoji} />
      <div className={`flex max-w-[85%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`min-w-0 overflow-hidden rounded-2xl px-3 py-2 text-sm ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"} ${
            isAborted ? "ring-muted-foreground/40 ring-1 ring-dashed" : ""
          }`}
        >
          <Streamdown mode="static" shikiTheme={SHIKI_THEME} className="markdown-prose">
            {rendered || "—"}
          </Streamdown>
          {isAborted && <span className="text-muted-foreground mt-1 block text-[10px]">{t("chat.aborted")}</span>}
        </div>
        <MessageFooter msg={msg} agentName={agentName} isUser={isUser} agentModel={agentModel} />
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
}: {
  content: string
  agentName?: string
  avatarUrl?: string
  emoji?: string
}) {
  return (
    <div className="flex flex-row gap-3" aria-live="polite" aria-busy="true">
      <Avatar isUser={false} avatarUrl={avatarUrl} emoji={emoji} />
      <div className="flex max-w-[85%] flex-col items-start gap-1">
        <div className="bg-muted text-foreground ring-primary/30 rounded-2xl px-3 py-2 text-sm ring-1">
          {content ? (
            <Streamdown mode="streaming" parseIncompleteMarkdown caret="block" shikiTheme={SHIKI_THEME} className="markdown-prose">
              {content}
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
    <div
      className={`flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg ${
        isUser ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
      }`}
    >
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
  const time = formatTime(msg.createdAtLocal)
  // model: 优先 message 落库的 model（后续 chat.history 补全时会有），fallback 到 agent 配置的 primary
  const model = shortenModel(msg.model ?? agentModel ?? null)
  const usage = msg.usage
  const inTok = formatCompact(usage?.input)
  const outTok = formatCompact(usage?.output)
  const cacheR = formatCompact(usage?.cacheRead)
  const cacheW = formatCompact(usage?.cacheWrite)

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
  if (inTok)
    parts.push(
      <span key="in" title="input tokens" className="text-muted-foreground inline-flex items-center gap-0.5 cursor-help">
        <ArrowUp className="size-2.5" aria-hidden />
        {inTok}
      </span>,
    )
  if (outTok)
    parts.push(
      <span key="out" title="output tokens" className="text-muted-foreground inline-flex items-center gap-0.5 cursor-help">
        <ArrowDown className="size-2.5" aria-hidden />
        {outTok}
      </span>,
    )
  if (cacheR)
    parts.push(
      <span key="cr" title="cache read tokens" className="text-muted-foreground cursor-help">
        R{cacheR}
      </span>,
    )
  if (cacheW)
    parts.push(
      <span key="cw" title="cache write tokens" className="text-muted-foreground cursor-help">
        W{cacheW}
      </span>,
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
