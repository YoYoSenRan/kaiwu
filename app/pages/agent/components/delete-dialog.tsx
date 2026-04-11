import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { AgentRow } from "@/types/agent"

interface Props {
  row: AgentRow | null
  onClose: () => void
  onDeleted: () => void
}

/**
 * 删除确认 Dialog。默认不勾选"同时删除 workspace 文件"——破坏性操作要求显式确认。
 */
export function DeleteAgentDialog({ row, onClose, onDeleted }: Props) {
  const { t } = useTranslation()
  const [removeWorkspace, setRemoveWorkspace] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setRemoveWorkspace(false)
    setError(null)
  }

  const handleOpenChange = (open: boolean) => {
    if (deleting) return
    if (!open) {
      reset()
      onClose()
    }
  }

  const confirm = async () => {
    if (!row) return
    setDeleting(true)
    setError(null)
    try {
      await window.electron.agent.delete(row.id, removeWorkspace)
      reset()
      onDeleted()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={!!row} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("agent.delete.title")}</DialogTitle>
          <DialogDescription>{t("agent.delete.message", { name: row?.name ?? "" })}</DialogDescription>
        </DialogHeader>

        {row && (
          <div className="flex items-start gap-2 py-2">
            <Checkbox id="remove-workspace" checked={removeWorkspace} onCheckedChange={(v) => setRemoveWorkspace(v === true)} disabled={deleting} />
            <label htmlFor="remove-workspace" className="text-xs leading-relaxed">
              {t("agent.delete.removeWorkspace")}
              <div className="text-muted-foreground mt-0.5 font-mono text-[10px] break-all">{row.workspace}</div>
            </label>
          </div>
        )}

        {error && <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-xs">{t("agent.delete.failed", { message: error })}</div>}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={deleting}>
            {t("agent.delete.cancel")}
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={deleting}>
            {deleting ? t("agent.delete.deleting") : t("agent.delete.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
