import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Send, Sparkles, AlertCircle, Square, User as UserIcon, Bot, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { Streamdown, type BundledTheme } from "streamdown"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAgentCacheStore } from "@/stores/agent"
import { useChatDataStore, useChatUiStore, type StreamBuffer } from "@/stores/chat"
import type { ChatMessage } from "../../../../electron/features/chat/types"

/** Shiki 代码高亮主题，light/dark 各一套。 */
const SHIKI_THEME: [BundledTheme, BundledTheme] = ["github-light", "github-dark"]

const EMPTY_MESSAGES: ChatMessage[] = []
const EMPTY_STREAMING: Record<string, StreamBuffer> = {}

function messageText(msg: ChatMessage): string {
  const c = msg.content as { text?: string } | null
  return c?.text ?? ""
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
  const pending = useChatDataStore((s) => s.pending)
  const setPending = useChatDataStore((s) => s.setPending)
  const loopStatus = useChatDataStore((s) => (currentSessionId ? s.loopStatus[currentSessionId] : undefined))
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

  async function handleAbort() {
    if (!currentSessionId) return
    try {
      await window.electron.chat.message.abort(currentSessionId)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const text = input.trim()
    if (!text || !currentSessionId) return
    setInput("")
    if (isHitl && pending) {
      await window.electron.chat.message.answer(currentSessionId, { pendingId: pending.pendingId, answer: text })
      setPending(null)
    } else {
      await window.electron.chat.message.send(currentSessionId, text)
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
    setShowJumpBtn(false)
    const el = scrollAreaRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [currentSessionId])

  // 消息 / 流式长度变化时，贴底才自动滚
  const streamingSig = useMemo(() => Object.values(streamingMap).reduce((acc, buf) => acc + buf.content.length, 0), [streamingMap])
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

  const sortedStreams = Object.entries(streamingMap).sort((a, b) => a[1].startedAt - b[1].startedAt)

  return (
    <div className="bg-card text-card-foreground ring-foreground/10 flex flex-1 flex-col overflow-hidden rounded-xl ring-1">
      <div className="border-border/50 flex h-16 shrink-0 items-center justify-between border-b px-5">
        <h2 className="text-sm font-semibold tracking-tight">{session?.label ?? currentSessionId}</h2>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {showJumpBtn && (
          <button
            onClick={jumpToBottom}
            className="bg-card text-foreground ring-foreground/10 hover:bg-muted absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs shadow-md ring-1 transition-colors"
          >
            <ChevronDown className="size-3.5" />
            <span>{t("chat.jumpToBottom")}</span>
          </button>
        )}
        <div ref={scrollAreaRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 && sortedStreams.length === 0 ? (
            <EmptyHint t={t} />
          ) : (
            <div className="space-y-5">
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
                    />
                  </Fragment>
                )
              })}
              {/* 流式气泡 */}
              {sortedStreams.map(([key, buf]) => {
                // 流式气泡属于当前 session 唯一"正在说话"的 agent；direct 下就是唯一成员
                const lastAssistant = [...messages].reverse().find((m) => m.senderType === "agent")
                const agentId = lastAssistant?.senderId
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

      <div className="border-border/50 shrink-0 border-t p-4">
        {isHitl && pending && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{t("chat.hitl.prompt", { agentId: pending.byAgentId, question: pending.question })}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("chat.placeholder")} disabled={isRunning} />
          {isRunning ? (
            <Button size="icon" type="button" variant="destructive" onClick={handleAbort}>
              <Square />
            </Button>
          ) : (
            <Button size="icon" type="submit" disabled={!input.trim()}>
              <Send />
            </Button>
          )}
        </form>
      </div>
    </div>
  )
}

function EmptyHint({ t }: { t: (k: string) => string }) {
  return (
    <div className="flex h-full items-center justify-center">
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
}

function MessageRow({ msg, agentName, avatarUrl, emoji, agentModel }: RowProps) {
  const isUser = msg.senderType === "user"
  const isError = msg.tags?.includes("error")
  const isSystem = msg.senderType === "system"
  const text = messageText(msg)

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <Avatar isUser={isUser} avatarUrl={avatarUrl} emoji={emoji} />
      <div className={`flex max-w-[70%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm ${
            isError
              ? "bg-destructive/10 text-destructive ring-destructive/30 whitespace-pre-wrap ring-1"
              : isUser
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
          }`}
        >
          {isError || isSystem ? (
            <span className="whitespace-pre-wrap">{text || "—"}</span>
          ) : (
            <Streamdown mode="static" shikiTheme={SHIKI_THEME} className="markdown-prose">
              {text || "—"}
            </Streamdown>
          )}
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
        <div className="bg-muted text-foreground ring-primary/30 rounded-2xl px-4 py-2.5 text-sm ring-1">
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
