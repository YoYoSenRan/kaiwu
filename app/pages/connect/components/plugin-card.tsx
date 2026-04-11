import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useCallback, useEffect, useRef, useState } from "react"
import { Download, RefreshCw, Trash2, Zap } from "lucide-react"
import type { CompatResult, OpenClawStatus, PluginEvent } from "../../../../electron/preload"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/** 最近事件缓冲上限。超过自动丢弃旧的，避免长时间运行内存膨胀。 */
const EVENT_LOG_MAX = 20

type BusyAction = null | "detect" | "sync" | "uninstall" | "restart"

/** 连接页面的 OpenClaw 桥接卡片：状态监控、动作控制与事件日志。 */
export function PluginCard() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<OpenClawStatus | null>(null)
  const [compat, setCompat] = useState<CompatResult | null>(null)
  const [busy, setBusy] = useState<BusyAction>(null)
  const [events, setEvents] = useState<PluginEvent[]>([])
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    const [s, c] = await Promise.all([window.electron.openclaw.lifecycle.detect(), window.electron.openclaw.lifecycle.check()])
    if (!mounted.current) return
    setStatus(s)
    setCompat(c)
  }, [])

  useEffect(() => {
    mounted.current = true
    void refresh()
    const offEvent = window.electron.openclaw.plugin.on.event((ev) => {
      setEvents((prev) => [ev, ...prev].slice(0, EVENT_LOG_MAX))
    })
    const offStatus = window.electron.openclaw.lifecycle.on.status((s) => setStatus(s))
    return () => {
      mounted.current = false
      offEvent()
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
        const r = await window.electron.openclaw.lifecycle.restart()
        if (r.ok) toast.success(t("connect.plugin.restartOk"))
        else toast.error(t("connect.plugin.restartFail", { message: r.error ?? "unknown" }))
      }),
    [t, wrap],
  )

  const live = !!status?.installed && !!status?.running

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{t("connect.plugin.title")}</CardTitle>
          <CardDescription>{t("connect.plugin.description")}</CardDescription>
        </div>
        <Badge variant={live ? "default" : "outline"}>{live ? t("connect.plugin.statusRunning") : t("connect.plugin.statusStopped")}</Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <StatusGrid status={status} compat={compat} />
        <Separator />
        <ActionsRow
          busy={busy}
          onDetect={() => wrap("detect", refresh)}
          onSync={handleSync}
          onUninstall={handleUninstall}
          onRestart={handleRestart}
          canUninstall={!!status?.bridgeInstalled}
        />
        <Separator />
        <EventsList events={events} />
      </CardContent>
    </Card>
  )
}

interface StatusGridProps {
  status: OpenClawStatus | null
  compat: CompatResult | null
}

/** 紧凑三列网格展示桥接状态。 */
function StatusGrid({ status, compat }: StatusGridProps) {
  const { t } = useTranslation()
  const dash = t("connect.plugin.unknown")
  const bridgeValue = status?.bridgeInstalled ? (status.installedBridgeVersion ?? t("connect.plugin.bridgeInstalled")) : t("connect.plugin.bridgeMissing")
  const compatValue = compat ? (compat.compatible ? t("connect.plugin.compatOk") : (compat.reason ?? t("connect.plugin.compatFail"))) : dash

  const items = [
    { label: t("connect.plugin.hostVersion"), value: status?.version ?? dash },
    { label: t("connect.plugin.gatewayPort"), value: status?.gatewayPort ? `:${status.gatewayPort}` : dash },
    { label: t("connect.plugin.bridgeStatus"), value: bridgeValue },
    { label: t("connect.plugin.compat"), value: compatValue },
    { label: t("connect.plugin.detectedBy"), value: status?.detectedBy ?? dash },
    { label: t("connect.plugin.configDir"), value: status?.configDir ?? dash },
  ]

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm lg:grid-cols-3">
      {items.map(({ label, value }) => (
        <div key={label} className="min-w-0">
          <div className="text-muted-foreground text-xs">{label}</div>
          <div className="truncate font-mono text-xs" title={value}>
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}

interface ActionsRowProps {
  busy: BusyAction
  onDetect: () => void
  onSync: () => void
  onUninstall: () => void
  onRestart: () => void
  canUninstall: boolean
}

/** 动作按钮组。 */
function ActionsRow({ busy, onDetect, onSync, onUninstall, onRestart, canUninstall }: ActionsRowProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={onDetect} disabled={busy === "detect"}>
        <RefreshCw className={`mr-1.5 size-3.5 ${busy === "detect" ? "animate-spin" : ""}`} />
        {t("connect.plugin.detect")}
      </Button>
      <Button variant="outline" size="sm" onClick={onSync} disabled={busy === "sync"}>
        <Download className={`mr-1.5 size-3.5 ${busy === "sync" ? "animate-spin" : ""}`} />
        {t("connect.plugin.sync")}
      </Button>
      <Button variant="outline" size="sm" onClick={onUninstall} disabled={!canUninstall || busy === "uninstall"}>
        <Trash2 className={`mr-1.5 size-3.5 ${busy === "uninstall" ? "animate-spin" : ""}`} />
        {t("connect.plugin.uninstall")}
      </Button>
      <Button variant="outline" size="sm" onClick={onRestart} disabled={busy === "restart"}>
        <Zap className={`mr-1.5 size-3.5 ${busy === "restart" ? "animate-spin" : ""}`} />
        {t("connect.plugin.restart")}
      </Button>
    </div>
  )
}

/** 桥接事件日志：自动过滤 heartbeat，只显示有意义的事件。 */
function EventsList({ events }: { events: PluginEvent[] }) {
  const { t } = useTranslation()
  const filtered = events.filter((ev) => {
    if (ev.type !== "custom") return true
    const payload = ev.payload as { channel?: string } | null
    return payload?.channel !== "heartbeat"
  })

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("connect.plugin.events")}</p>
      <ScrollArea className="h-32 rounded-md border">
        {filtered.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">{t("connect.plugin.noEvents")}</p>
        ) : (
          <div className="divide-y">
            {filtered.map((ev, i) => (
              <div key={`${ev.ts}-${i}`} className="flex items-baseline gap-2 px-3 py-1.5 text-xs font-mono">
                <span className="text-muted-foreground shrink-0">{new Date(ev.ts).toLocaleTimeString()}</span>
                <span className="text-primary shrink-0">{ev.type}</span>
                <span className="text-muted-foreground truncate">{JSON.stringify(ev.payload)}</span>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
