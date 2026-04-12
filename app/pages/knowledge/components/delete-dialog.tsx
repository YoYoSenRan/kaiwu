import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Props {
  open: boolean
  name: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

/** 删除知识库确认对话框。 */
export function DeleteKnowledgeDialog({ open, name, onOpenChange, onConfirm }: Props) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("knowledge.delete.title")}</DialogTitle>
          <DialogDescription>{t("knowledge.delete.confirm", { name })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>{t("knowledge.delete.title")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
