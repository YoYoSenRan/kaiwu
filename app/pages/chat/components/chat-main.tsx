import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Send, Sparkles, AlertCircle, Square, User as UserIcon, Bot, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { Streamdown, type BundledTheme } from "streamdown"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAgentCacheStore } from "@/stores/agent"
import { useChatDataStore, useChatUiStore, type StreamBuffer } from "@/stores/chat"
import type { ChatMember, ChatMessage } from "../../../../electron/features/chat/types"

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
 * agent 头像 ring 调色盘（多 agent 群聊区分发言人）。
 * 例外：agent 身份标识浮层，允许绕 token 体系。选 6 个常见 hue。
 */
const AGENT_RING_CLASSES = [
  "ring-sky-400/60",
  "ring-emerald-400/60",
  "ring-amber-400/60",
  "ring-violet-400/60",
  "ring-rose-400/60",
  "ring-cyan-400/60",
]
function agentRingClass(agentId: string | null | undefined): string {
  if (!agentId) return "ring-foreground/10"
  let h = 0
  for (let i = 0; i < agentId.length; i++) h = (h * 31 + agentId.charCodeAt(i)) | 0
  return AGENT_RING_CLASSES[Math.abs(h) % AGENT_RING_CLASSES.length]
}

/**
 * 把 @agentId 包成 markdown 行内 code（会被 Streamdown 渲染成带底色的等宽标记），
 * 与正文文字区分开。仅匹配 members 中已存在的 agentId；跳过已在 code 块内的匹配。
 */
function highlightMentions(text: string, agentIds: string[]): string {
  if (!text || agentIds.length === 0) return text
  // 按 fenced ``` ... ``` 和 inline `...` 拆开，偶数段是普通文本，奇数段是 code
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]*`)/)
  for (let i = 0; i < parts.length; i += 2) {
    let seg = parts[i]
    for (const id of agentIds) {
      const re = new RegExp(`@${escapeRegex(id)}(?![\\w-])`, "g")
      seg = seg.replace(re, `\`@${id}\``)
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

  const currentSessionId = useChatUiStore((s) => s.currentSessionId)
  const sessions = useChatDataStore((s) => s.sessions)
  const messages = useChatDataStore((s) => (currentSessionId ? (s.messages[currentSessionId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES))
  const members = useChatDataStore((s) => (currentSessionId ? (s.members[currentSessionId] ?? EMPTY_MEMBERS) : EMPTY_MEMBERS))
  const pending = useChatDataStore((s) => s.pending)
  const setPending = useChatDataStore((s) => s.setPending)
  const loopStatus = useChatDataStore((s) => (currentSessionId ? s.loopStatus[currentSessionId] : undefined))
  const loopEnded = useChatDataStore((s) => (currentSessionId ? s.loopEnded[currentSessionId] : undefined))
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
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
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
  // 设计:
  //   - atBottomRef 记录用户当前是否贴在底部（40px 容差）
  //   - 新消息 / 流式 delta 到来 → 仅当贴底时自动滚到底；否则保持当前位置
  //   - 用户滚动触发 handleScroll 更新 atBottomRef
  //   - 切换 session 时强制滚到底 + 重置 atBottom=true
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)
  const [showJumpBtn, setShowJumpBtn] = useState(false)

  const handleScroll = () => {
    const el = scrollAreaRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    const atBottom = distance < 40
    atBottomRef.current = atBottom
    setShowJumpBtn(!atBottom)
  }

  const jumpToBottom = () => {
    const el = scrollAreaRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    atBottomRef.current = true
    setShowJumpBtn(false)
  }

  // 切 session 时重置
  useEffect(() => {
    atBottomRef.current = true
    const el = scrollAreaRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
    const raf = requestAnimationFrame(() => setShowJumpBtn(false))
    return () => cancelAnimationFrame(raf)
  }, [currentSessionId])

  // 消息 / 流式长度变化时，贴底才自动滚
  const streamingSig = useMemo(() => Object.values(streamingMap).reduce((acc, buf) => acc + buf.content.length, 0), [streamingMap])
  const sortedStreams = useMemo(() => Object.entries(streamingMap).sort((a, b) => a[1].startedAt - b[1].startedAt), [streamingMap])

  useEffect(() => {
    if (!atBottomRef.current) return
    const el = scrollAreaRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, streamingSig])

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

      <div className="relative flex min-h-0 flex-1 flex-col">
        {showJumpBtn && (
          <button
            onClick={jumpToBottom}
            className="bg-card text-foreground ring-foreground/10 hover:bg-muted absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs shadow-md ring-1 transition-colors"
          >
            <ChevronDown className="size-3.5" />
            <span>{t("chat.jumpToBottom")}</span>
          </button>
        )}
        <div ref={scrollAreaRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 && sortedStreams.length === 0 ? (
            <EmptyHint t={t} />
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg, idx) => {
                const agent = msg.senderId ? getGatewayRow(msg.senderId) : undefined
                const prev = idx > 0 ? messages[idx - 1] : undefined
                const needDivider = !prev || msg.createdAtLocal - prev.createdAtLocal > TIME_DIVIDER_GAP_MS
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

      <div className="shrink-0 p-4">
        {isHitl && pending && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{t("chat.hitl.prompt", { agentId: pending.byAgentId, question: pending.question })}</span>
          </div>
        )}

        <div className="bg-card ring-foreground/10 relative flex flex-col rounded-xl ring-1 transition-shadow focus-within:ring-2 focus-within:ring-primary/20">
          {mention && mentionCandidates.length > 0 && (
            <div className="bg-card ring-foreground/10 absolute bottom-full left-0 mb-2 w-64 overflow-hidden rounded-lg shadow-md ring-1">
              {mentionCandidates.map((c, i) => (
                <button
                  key={c.memberId}
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
    </div>
  )
}

function EmptyHint({ t }: { t: (k: string) => string }) {
  return (
    <div className="flex h-full items-center justify-center transition-opacity duration-500 ease-out">
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
  const isUser = msg.senderType === "user"
  const isError = msg.tags?.includes("error")
  const isSystem = msg.senderType === "system"
  const text = messageText(msg)
  const rendered = isUser || !isSystem && !isError ? highlightMentions(text, memberAgentIds) : text

  // error：独立红色 alert，居中、带图标
  if (isError) {
    return (
      <div className="flex justify-center py-1">
        <div className="bg-destructive/10 text-destructive ring-destructive/30 flex max-w-[80%] items-start gap-2 rounded-lg px-3 py-2 text-xs whitespace-pre-wrap ring-1">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>{text || "—"}</span>
        </div>
      </div>
    )
  }

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
      <div className={`flex max-w-[70%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        <div className={`min-w-0 overflow-hidden rounded-2xl px-3 py-2 text-sm ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
          <Streamdown mode="static" shikiTheme={SHIKI_THEME} className="markdown-prose">
            {rendered || "—"}
          </Streamdown>
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

function StreamingRow({ content, agentName, avatarUrl, emoji }: { content: string; agentName?: string; avatarUrl?: string; emoji?: string }) {
  return (
    <div className="flex flex-row gap-3">
      <Avatar isUser={false} avatarUrl={avatarUrl} emoji={emoji} />
      <div className="flex max-w-[70%] flex-col items-start gap-1">
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
      <span key="in" className="text-muted-foreground">
        ↑{inTok}
      </span>,
    )
  if (outTok)
    parts.push(
      <span key="out" className="text-muted-foreground">
        ↓{outTok}
      </span>,
    )
  if (cacheR)
    parts.push(
      <span key="cr" className="text-muted-foreground">
        R{cacheR}
      </span>,
    )
  if (cacheW)
    parts.push(
      <span key="cw" className="text-muted-foreground">
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
