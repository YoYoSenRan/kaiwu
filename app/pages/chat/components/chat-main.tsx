import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Send, AlertCircle, Bot, ChevronDown, PanelRightClose, RotateCcw, Square, Users, X, CornerUpLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAgentCacheStore } from "@/stores/agent"
import { useChatDataStore, useChatUiStore, type StreamBuffer } from "@/stores/chat"
import { useSettingsStore } from "@/stores/settings"
import { escapeRegex, relocateMentions } from "@/lib/chat-mention"
import { useFollowBottom } from "../hooks/use-follow-bottom"
import type { ChatMember, ChatMessage } from "../../../../electron/features/chat/types"
import { CreateChatDialog } from "./create-dialog"
import { DeliveryChips } from "./delivery-chips"
import { EmptyHint } from "./empty-hint"
import { MessageRow } from "./message-row"
import { StreamingRow } from "./streaming-row"
import { TimeDivider } from "./time-divider"

const EMPTY_MESSAGES: ChatMessage[] = []
const EMPTY_MEMBERS: ChatMember[] = []
const EMPTY_STREAMING: Record<string, StreamBuffer> = {}

function messageText(msg: ChatMessage): string {
  const c = msg.content as { text?: string } | null
  return c?.text ?? ""
}

/** 相邻消息间隔超过这个阈值，在它们之间插时间分割线。1 小时;跨日界强制插。 */
const TIME_DIVIDER_GAP_MS = 60 * 60 * 1000

export function ChatMain() {
  const { t } = useTranslation()
  const [input, setInput] = useState("")
  const [draftMentionIds, setDraftMentionIds] = useState<string[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [createMode, setCreateMode] = useState<"direct" | "group">("direct")

  const currentSessionId = useChatUiStore((s) => s.currentSessionId)
  const drafts = useChatUiStore((s) => s.drafts)
  const setDraft = useChatUiStore((s) => s.setDraft)
  const clearDraft = useChatUiStore((s) => s.clearDraft)
  const replyTarget = useChatUiStore((s) => (currentSessionId ? (s.replyTargets[currentSessionId] ?? null) : null))
  const setReplyTarget = useChatUiStore((s) => s.setReplyTarget)
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
  const chatDetailOpen = useSettingsStore((s) => s.chatDetailOpen)
  const setChatDetailOpen = useSettingsStore((s) => s.setChatDetailOpen)

  const session = sessions.find((s) => s.id === currentSessionId) ?? null
  const isHitl = pending !== null && pending.sessionId === currentSessionId
  const isRunning = loopStatus === "started" && !isHitl

  // 用户手动"从对话中移除"的消息(UI 软删除,DB 不动)。hidden 集合变更时重算展示消息。
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
    try {
      await window.electron.chat.message.abort(currentSessionId)
      toast.success(t("chat.abort.confirmed"))
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
  // 按 agentId 快速查对应 member 的 contextWindow,用于消息 footer 算 ctx%
  const memberUsagesMap = useChatDataStore((s) => (currentSessionId ? s.memberUsages[currentSessionId] : undefined))
  const ctxWindowByAgentId = useMemo(() => {
    const map: Record<string, number | null> = {}
    for (const m of members) {
      map[m.agentId] = memberUsagesMap?.[m.id]?.contextTokens ?? null
    }
    return map
  }, [members, memberUsagesMap])

  const mentionCandidates = useMemo(() => {
    if (!mention) return []
    const q = mention.query.toLowerCase()
    const list = members
      .map((m) => {
        const agent = byAgentId[m.agentId]
        const name = agent?.name ?? m.agentId
        return { memberId: m.id, agentId: m.agentId, name, avatarUrl: agent?.identity?.avatarUrl, emoji: agent?.identity?.emoji, special: undefined as undefined | "all" }
      })
      .filter((c) => c.agentId.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
      .slice(0, 6)
    // 群聊且 query 匹配 "all" 前缀 → 首项插入 @all 特殊选项
    if (members.length > 1 && "all".startsWith(q)) {
      list.unshift({ memberId: "__all__", agentId: "all", name: t("chat.mention.all"), avatarUrl: undefined, emoji: undefined, special: "all" })
    }
    return list
  }, [members, mention, byAgentId, t])

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

  function selectMention(agentIdOrAll: string) {
    const el = textareaRef.current
    if (!el || !mention) return
    const caret = el.selectionStart ?? input.length
    // @all 展开:插入每个成员 @id 以空格分隔,relocateMentions 自然工作
    const isAll = agentIdOrAll === "__all__"
    const ids = isAll ? members.map((m) => m.agentId) : [agentIdOrAll]
    const inserted = ids.map((id) => `@${id}`).join(" ") + " "
    const next = input.slice(0, mention.start) + inserted + input.slice(caret)
    const nextCaret = mention.start + inserted.length
    setInput(next)
    if (currentSessionId) setDraft(currentSessionId, next)
    setDraftMentionIds((prev) => {
      const merged = new Set(prev)
      for (const id of ids) merged.add(id)
      return Array.from(merged)
    })
    setMention(null)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(nextCaret, nextCaret)
    })
  }

  async function handleSubmit(e?: React.SyntheticEvent) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || !currentSessionId) return
    // 运行态禁止实际发送,保留草稿;提示可按 Stop 结束本轮
    if (isRunning) {
      toast.info(t("chat.placeholderRunning"))
      return
    }
    const structuredMentions = relocateMentions(text, draftMentionIds)
    const inReplyToMessageId = replyTarget?.id
    setInput("")
    setDraftMentionIds([])
    setReplyTarget(currentSessionId, null)
    clearDraft(currentSessionId)
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
    // 发送动作必滚底:对齐 Slack/Discord 惯例(不管此刻滚动位置)
    markFollow()
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
        if (pick) selectMention(pick.special === "all" ? "__all__" : pick.agentId)
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

  const { scrollAreaRef, contentRef, showJumpBtn, jumpToBottom, handleScroll, markFollow } = useFollowBottom({
    resetKey: currentSessionId,
    changeSig: messages.length,
    streamingSig,
    streamJustStarted,
  })

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
          {isRunning && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex size-2">
                <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
                <span className="bg-primary relative inline-flex size-2 rounded-full" />
              </span>
              <span className="text-primary text-[11px]">{t("chat.status.running")}</span>
            </div>
          )}
          {!chatDetailOpen && (
            <button
              type="button"
              onClick={() => setChatDetailOpen(true)}
              aria-label={t("chat.detailPanel.show")}
              title={t("chat.detailPanel.show")}
              className="btn-focus text-muted-foreground hover:text-foreground hover:bg-muted hidden size-7 items-center justify-center rounded-md transition-colors md:flex"
            >
              <PanelRightClose className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <button
          type="button"
          onClick={jumpToBottom}
          aria-label={t("chat.jumpToBottom")}
          title={t("chat.jumpToBottom")}
          aria-hidden={!showJumpBtn}
          tabIndex={showJumpBtn ? 0 : -1}
          className={`btn-focus bg-card text-foreground ring-foreground/10 hover:bg-muted absolute right-4 bottom-4 z-10 flex size-9 items-center justify-center rounded-full shadow-md ring-1 transition-all duration-200 ease-out ${
            showJumpBtn ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
          }`}
        >
          <ChevronDown className="size-4" />
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
                  const crossedDay = prev ? new Date(prev.createdAtLocal).toDateString() !== new Date(msg.createdAtLocal).toDateString() : false
                  const needDivider = !prev || crossedDay || msg.createdAtLocal - prev.createdAtLocal > TIME_DIVIDER_GAP_MS
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
                        contextWindow={msg.senderId ? ctxWindowByAgentId[msg.senderId] : null}
                        agentModel={agent?.model?.primary}
                        memberAgentIds={memberAgentIds}
                        onReply={(m, name) => {
                          if (!currentSessionId) return
                          const snippet = messageText(m).slice(0, 60)
                          setReplyTarget(currentSessionId, { id: m.id, name, snippet })
                          textareaRef.current?.focus()
                        }}
                        onHide={(msgId) => {
                          if (!currentSessionId) return
                          hideMessage(currentSessionId, msgId)
                          toast.success(t("chat.message.deleted"))
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
        {lastError &&
          (lastError.kind === "disconnected" ? (
            <div role="status" className="text-foreground border-warn/70 bg-warn/10 mb-2 flex items-start gap-2 rounded-lg border-l-4 px-3 py-2 text-xs shadow-sm">
              <AlertCircle className="text-warn mt-0.5 size-3.5 shrink-0" />
              <span className="flex-1 whitespace-pre-wrap">{t("chat.error.disconnected")}</span>
              <button
                type="button"
                onClick={() => currentSessionId && dismissError(currentSessionId)}
                aria-label={t("chat.error.dismiss")}
                className="btn-focus text-muted-foreground hover:text-foreground hover:bg-warn/20 flex size-5 shrink-0 items-center justify-center rounded transition-colors"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <div role="alert" className="bg-destructive/10 text-foreground border-destructive/60 mb-2 flex items-start gap-2 rounded-lg border-l-4 px-3 py-2 text-xs shadow-sm">
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
        {isHitl && pending && (
          <div className="border-warn/30 bg-warn/10 text-warn mb-3 flex flex-col gap-2 rounded-lg border px-3 py-2 text-sm">
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
                    selectMention(c.special === "all" ? "__all__" : c.agentId)
                  }}
                  onMouseEnter={() => setMentionIdx(i)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${i === mentionIdx ? "bg-muted" : ""}`}
                >
                  <div className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center overflow-hidden rounded">
                    {c.special === "all" ? (
                      <Users className="size-3" />
                    ) : c.avatarUrl ? (
                      <img src={c.avatarUrl} alt="" className="size-full object-cover" />
                    ) : c.emoji ? (
                      <span className="text-sm">{c.emoji}</span>
                    ) : (
                      <Bot className="size-3" />
                    )}
                  </div>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-muted-foreground truncate text-[11px]">{c.special === "all" ? t("chat.mention.allHint") : `@${c.agentId}`}</span>
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
                onClick={() => currentSessionId && setReplyTarget(currentSessionId, null)}
                className="hover:bg-accent ml-auto rounded p-0.5"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
          <div className="chat-composer">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              onBlur={() => setTimeout(() => setMention(null), 150)}
              placeholder={isRunning ? t("chat.placeholderRunning") : t("chat.placeholder")}
              rows={1}
              role={mention ? "combobox" : undefined}
              aria-autocomplete={mention ? "list" : undefined}
              aria-expanded={mention && mentionCandidates.length > 0 ? true : undefined}
              aria-controls={mention && mentionCandidates.length > 0 ? "chat-mention-listbox" : undefined}
              aria-activedescendant={mention && mentionCandidates.length > 0 ? `chat-mention-option-${mentionIdx}` : undefined}
            />
          </div>

          <div className="flex items-center justify-end border-t px-2 py-1.5">
            {isRunning ? (
              <Button type="button" variant="destructive" onClick={handleAbort}>
                <Square />
                <span>{t("chat.action.stop")}</span>
              </Button>
            ) : (
              <Button type="button" disabled={!input.trim()} onClick={() => handleSubmit()}>
                <Send />
                <span>{t("chat.action.send")}</span>
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

