import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function CreateAgentDialog({ open, onOpenChange, onCreated }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [workspace, setWorkspace] = useState("")
  const [model, setModel] = useState("")
  const [emoji, setEmoji] = useState("")
  const [avatar, setAvatar] = useState("")
  const [loading, setLoading] = useState(false)
  const [models, setModels] = useState<Awaited<ReturnType<typeof window.electron.openclaw.models.list>>["models"]>([])

  useEffect(() => {
    if (!open) return
    void window.electron.openclaw.models
      .list()
      .then((res) => setModels(res.models))
      .catch(() => setModels([]))
  }, [open])

  const reset = () => {
    setName("")
    setWorkspace("")
    setModel("")
    setEmoji("")
    setAvatar("")
  }

  const handleSubmit = async () => {
    if (!name.trim() || !workspace.trim()) return
    setLoading(true)
    try {
      await window.electron.agent.create({
        name: name.trim(),
        workspace: workspace.trim(),
        model: model.trim() || undefined,
        emoji: emoji.trim() || undefined,
        avatar: avatar.trim() || undefined,
      })
      toast.success(t("agent.toast.create.success"))
      reset()
      onOpenChange(false)
      onCreated()
    } catch (err) {
      toast.error(t("agent.toast.create.error", { msg: (err as Error).message }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("agent.dialog.create.title")}</DialogTitle>
          <DialogDescription>{t("agent.dialog.create.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("agent.dialog.create.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("agent.dialog.create.workspace")}</Label>
            <Input value={workspace} onChange={(e) => setWorkspace(e.target.value)} placeholder="~/agents/my-agent" />
          </div>
          <div className="space-y-2">
            <Label>{t("agent.dialog.create.model")}</Label>
            <div className="[&>button]:w-full">
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue placeholder={t("agent.dialog.create.modelPlaceholder")} />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectGroup>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={`${m.provider}/${m.id}`}>
                        {m.name} ({m.provider})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("agent.dialog.create.emoji")}</Label>
              <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("agent.dialog.create.avatar")}</Label>
              <Input value={avatar} onChange={(e) => setAvatar(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || !workspace.trim() || loading}>
            {t("agent.dialog.create.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
