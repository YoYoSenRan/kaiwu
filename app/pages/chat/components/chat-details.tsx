import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Info, Bot, Plus, RotateCcw, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAgentCacheStore } from "@/stores/agent"
import { useChatDataStore, useChatUiStore } from "@/stores/chat"
import type { ChatMember, ReplyMode } from "../../../../electron/features/chat/types"

const BUDGET_DEFAULTS = {
  maxRounds: 200,
  maxTokens: 2_000_000,
  wallClockSec: 24 * 3600,
}

/** 稳定的空数组引用，避免 zustand selector 每次返回新 `[]` 触发无限重渲染。 */
const EMPTY_MEMBERS: ChatMember[] = []

const AGENT_RING_CLASSES = ["ring-sky-400/60", "ring-emerald-400/60", "ring-amber-400/60", "ring-violet-400/60", "ring-rose-400/60", "ring-cyan-400/60"]
function agentRingClass(agentId: string): string {
  let h = 0
  for (let i = 0; i < agentId.length; i++) h = (h * 31 + agentId.charCodeAt(i)) | 0
  return AGENT_RING_CLASSES[Math.abs(h) % AGENT_RING_CLASSES.length]
}

export function ChatDetails() {
  const { t } = useTranslation()
  const currentSessionId = useChatUiStore((s) => s.currentSessionId)
  const sessions = useChatDataStore((s) => s.sessions)
  const members = useChatDataStore((s) => (currentSessionId ? (s.members[currentSessionId] ?? EMPTY_MEMBERS) : EMPTY_MEMBERS))
  const refreshMembers = useChatDataStore((s) => s.refreshMembers)
  const getGatewayRow = useAgentCacheStore((s) => s.getGatewayRow)
  const listResult = useAgentCacheStore((s) => s.listResult)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<ChatMember | null>(null)

  const session = sessions.find((s) => s.id === currentSessionId) ?? null
  const canEditMembers = session?.mode === "group"
  const budgetState = useChatDataStore((s) => (currentSessionId ? s.budgetStates[currentSessionId] : undefined))
  const loopStatus = useChatDataStore((s) => (currentSessionId ? s.loopStatus[currentSessionId] : undefined))
  const refreshBudget = useChatDataStore((s) => s.refreshBudget)
  const resetBudget = useChatDataStore((s) => s.resetBudget)
  const [resetting, setResetting] = useState(false)

  // 进入会话 + loop ended 后拉一次 budget 快照
  useEffect(() => {
    if (!currentSessionId) return
    void refreshBudget(currentSessionId)
  }, [currentSessionId, loopStatus, refreshBudget])

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
    const name = getGatewayRow(member.agentId)?.name ?? member.agentId
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

  return (
    <div className="bg-card text-card-foreground ring-foreground/10 hidden w-72 flex-col overflow-hidden rounded-xl ring-1 xl:flex">
      <div className="border-border/50 flex h-16 shrink-0 items-center gap-2 border-b px-5">
        <Info className="text-muted-foreground size-5" />
        <h3 className="text-sm font-semibold tracking-tight">{t("chat.details.title")}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">{t("chat.details.participants")}</h4>
            {canEditMembers && (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition-colors"
              >
                <Plus className="size-3" />
                <span>{t("chat.members.add")}</span>
              </button>
            )}
          </div>
          {members.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <Bot className="text-muted-foreground size-8" />
              <p className="text-muted-foreground text-sm">{t("chat.members.empty")}</p>
            </div>
          ) : (
            <div className="-mx-2 space-y-1">
              {members.map((m) => {
                const agent = getGatewayRow(m.agentId)
                const name = agent?.name ?? m.agentId
                const avatarUrl = agent?.identity?.avatarUrl
                const emoji = agent?.identity?.emoji
                const model = agent?.model?.primary
                const disabled = togglingId === m.id || removingId === m.id
                return (
                  <div key={m.id} className="hover:bg-muted/50 group flex items-center gap-3 rounded-md p-2 transition-colors">
                    <div className={`bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-2 ${agentRingClass(m.agentId)}`}>
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="size-full object-cover" />
                      ) : emoji ? (
                        <span className="text-lg">{emoji}</span>
                      ) : (
                        <Bot className="size-5" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <span className="truncate text-sm leading-tight font-medium">{name}</span>
                      {model && <span className="text-muted-foreground truncate text-[11px] leading-tight">{model}</span>}
                    </div>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleReplyMode(m)}
                      title={t("chat.members.replyModeHint")}
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-50 ${
                        m.replyMode === "auto" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {m.replyMode === "auto" ? t("chat.members.replyAuto") : t("chat.members.replyMention")}
                    </button>
                    {canEditMembers && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setPendingRemove(m)}
                        title={t("chat.members.remove")}
                        className="text-muted-foreground hover:text-destructive flex size-6 shrink-0 items-center justify-center rounded opacity-0 transition-colors group-hover:opacity-100 disabled:opacity-50"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Budget */}
          {session && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">{t("chat.budget.title")}</h4>
                <button
                  type="button"
                  disabled={resetting || !budgetState}
                  onClick={handleResetBudget}
                  title={t("chat.budget.reset")}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="size-3" />
                  <span>{t("chat.budget.reset")}</span>
                </button>
              </div>
              <BudgetRow
                label={t("chat.budget.rounds")}
                used={budgetState?.roundsUsed ?? 0}
                max={session.budget.maxRounds ?? BUDGET_DEFAULTS.maxRounds}
              />
              <BudgetRow
                label={t("chat.budget.tokens")}
                used={budgetState?.tokensUsed ?? 0}
                max={session.budget.maxTokens ?? BUDGET_DEFAULTS.maxTokens}
                compact
              />
            </div>
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
            <DialogDescription>
              {pendingRemove && t("chat.members.removeConfirm", { name: getGatewayRow(pendingRemove.agentId)?.name ?? pendingRemove.agentId })}
            </DialogDescription>
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

function BudgetRow({ label, used, max, compact }: { label: string; used: number; max: number; compact?: boolean }) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0
  const warn = pct >= 80
  const fmt = (n: number) => {
    if (!compact) return n.toLocaleString()
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
    return String(n)
  }
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground flex items-center justify-between text-[11px]">
        <span>{label}</span>
        <span className={warn ? "text-destructive" : ""}>
          {fmt(used)} / {fmt(max)}
        </span>
      </div>
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div className={`h-full transition-all ${warn ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
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
                  className={`hover:bg-muted/60 flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${checked ? "bg-primary/5" : ""}`}
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
