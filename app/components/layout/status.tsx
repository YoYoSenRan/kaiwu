import { useGatewayStore } from "@/stores/gateway"
import { Cpu, HardDrive } from "lucide-react"
import { useTranslation } from "react-i18next"

export function StatusBar() {
  const { t } = useTranslation()
  const gwStatus = useGatewayStore((s) => s.status)
  const gwPing = useGatewayStore((s) => s.pingLatencyMs)

  return (
    <div className="border-border/40 bg-card/80 text-muted-foreground flex h-8 shrink-0 items-center justify-between border-t px-4 text-xs transition-colors">
      <div className="flex items-center gap-4">
        {/* Gateway 状态 */}
        <div className="hover:text-foreground flex cursor-pointer items-center gap-1.5 transition-colors">
          {gwStatus === "connected" ? (
            <>
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              </span>
              <span className="font-mono font-medium tracking-wide text-emerald-500/90">
                {t("layout.status.connected")} ({gwPing ?? 0}ms)
              </span>
            </>
          ) : (
            <>
              <span className="size-2.5 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              <span className="font-medium tracking-wide text-red-500/80">{t("layout.status.offline")}</span>
            </>
          )}
        </div>

        {/* 占位：未来可以展示的其他实时信息 */}
        <div className="hover:text-foreground flex cursor-pointer items-center gap-1.5 transition-colors">
          <Cpu size={14} className="opacity-70" />
          <span className="font-mono tracking-wide">
            {t("layout.status.localLlm")}: {t("layout.status.idle")}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5">
          <HardDrive size={14} className="opacity-70" />
          <span className="font-mono tracking-wide">
            {t("layout.status.db")}: {t("layout.status.ready")}
          </span>
        </div>
        <span className="font-mono tracking-wide opacity-50">v1.0.0</span>
      </div>
    </div>
  )
}
