import { Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DeleteAgentDialog } from "../../components/delete-dialog"
import type { AgentDetail } from "@contracts/agent"

interface Props {
  detail: AgentDetail
  onUpdated: () => void
  onDeleted: () => void
}

export function SettingsTab({ detail, onUpdated, onDeleted }: Props) {
  const { t } = useTranslation()
  const gateway = detail.gateway

  const [name, setName] = useState(gateway?.name ?? "")
  const [model, setModel] = useState(gateway?.model?.primary ?? "")
  const [emoji, setEmoji] = useState(gateway?.identity?.emoji ?? "")
  const [avatar, setAvatar] = useState(gateway?.identity?.avatar ?? "")
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [models, setModels] = useState<Awaited<ReturnType<typeof window.electron.openclaw.models.list>>["models"]>([])

  useEffect(() => {
    setName(gateway?.name ?? "")
    setModel(gateway?.model?.primary ?? "")
    setEmoji(gateway?.identity?.emoji ?? "")
    setAvatar(gateway?.identity?.avatar ?? "")
  }, [gateway?.name, gateway?.model?.primary, gateway?.identity?.emoji, gateway?.identity?.avatar])

  useEffect(() => {
    void window.electron.openclaw.models
      .list()
      .then((res) => setModels(res.models))
      .catch(() => setModels([]))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await window.electron.agent.update({
        agentId: detail.agentId,
        name: name.trim() || undefined,
        model: model.trim() || undefined,
        emoji: emoji.trim() || undefined,
        avatar: avatar.trim() || undefined,
      })
      toast.success(t("agent.toast.update.success"))
      onUpdated()
    } catch (err) {
      toast.error(t("agent.toast.update.error", { msg: (err as Error).message }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("agent.dialog.create.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
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
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {t("common.save")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{t("agent.settings.danger")}</p>
              <p className="text-muted-foreground text-xs">{t("agent.settings.dangerHint")}</p>
            </div>
            <div className="shrink-0">
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-1.5 size-4" />
                {t("agent.dialog.delete.title")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <DeleteAgentDialog open={deleteOpen} agentId={detail.agentId} agentName={gateway?.name} onOpenChange={setDeleteOpen} onDeleted={onDeleted} />
    </div>
  )
}
