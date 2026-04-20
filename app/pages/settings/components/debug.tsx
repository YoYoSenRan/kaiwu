import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AlertTriangle, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/** 调试面板:危险操作集合。 */
export function DebugCard() {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleClear() {
    setLoading(true)
    try {
      const res = await window.electron.chat.debug.clearAll()
      const total = Object.values(res.cleared).reduce((sum, n) => sum + n, 0)
      toast.success(t("settings.debug.clearSuccess", { total }))
      setConfirming(false)
      // DB 已清空,但 zustand 缓存着老 sessions/messages/members/deliveries/usage 等一堆状态。
      // 整窗 reload 最干净:彻底重置 React + store + 重新拉一遍数据。
      setTimeout(() => window.location.reload(), 600)
    } catch (err) {
      toast.error(t("settings.debug.clearFailed", { msg: (err as Error).message }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="ring-destructive/20 space-y-3 rounded-lg p-4 ring-1">
        <div className="flex items-start gap-2">
          <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" />
          <div className="flex-1">
            <Label>{t("settings.debug.clearAllTitle")}</Label>
            <p className="text-muted-foreground mt-1 text-xs">{t("settings.debug.clearAllHint")}</p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="destructive" size="sm" onClick={() => setConfirming(true)} disabled={loading}>
            <Trash2 className="mr-1.5 size-3.5" />
            {t("settings.debug.clearAllAction")}
          </Button>
        </div>
      </div>

      <Dialog open={confirming} onOpenChange={(o) => !o && !loading && setConfirming(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive size-5" />
              {t("settings.debug.confirmTitle")}
            </DialogTitle>
            <DialogDescription>{t("settings.debug.confirmDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={loading}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={() => void handleClear()} disabled={loading}>
              {loading ? t("settings.debug.clearing") : t("settings.debug.confirmOk")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
