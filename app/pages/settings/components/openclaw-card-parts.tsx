import type { TFunction } from "i18next"
import { Activity, Download, RefreshCw, Trash2, Zap } from "lucide-react"
import type { CompatResult, OpenClawStatus, PluginEvent } from "../../../../electron/preload"

type BusyAction = null | "detect" | "sync" | "uninstall" | "restart"

/** 卡片顶部标题栏，带状态点 + i18n 标签。 */
export function CardHeader({ t, status }: { t: TFunction; status: OpenClawStatus | null }) {
  const live = !!status?.installed && !!status.running
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-3">
      <div className="flex items-center gap-3">
        <span className={`size-1.5 rounded-full ${live ? "deck-accent-bg deck-pulse" : "bg-muted-foreground/40"}`} />
        <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">{t("settings.openclaw.title")}</span>
      </div>
      <Activity className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
    </div>
  )
}

/** 状态信息列：逐行展示 host version / port / 兼容性等。 */
export function StatusColumn({ t, status, compat }: { t: TFunction; status: OpenClawStatus | null; compat: CompatResult | null }) {
  const dash = t("settings.openclaw.unknown")
  const running = status?.running ? t("settings.openclaw.statusRunning") : t("settings.openclaw.statusStopped")
  const bridgeValue = status?.bridgeInstalled ? (status.installedBridgeVersion ?? t("settings.openclaw.bridgeInstalled")) : t("settings.openclaw.bridgeMissing")
  const compatValue = compat ? (compat.compatible ? t("settings.openclaw.compatOk") : (compat.reason ?? t("settings.openclaw.compatFail"))) : dash
  const rows: [string, string][] = [
    [t("settings.openclaw.hostVersion"), status?.version ?? dash],
    [running, status?.gatewayPort ? `:${status.gatewayPort}` : dash],
    [t("settings.openclaw.bridgeStatus"), bridgeValue],
    [t("settings.openclaw.compat"), compatValue],
    [t("settings.openclaw.detectedBy"), status?.detectedBy ?? dash],
    [t("settings.openclaw.configDir"), status?.configDir ?? dash],
  ]
  return (
    <div className="col-span-8 space-y-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-2 text-sm">
          <span className="text-xs tracking-[0.15em] text-muted-foreground uppercase shrink-0">{label}</span>
          <span className="font-mono text-foreground tabular truncate text-right" title={value}>
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}

export interface ActionsColumnProps {
  t: TFunction
  busy: BusyAction
  onDetect: () => void
  onSync: () => void
  onUninstall: () => void
  onRestart: () => void
  canUninstall: boolean
}

/** 右侧动作按钮列。 */
export function ActionsColumn(props: ActionsColumnProps) {
  const { t, busy, onDetect, onSync, onUninstall, onRestart, canUninstall } = props
  return (
    <div className="col-span-4 flex flex-col gap-2">
      <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">{t("settings.openclaw.actions")}</span>
      <ActionButton icon={RefreshCw} label={t("settings.openclaw.detect")} loading={busy === "detect"} onClick={onDetect} />
      <ActionButton icon={Download} label={t("settings.openclaw.sync")} loading={busy === "sync"} onClick={onSync} />
      <ActionButton icon={Trash2} label={t("settings.openclaw.uninstall")} loading={busy === "uninstall"} onClick={onUninstall} disabled={!canUninstall} />
      <ActionButton icon={Zap} label={t("settings.openclaw.restart")} loading={busy === "restart"} onClick={onRestart} />
    </div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  loading,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  onClick: () => void
  loading?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="flex items-center gap-2 h-8 px-3 border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-[10px] tracking-[0.15em] font-mono uppercase disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
    >
      <Icon className={`size-3 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
      {label}
    </button>
  )
}

/** 桥接事件日志。自动过滤 heartbeat 噪音，只显示有意义的事件。 */
export function EventsList({ t, events }: { t: TFunction; events: PluginEvent[] }) {
  const filtered = events.filter((ev) => {
    if (ev.type !== "custom") return true
    const payload = ev.payload as { channel?: string } | null
    return payload?.channel !== "heartbeat"
  })
  return (
    <div className="mt-6 pt-4 border-t border-border/50">
      <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">{t("settings.openclaw.events")}</span>
      <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 font-mono">{t("settings.openclaw.noEvents")}</p>
        ) : (
          filtered.map((ev, i) => (
            <div key={`${ev.ts}-${i}`} className="flex items-baseline gap-3 text-[11px] font-mono tabular">
              <span className="text-muted-foreground/60 shrink-0">{new Date(ev.ts).toLocaleTimeString()}</span>
              <span className="deck-accent shrink-0">{ev.type}</span>
              <span className="text-muted-foreground truncate">{JSON.stringify(ev.payload)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
