import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DeleteKnowledgeDialog } from "../../components/delete-dialog"

interface Props {
  id: string
  name: string
  description: string | null
  embeddingModel: string
  onUpdated: () => void
}

/** 知识库设置 tab。 */
export function SettingsTab({ id, name: initialName, description: initialDesc, embeddingModel, onUpdated }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDesc ?? "")
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleSave = async () => {
    await window.electron.knowledge.base.update(id, { name: name.trim(), description: description.trim() || undefined })
    onUpdated()
  }

  const handleDelete = async () => {
    await window.electron.knowledge.base.delete(id)
    navigate("/knowledge")
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t("knowledge.form.name")}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("knowledge.form.description")}</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="space-y-2">
          <Label>Embedding Model</Label>
          <Input value={embeddingModel} disabled />
        </div>
        <Button onClick={handleSave} disabled={!name.trim()}>
          保存
        </Button>
      </div>

      <div className="border-destructive/20 rounded-lg border p-4">
        <h3 className="text-destructive text-sm font-medium">{t("knowledge.delete.title")}</h3>
        <Button variant="destructive" size="sm" className="mt-3" onClick={() => setDeleteOpen(true)}>
          {t("knowledge.delete.title")}
        </Button>
      </div>

      <DeleteKnowledgeDialog open={deleteOpen} name={name} onOpenChange={setDeleteOpen} onConfirm={handleDelete} />
    </div>
  )
}
