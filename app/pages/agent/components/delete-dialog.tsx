import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { AgentDeleteStrategy } from "@contracts/agent"

type Mode = "purge" | "unlink"

interface Props {
  open: boolean
  agentId: string
  agentName?: string
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

export function DeleteAgentDialog({ open, agentId, agentName, onOpenChange, onDeleted }: Props) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>("purge")
  const [deleteFiles, setDeleteFiles] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    const strategy: AgentDeleteStrategy =
      mode === "purge" ? { kind: "purge", deleteFiles } : { kind: "unlink" }
    setLoading(true)
    try {
      await window.electron.agent.delete({ agentId, strategy })
      toast.success(mode === "purge" ? t("agent.toast.delete.purge") : t("agent.toast.delete.unlink"))
      onOpenChange(false)
      onDeleted()
    } catch (err) {
      toast.error(t("agent.toast.delete.error", { msg: (err as Error).message }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("agent.dialog.delete.title")}</DialogTitle>
          <DialogDescription>{agentName ?? agentId}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setMode("purge")}
            className={`ring-foreground/10 flex w-full flex-col items-start gap-2 rounded-lg px-4 py-3 text-left ring-1 transition-colors ${mode === "purge" ? "bg-primary/10 ring-primary/40" : "hover:bg-muted/60"}`}
          >
            <span className="text-sm font-medium">{t("agent.dialog.delete.purge")}</span>
            <span className="text-muted-foreground text-xs">{t("agent.dialog.delete.purgeHint")}</span>
            {mode === "purge" && (
              <label className="mt-1 flex items-center gap-2 text-xs">
                <Checkbox
                  checked={deleteFiles}
                  onCheckedChange={(v) => setDeleteFiles(v === true)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span>{t("agent.dialog.delete.deleteFiles")}</span>
              </label>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMode("unlink")}
            className={`ring-foreground/10 flex w-full flex-col items-start gap-1 rounded-lg px-4 py-3 text-left ring-1 transition-colors ${mode === "unlink" ? "bg-primary/10 ring-primary/40" : "hover:bg-muted/60"}`}
          >
            <span className="text-sm font-medium">{t("agent.dialog.delete.unlink")}</span>
            <span className="text-muted-foreground text-xs">{t("agent.dialog.delete.unlinkHint")}</span>
          </button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={loading}>
            {t("agent.dialog.delete.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
