import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useCallback, useEffect, useRef, useState } from "react"
import { Download, RefreshCw, Trash2, Zap } from "lucide-react"
import type { OpenClawStatus } from "../../../../electron/preload"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type BusyAction = null | "sync" | "uninstall" | "restart"

export function PluginCard() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<OpenClawStatus | null>(null)
  const [busy, setBusy] = useState<BusyAction>(null)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    const s = await window.electron.openclaw.status.detect()
    if (!mounted.current) return
    setStatus(s)
  }, [])

  useEffect(() => {
    mounted.current = true
    void refresh()
    const offStatus = window.electron.openclaw.status.on.change((s) => setStatus(s))
    return () => {
      mounted.current = false
      offStatus()
    }
  }, [refresh])

  const wrap = useCallback(async (key: Exclude<BusyAction, null>, fn: () => Promise<void>) => {
    setBusy(key)
    try {
      await fn()
    } finally {
      if (mounted.current) setBusy(null)
    }
  }, [])

  const handleSync = useCallback(
    () =>
      wrap("sync", async () => {
        try {
          const next = await window.electron.openclaw.plugin.install()
          if (mounted.current) setStatus(next)
          toast.success(t("connect.plugin.syncOk"))
        } catch (err) {
          toast.error(t("connect.plugin.syncFail", { message: (err as Error).message }))
        }
      }),
    [t, wrap],
  )

  const handleUninstall = useCallback(
    () =>
      wrap("uninstall", async () => {
        const next = await window.electron.openclaw.plugin.uninstall()
        if (mounted.current) setStatus(next)
        toast.success(t("connect.plugin.uninstallOk"))
      }),
    [t, wrap],
  )

  const handleRestart = useCallback(
    () =>
      wrap("restart", async () => {
        try {
          await window.electron.openclaw.status.restart()
          toast.success(t("connect.plugin.restartOk"))
        } catch (err) {
          toast.error(t("connect.plugin.restartFail", { message: (err as Error).message }))
        }
      }),
    [t, wrap],
  )

  const live = !!status?.installed && !!status?.running

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">{t("connect.plugin.title")}</CardTitle>
          <CardDescription className="text-xs">{t("connect.plugin.description")}</CardDescription>
        </div>
        <Badge variant={live ? "default" : "outline"} className="mt-0.5 font-mono text-[10px] tracking-wide">
          {live ? t("connect.plugin.statusRunning") : t("connect.plugin.statusStopped")}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">{t("connect.plugin.hostVersion")}</div>
            <div className="truncate font-mono text-xs">{status?.version ?? t("connect.plugin.unknown")}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">{t("connect.plugin.gatewayPort")}</div>
            <div className="truncate font-mono text-xs">{status?.gatewayPort ? `:${status.gatewayPort}` : t("connect.plugin.unknown")}</div>
          </div>
        </div>
        <Separator />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={busy === "sync"}>
            <RefreshCw className={`mr-1.5 size-3.5 ${busy === "sync" ? "animate-spin" : ""}`} />
            {t("connect.plugin.detect")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={busy === "sync"}>
            <Download className={`mr-1.5 size-3.5 ${busy === "sync" ? "animate-spin" : ""}`} />
            {t("connect.plugin.sync")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleUninstall} disabled={busy === "uninstall"}>
            <Trash2 className={`mr-1.5 size-3.5 ${busy === "uninstall" ? "animate-spin" : ""}`} />
            {t("connect.plugin.uninstall")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRestart} disabled={busy === "restart"}>
            <Zap className={`mr-1.5 size-3.5 ${busy === "restart" ? "animate-spin" : ""}`} />
            {t("connect.plugin.restart")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
