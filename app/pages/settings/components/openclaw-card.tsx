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

/** 设置页面的 OpenClaw 桥接状态卡片。负责数据拉取与动作分发 + 状态/动作/事件日志展示。 */
export function OpenClawCard() {
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
          toast.success(t("settings.openclaw.syncOk"))
        } catch (err) {
          toast.error(t("settings.openclaw.syncFail", { message: (err as Error).message }))
        }
      }),
    [t, wrap],
  )

  const handleUninstall = useCallback(
    () =>
      wrap("uninstall", async () => {
        const next = await window.electron.openclaw.plugin.uninstall()
        if (mounted.current) setStatus(next)
        toast.success(t("settings.openclaw.uninstallOk"))
      }),
    [t, wrap],
  )

  const handleRestart = useCallback(
    () =>
      wrap("restart", async () => {
        const r = await window.electron.openclaw.lifecycle.restart()
        if (r.ok) toast.success(t("settings.openclaw.restartOk"))
        else toast.error(t("settings.openclaw.restartFail", { message: r.error ?? "unknown" }))
      }),
    [t, wrap],
  )

  const live = !!status?.installed && !!status?.running

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{t("settings.openclaw.title")}</CardTitle>
          <CardDescription>{t("settings.openclaw.description")}</CardDescription>
        </div>
        <Badge variant={live ? "default" : "outline"}>{live ? t("settings.openclaw.statusRunning") : t("settings.openclaw.statusStopped")}</Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <StatusRows status={status} compat={compat} />
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

interface StatusRowsProps {
  status: OpenClawStatus | null
  compat: CompatResult | null
}

/** 状态信息：逐行展示 host version / port / 兼容性 / 插件安装状态。 */
function StatusRows({ status, compat }: StatusRowsProps) {
  const { t } = useTranslation()
  const dash = t("settings.openclaw.unknown")
  const bridgeValue = status?.bridgeInstalled ? (status.installedBridgeVersion ?? t("settings.openclaw.bridgeInstalled")) : t("settings.openclaw.bridgeMissing")
  const compatValue = compat ? (compat.compatible ? t("settings.openclaw.compatOk") : (compat.reason ?? t("settings.openclaw.compatFail"))) : dash
  const rows: [string, string][] = [
    [t("settings.openclaw.hostVersion"), status?.version ?? dash],
    [t("settings.openclaw.gatewayPort"), status?.gatewayPort ? `:${status.gatewayPort}` : dash],
    [t("settings.openclaw.bridgeStatus"), bridgeValue],
    [t("settings.openclaw.compat"), compatValue],
    [t("settings.openclaw.detectedBy"), status?.detectedBy ?? dash],
    [t("settings.openclaw.configDir"), status?.configDir ?? dash],
  ]

  return (
    <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-mono text-xs truncate" title={value}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
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
        {t("settings.openclaw.detect")}
      </Button>
      <Button variant="outline" size="sm" onClick={onSync} disabled={busy === "sync"}>
        <Download className={`mr-1.5 size-3.5 ${busy === "sync" ? "animate-spin" : ""}`} />
        {t("settings.openclaw.sync")}
      </Button>
      <Button variant="outline" size="sm" onClick={onUninstall} disabled={!canUninstall || busy === "uninstall"}>
        <Trash2 className={`mr-1.5 size-3.5 ${busy === "uninstall" ? "animate-spin" : ""}`} />
        {t("settings.openclaw.uninstall")}
      </Button>
      <Button variant="outline" size="sm" onClick={onRestart} disabled={busy === "restart"}>
        <Zap className={`mr-1.5 size-3.5 ${busy === "restart" ? "animate-spin" : ""}`} />
        {t("settings.openclaw.restart")}
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
      <p className="text-sm font-medium">{t("settings.openclaw.events")}</p>
      <ScrollArea className="h-40 rounded-md border">
        {filtered.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">{t("settings.openclaw.noEvents")}</p>
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
