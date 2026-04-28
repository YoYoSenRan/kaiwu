import { useGatewayStore } from "@/stores/gateway"
import { useChatDataStore } from "@/stores/chat"
import { useAgentCacheStore } from "@/stores/agent"
import { useEffect, useState } from "react"
import { MessageSquare, Database, Bot, Activity } from "lucide-react"
import { useTranslation } from "react-i18next"

export function StatusBar() {
  const { t } = useTranslation()
  const gwStatus = useGatewayStore((s) => s.status)
  const gwPing = useGatewayStore((s) => s.pingLatencyMs)
  const sessionCount = useChatDataStore((s) => s.sessions.length)
  const agentList = useAgentCacheStore((s) => s.listResult)
  const [kbCount, setKbCount] = useState(0)

  useEffect(() => {
    void window.electron.knowledge.base.list().then((list) => setKbCount(list.length))
  }, [])

  const agentCount = agentList ? agentList.mine.length + agentList.unsynced.length : 0

  return (
    <div className="border-border/40 bg-card/80 text-muted-foreground flex h-8 shrink-0 items-center justify-between border-t px-4 text-xs transition-colors">
      <div className="flex items-center gap-4">
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

        <div className="flex items-center gap-3">
          <div className="hover:text-foreground flex cursor-pointer items-center gap-1 transition-colors" title={t("layout.status.sessions")}>
            <MessageSquare size={12} className="opacity-70" />
            <span className="font-mono">{sessionCount}</span>
          </div>
          <div className="hover:text-foreground flex cursor-pointer items-center gap-1 transition-colors" title={t("layout.status.knowledgeBases")}>
            <Database size={12} className="opacity-70" />
            <span className="font-mono">{kbCount}</span>
          </div>
          <div className="hover:text-foreground flex cursor-pointer items-center gap-1 transition-colors" title={t("layout.status.agents")}>
            <Bot size={12} className="opacity-70" />
            <span className="font-mono">{agentCount}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Activity size={12} className="opacity-50" />
          <span className="font-mono tracking-wide opacity-50">{t("layout.status.systemReady")}</span>
        </div>
        <span className="font-mono tracking-wide opacity-50">v{__APP_VERSION__}</span>
      </div>
    </div>
  )
}
