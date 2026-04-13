import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useChatStore } from "@/stores/chat"
import { useAgentsStore } from "@/stores/agents"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CreateChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** 新建对话弹窗。选择模式和 agent 后创建对话。 */
export function CreateChatDialog({ open, onOpenChange }: CreateChatDialogProps) {
  const { t } = useTranslation()
  const setChats = useChatStore((s) => s.setChats)
  const setActiveId = useChatStore((s) => s.setActiveId)
  const agents = useAgentsStore((s) => s.rows)

  const [title, setTitle] = useState("")
  const [mode, setMode] = useState<"single" | "roundtable">("single")
  const [selectedAgent, setSelectedAgent] = useState<string>("")
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  // 弹窗打开时加载 agent 列表
  useEffect(() => {
    if (open) window.electron.agent.list().then(useAgentsStore.getState().setRows)
  }, [open])

  const resetForm = () => {
    setTitle("")
    setMode("single")
    setSelectedAgent("")
    setSelectedAgents([])
  }

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]))
  }

  const canSubmit = title.trim() && (mode === "single" ? selectedAgent : selectedAgents.length >= 2)

  const submit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      const agentIds = mode === "single" ? [selectedAgent] : selectedAgents
      const created = await window.electron.chat.create({ title: title.trim(), mode, agentIds })
      const list = await window.electron.chat.list()
      setChats(list)
      setActiveId(created.id)
      resetForm()
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm()
        onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("chat.create.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label htmlFor="chat-title" className="text-xs font-medium">
              {t("chat.create.chatTitle")}
            </label>
            <Input id="chat-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("chat.create.chatTitle")} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="chat-mode" className="text-xs font-medium">
              {t("chat.create.selectMode")}
            </label>
            <Select value={mode} onValueChange={(v) => setMode(v as "single" | "roundtable")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">{t("chat.mode.single")}</SelectItem>
                <SelectItem value="roundtable">{t("chat.mode.roundtable")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "single" ? (
            <div className="space-y-1.5">
              <label htmlFor="chat-agent" className="text-xs font-medium">
                {t("chat.create.selectAgent")}
              </label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("chat.create.selectAgent")} />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.agent}>
                      <span className="mr-1">{a.emoji || "🤖"}</span>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-medium" id="chat-agents-label">
                {t("chat.create.selectAgents")}
              </label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2" role="group" aria-labelledby="chat-agents-label">
                {agents.map((a) => (
                  <label key={a.id} className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1">
                    <Checkbox checked={selectedAgents.includes(a.agent)} onCheckedChange={() => toggleAgent(a.agent)} />
                    <span className="text-sm">
                      {a.emoji || "🤖"} {a.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={!canSubmit || submitting} size="sm">
            {submitting ? t("common.loading") : t("chat.create.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
