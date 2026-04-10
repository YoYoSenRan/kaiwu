import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { ActionsColumn, CardHeader, EventsList, StatusColumn } from "./openclaw-card-parts"

/** 最近事件缓冲上限。超过自动丢弃旧的，避免长时间运行内存膨胀。 */
const EVENT_LOG_MAX = 20

type Status = Awaited<ReturnType<typeof window.electron.openclaw.detect>>
type Compat = Awaited<ReturnType<typeof window.electron.openclaw.check>>
type PluginEvent = Parameters<Parameters<typeof window.electron.openclaw.on.event>[0]>[0]
type BusyAction = null | "detect" | "sync" | "uninstall" | "restart"

/** 设置页面的 OpenClaw 桥接状态卡片。负责数据拉取与动作分发，UI 由 card-parts 提供。 */
export function OpenClawCard() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<Status | null>(null)
  const [compat, setCompat] = useState<Compat | null>(null)
  const [busy, setBusy] = useState<BusyAction>(null)
  const [events, setEvents] = useState<PluginEvent[]>([])
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    const [s, c] = await Promise.all([window.electron.openclaw.detect(), window.electron.openclaw.check()])
    if (!mounted.current) return
    setStatus(s)
    setCompat(c)
  }, [])

  useEffect(() => {
    mounted.current = true
    void refresh()
    const offEvent = window.electron.openclaw.on.event((ev) => {
      setEvents((prev) => [ev, ...prev].slice(0, EVENT_LOG_MAX))
    })
    const offStatus = window.electron.openclaw.on.status((s) => setStatus(s))
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
          const next = await window.electron.openclaw.install()
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
        const next = await window.electron.openclaw.uninstall()
        if (mounted.current) setStatus(next)
        toast.success(t("settings.openclaw.uninstallOk"))
      }),
    [t, wrap],
  )

  const handleRestart = useCallback(
    () =>
      wrap("restart", async () => {
        const r = await window.electron.openclaw.restart()
        if (r.ok) toast.success(t("settings.openclaw.restartOk"))
        else toast.error(t("settings.openclaw.restartFail", { message: r.error ?? "unknown" }))
      }),
    [t, wrap],
  )

  return (
    <section className="mt-12 border border-border p-6 deck-rise" style={{ animationDelay: "560ms" }}>
      <CardHeader t={t} status={status} />
      <div className="mt-6 grid grid-cols-12 gap-8">
        <StatusColumn t={t} status={status} compat={compat} />
        <ActionsColumn
          t={t}
          busy={busy}
          onDetect={() => wrap("detect", refresh)}
          onSync={handleSync}
          onUninstall={handleUninstall}
          onRestart={handleRestart}
          canUninstall={!!status?.bridgeInstalled}
        />
      </div>
      <EventsList t={t} events={events} />
    </section>
  )
}
