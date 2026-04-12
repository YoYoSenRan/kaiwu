import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

/** 新建知识库对话框。 */
export function CreateKnowledgeDialog({ open, onOpenChange, onCreated }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      await window.electron.knowledge.base.create({ name: name.trim(), description: description.trim() || undefined })
      setName("")
      setDescription("")
      onOpenChange(false)
      onCreated()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("knowledge.create")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("knowledge.form.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("knowledge.form.namePlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label>{t("knowledge.form.description")}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("knowledge.form.descriptionPlaceholder")} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!name.trim() || loading}>
            {t("knowledge.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
