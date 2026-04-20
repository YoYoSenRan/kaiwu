import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Info, Bot, ChevronDown, ChevronRight, Plus, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAgentCacheStore } from "@/stores/agent"
import { useChatDataStore, useChatUiStore } from "@/stores/chat"
import { useSettingsStore } from "@/stores/settings"
import { MemberCard } from "./member-card"
import type { ChatMember, ReplyMode } from "../../../../electron/features/chat/types"

const BUDGET_DEFAULTS = {
  maxRounds: 200,
}

/** 稳定的空数组引用，避免 zustand selector 每次返回新 `[]` 触发无限重渲染。 */
const EMPTY_MEMBERS: ChatMember[] = []
const EMPTY_MEMBER_USAGES: Record<string, never> = {}

export function ChatDetails() {
  const { t } = useTranslation()
  const currentSessionId = useChatUiStore((s) => s.currentSessionId)
  const sessions = useChatDataStore((s) => s.sessions)
  const members = useChatDataStore((s) => (currentSessionId ? (s.members[currentSessionId] ?? EMPTY_MEMBERS) : EMPTY_MEMBERS))
  const memberUsages = useChatDataStore((s) => (currentSessionId ? (s.memberUsages[currentSessionId] ?? EMPTY_MEMBER_USAGES) : EMPTY_MEMBER_USAGES))
  const refreshMembers = useChatDataStore((s) => s.refreshMembers)
  const byAgentId = useAgentCacheStore((s) => s.byAgentId)
  const listResult = useAgentCacheStore((s) => s.listResult)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<ChatMember | null>(null)

  const session = sessions.find((s) => s.id === currentSessionId) ?? null
  const isDirect = session?.mode === "direct"
  const canEditMembers = session?.mode === "group"
  const budgetState = useChatDataStore((s) => (currentSessionId ? s.budgetStates[currentSessionId] : undefined))
  const loopStatus = useChatDataStore((s) => (currentSessionId ? s.loopStatus[currentSessionId] : undefined))
  const refreshBudget = useChatDataStore((s) => s.refreshBudget)
  const resetBudget = useChatDataStore((s) => s.resetBudget)
  const refreshMemberUsages = useChatDataStore((s) => s.refreshMemberUsages)
  const [resetting, setResetting] = useState(false)

  // 进入会话 + loop ended 后刷:member usage 每次都拉(per-session openclaw 数据);群聊额外拉 rounds
  useEffect(() => {
    if (!currentSessionId || !session) return
    void refreshMemberUsages(currentSessionId)
    if (!isDirect) void refreshBudget(currentSessionId)
  }, [currentSessionId, session, loopStatus, isDirect, refreshBudget, refreshMemberUsages])

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

  async function handleResetBudget() {
    if (!currentSessionId) return
    setResetting(true)
    try {
      await resetBudget(currentSessionId)
      toast.success(t("chat.budget.resetDone"))
    } catch (err) {
      toast.error(t("chat.budget.resetFailed", { msg: (err as Error).message }))
    } finally {
      setResetting(false)
    }
  }

  async function confirmRemoveMember() {
    const member = pendingRemove
    if (!member || !currentSessionId) return
    const name = byAgentId[member.agentId]?.name ?? member.agentId
    setRemovingId(member.id)
    setPendingRemove(null)
    try {
      await window.electron.chat.member.remove(currentSessionId, member.id)
      await refreshMembers(currentSessionId)
      toast.success(t("chat.members.removedToast", { name }))
    } catch (err) {
      toast.error(t("chat.members.removeFailed", { msg: (err as Error).message }))
    } finally {
      setRemovingId(null)
    }
  }

  const maxRounds = session?.budget.maxRounds ?? BUDGET_DEFAULTS.maxRounds
  const roundsUsed = budgetState?.roundsUsed ?? 0
  const roundsPct = Math.min(100, (roundsUsed / maxRounds) * 100)
  const roundsWarn = roundsPct >= 80

  const chatDetailOpen = useSettingsStore((s) => s.chatDetailOpen)
  const setChatDetailOpen = useSettingsStore((s) => s.setChatDetailOpen)

  if (!chatDetailOpen) {
    return (
      <button
        type="button"
        onClick={() => setChatDetailOpen(true)}
        aria-label={t("chat.detailPanel.show")}
        title={t("chat.detailPanel.show")}
        className="btn-focus bg-card text-muted-foreground hover:text-foreground ring-foreground/10 hidden w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-colors md:flex"
      >
        <ChevronRight className="size-4" />
      </button>
    )
  }

  return (
    <div className="bg-card text-card-foreground ring-foreground/10 hidden w-80 flex-col overflow-hidden rounded-xl ring-1 md:flex">
      <div className="border-border/50 flex h-16 shrink-0 items-center justify-between gap-2 border-b px-5">
        <div className="flex items-center gap-2">
          <Info className="text-muted-foreground size-5" />
          <h3 className="text-sm font-semibold tracking-tight">{t("chat.details.title")}</h3>
        </div>
        <button
          type="button"
          onClick={() => setChatDetailOpen(false)}
          aria-label={t("chat.detailPanel.hide")}
          title={t("chat.detailPanel.hide")}
          className="btn-focus text-muted-foreground hover:text-foreground hover:bg-muted flex size-7 items-center justify-center rounded-md transition-colors"
        >
          <ChevronRight className="size-4 rotate-180" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex w-full items-center justify-between">
              <h4 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                {t("chat.details.participants")}
                {members.length > 0 && <span className="ml-1 normal-case opacity-70">({members.length})</span>}
              </h4>
              <div className="flex items-center gap-1">
                {canEditMembers && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setAddOpen(true)
                    }}
                    className="btn-focus text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition-colors"
                  >
                    <Plus className="size-3" />
                    <span>{t("chat.members.add")}</span>
                  </button>
                )}
                <ChevronDown className="text-muted-foreground size-4 transition-transform data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {members.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6">
                  <Bot className="text-muted-foreground size-8" />
                  <p className="text-muted-foreground text-sm">{t("chat.members.empty")}</p>
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  {currentSessionId &&
                    members.map((m) => (
                      <MemberCard
                        key={m.id}
                        sessionId={currentSessionId}
                        member={m}
                        usage={memberUsages[m.id]}
                        disabled={togglingId === m.id || removingId === m.id}
                        onToggleReplyMode={() => void toggleReplyMode(m)}
                        onRemove={() => setPendingRemove(m)}
                        allowRemove={canEditMembers}
                      />
                    ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* 群聊才有 rounds 护栏;单聊 context 已在 MemberCard 显示,此块省略 */}
          {session && !isDirect && (
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex w-full items-center justify-between pt-2">
                <h4 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">{t("chat.budget.title")}</h4>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={resetting || !budgetState}
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleResetBudget()
                    }}
                    title={t("chat.budget.reset")}
                    className="btn-focus text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="size-3" />
                    <span>{t("chat.budget.reset")}</span>
                  </button>
                  <ChevronDown className="text-muted-foreground size-4 transition-transform data-[state=open]:rotate-180" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-1 pt-2">
                  <div className="text-muted-foreground flex items-center justify-between text-[11px]">
                    <span>{t("chat.budget.rounds")}</span>
                    <span className={roundsWarn ? "text-destructive font-medium" : ""}>
                      {roundsUsed} / {maxRounds}
                    </span>
                  </div>
                  <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                    <div className={`h-full transition-all ${roundsWarn ? "bg-destructive" : "bg-primary"}`} style={{ width: `${roundsPct}%` }} />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>

      <AddMemberDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        sessionId={currentSessionId}
        existingAgentIds={members.map((m) => m.agentId)}
        availableAgents={listResult?.mine ?? []}
        onAdded={() => currentSessionId && void refreshMembers(currentSessionId)}
      />

      <Dialog open={pendingRemove !== null} onOpenChange={(o) => !o && setPendingRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("chat.members.remove")}</DialogTitle>
            <DialogDescription>{pendingRemove && t("chat.members.removeConfirm", { name: byAgentId[pendingRemove.agentId]?.name ?? pendingRemove.agentId })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRemove(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={() => void confirmRemoveMember()}>
              {t("chat.members.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface AddDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string | null
  existingAgentIds: string[]
  availableAgents: Array<{ agentId: string; gateway?: { name?: string; identity?: { avatarUrl?: string; emoji?: string }; model?: { primary?: string } } }>
  onAdded: () => void
}

function AddMemberDialog({ open, onOpenChange, sessionId, existingAgentIds, availableAgents, onAdded }: AddDialogProps) {
  const { t } = useTranslation()
  const setListResult = useAgentCacheStore((s) => s.setListResult)
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // 打开 dialog 时若 cache 空则懒加载 agent 列表（与 create-dialog 一致）
  useEffect(() => {
    if (!open) return
    if (availableAgents.length > 0) return
    void window.electron.agent
      .list()
      .then((res) => setListResult(res))
      .catch(() => {})
  }, [open, availableAgents.length, setListResult])

  const existSet = useMemo(() => new Set(existingAgentIds), [existingAgentIds])
  const candidates = useMemo(() => availableAgents.filter((a) => !existSet.has(a.agentId)), [availableAgents, existSet])

  async function handleSubmit() {
    if (!sessionId || !selected) return
    setLoading(true)
    try {
      const name = availableAgents.find((a) => a.agentId === selected)?.gateway?.name ?? selected
      await window.electron.chat.member.add(sessionId, { agentId: selected, replyMode: "auto" })
      onAdded()
      toast.success(t("chat.members.addedToast", { name }))
      setSelected(null)
      onOpenChange(false)
    } catch (err) {
      toast.error(t("chat.members.addFailed", { msg: (err as Error).message }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("chat.members.addTitle")}</DialogTitle>
        </DialogHeader>

        {candidates.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">{t("chat.members.allAdded")}</p>
        ) : (
          <div className="ring-foreground/10 max-h-60 overflow-y-auto rounded-lg ring-1">
            {candidates.map((a) => {
              const gw = a.gateway
              const checked = selected === a.agentId
              return (
                <button
                  type="button"
                  key={a.agentId}
                  onClick={() => setSelected(a.agentId)}
                  className={`btn-focus hover:bg-muted/60 flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${checked ? "bg-primary/5" : ""}`}
                >
                  <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md">
                    {gw?.identity?.avatarUrl ? (
                      <img src={gw.identity.avatarUrl} alt="" className="size-full object-cover" />
                    ) : gw?.identity?.emoji ? (
                      <span>{gw.identity.emoji}</span>
                    ) : (
                      <Bot className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{gw?.name ?? a.agentId}</p>
                    {gw?.model?.primary && <p className="text-muted-foreground truncate text-xs">{gw.model.primary}</p>}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!selected || loading}>
            {t("chat.members.addConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
