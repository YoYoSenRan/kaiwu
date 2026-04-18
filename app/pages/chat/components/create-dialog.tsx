import { Bot, Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAgentCacheStore } from "@/stores/agent"

type Mode = "direct" | "group"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 创建成功后回调：参数是新 sessionId，sidebar 用它切换选中 + 刷新列表。 */
  onCreated: (sessionId: string) => void
}

export function CreateChatDialog({ open, onOpenChange, onCreated }: Props) {
  const { t } = useTranslation()
  const listResult = useAgentCacheStore((s) => s.listResult)
  const setListResult = useAgentCacheStore((s) => s.setListResult)

  const [mode, setMode] = useState<Mode>("direct")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [label, setLabel] = useState("")
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)

  const mine = listResult?.mine ?? []

  // dialog 打开时若没缓存，lazy 拉一次 agent.list 填缓存
  useEffect(() => {
    if (!open) return
    if (listResult) return
    setFetching(true)
    void window.electron.agent
      .list()
      .then((res) => setListResult(res))
      .finally(() => setFetching(false))
  }, [open, listResult, setListResult])

  // mode 切换时清理：single → group 保留；group → single 只留第一个
  useEffect(() => {
    if (mode === "direct" && selected.size > 1) {
      const first = Array.from(selected)[0]
      setSelected(first ? new Set([first]) : new Set())
    }
  }, [mode, selected])

  const reset = () => {
    setMode("direct")
    setSelected(new Set())
    setLabel("")
  }

  const toggleAgent = (agentId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (mode === "direct") {
        return next.has(agentId) ? new Set() : new Set([agentId])
      }
      if (next.has(agentId)) next.delete(agentId)
      else next.add(agentId)
      return next
    })
  }

  const canSubmit = (mode === "direct" ? selected.size === 1 : selected.size >= 1) && !loading

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    try {
      const session = await window.electron.chat.session.create({
        mode,
        label: label.trim() || undefined,
        members: Array.from(selected).map((agentId) => ({ agentId, replyMode: "auto" as const })),
      })
      toast.success(t("chat.toast.create.success"))
      reset()
      onOpenChange(false)
      onCreated(session.id)
    } catch (err) {
      toast.error(t("chat.toast.create.error", { msg: (err as Error).message }))
    } finally {
      setLoading(false)
    }
  }

  const emptyAgents = !fetching && mine.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("chat.dialog.create.title")}</DialogTitle>
          <DialogDescription>{t("chat.dialog.create.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode */}
          <div className="space-y-2">
            <Label>{t("chat.dialog.create.mode")}</Label>
            <div className="grid grid-cols-2 gap-2">
              <ModeCard active={mode === "direct"} onClick={() => setMode("direct")} icon={<Bot className="size-4" />} label={t("chat.dialog.create.modeDirect")} />
              <ModeCard active={mode === "group"} onClick={() => setMode("group")} icon={<Users className="size-4" />} label={t("chat.dialog.create.modeGroup")} />
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <Label>{t("chat.dialog.create.agents")}</Label>
            {emptyAgents ? (
              <div className="ring-foreground/10 rounded-lg px-4 py-6 text-center ring-1">
                <p className="text-muted-foreground text-sm">{t("chat.dialog.create.emptyAgents")}</p>
              </div>
            ) : fetching ? (
              <p className="text-muted-foreground py-4 text-center text-sm">{t("common.loading")}</p>
            ) : (
              <div className="ring-foreground/10 max-h-56 overflow-y-auto rounded-lg ring-1">
                {mine.map((e) => {
                  const checked = selected.has(e.agentId)
                  const gw = e.gateway
                  return (
                    <label key={e.agentId} className={`hover:bg-muted/60 flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors ${checked ? "bg-primary/5" : ""}`}>
                      <Checkbox checked={checked} onCheckedChange={() => toggleAgent(e.agentId)} />
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
                        <p className="truncate text-sm font-medium">{gw?.name ?? e.agentId}</p>
                        {gw?.model?.primary && <p className="text-muted-foreground truncate text-xs">{gw.model.primary}</p>}
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {/* Label */}
          <div className="space-y-2">
            <Label>{t("chat.dialog.create.label")}</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("chat.dialog.create.labelPlaceholder")} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {t("chat.dialog.create.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ModeCard({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ring-foreground/10 flex flex-col items-center gap-1.5 rounded-lg px-4 py-3 text-sm ring-1 transition-colors ${active ? "bg-primary/10 ring-primary/40 text-primary" : "hover:bg-muted/60"}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
