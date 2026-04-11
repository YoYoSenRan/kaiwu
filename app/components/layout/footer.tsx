import { useTranslation } from "react-i18next"
import { gatewayDotColor } from "@/lib/gateway"
import { useGatewayStore } from "@/stores/gateway"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * 全局底部状态条：左版本/环境、中连接状态胶囊、右 ping 延迟或重连倒计时 + 快捷键提示。
 * 中段 hover 显示完整 tooltip（地址/模式/延迟/错误/倒计时），点击跳 /connect。
 * 倒计时仅在 nextRetryAt 存在时启 interval，避免无谓的每秒 re-render。
 */
export function Footer() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const status = useGatewayStore((s) => s.status)
  const mode = useGatewayStore((s) => s.mode)
  const url = useGatewayStore((s) => s.url)
  const error = useGatewayStore((s) => s.error)
  const pingLatencyMs = useGatewayStore((s) => s.pingLatencyMs)
  const nextRetryAt = useGatewayStore((s) => s.nextRetryAt)

  // 重连倒计时仅在 nextRetryAt 存在时驱动 re-render，避免常驻 interval。
  // now 用 state 存而不是渲染期调 Date.now()——react-hooks/purity 不让在渲染期调 impure 函数。
  // 首次更新走 setTimeout(0) 推到下一帧，避免 react-hooks/set-state-in-effect 的同步 setState 报错。
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (nextRetryAt == null) return
    const initId = setTimeout(() => setNow(Date.now()), 0)
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      clearTimeout(initId)
      clearInterval(id)
    }
  }, [nextRetryAt])

  const retrySeconds = nextRetryAt != null ? Math.max(0, Math.ceil((nextRetryAt - now) / 1000)) : null
  const label = status === "connected" && url ? url.replace("ws://", "") : t(`connect.status.${status}`)

  return (
    <footer className="border-border text-muted-foreground flex h-10 shrink-0 items-center justify-between border-t px-4 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-mono">v0.1.0</span>
        <span>·</span>
        <span className="font-mono">DEV</span>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => navigate("/connect")}
            className="hover:bg-accent hover:text-foreground flex items-center gap-2 rounded-md px-2 py-1 font-mono transition-colors"
          >
            <span className={`size-2 shrink-0 rounded-full ${gatewayDotColor(status)}`} />
            <span className="max-w-[280px] truncate">{label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="font-mono">
          <ConnectionTooltip status={status} mode={mode} url={url} error={error} pingLatencyMs={pingLatencyMs} retrySeconds={retrySeconds} />
        </TooltipContent>
      </Tooltip>

      <div className="flex items-center gap-2">
        {status === "connected" && pingLatencyMs != null && <span className="font-mono">{t("footer.ping", { ms: pingLatencyMs })}</span>}
        {status === "disconnected" && retrySeconds != null && <span className="font-mono">{t("footer.retryIn", { seconds: retrySeconds })}</span>}
        <span className="font-mono">{t("common.toggleThemeHint")}</span>
      </div>
    </footer>
  )
}

interface ConnectionTooltipProps {
  status: ReturnType<typeof useGatewayStore.getState>["status"]
  mode: ReturnType<typeof useGatewayStore.getState>["mode"]
  url: string | null
  error: string | null
  pingLatencyMs: number | null
  retrySeconds: number | null
}

/** Tooltip 内容：按状态分支拼多行文本，每行独立 i18n key 避免在翻译里写 HTML 或换行符。 */
function ConnectionTooltip({ status, mode, url, error, pingLatencyMs, retrySeconds }: ConnectionTooltipProps) {
  const { t } = useTranslation()
  const lines: string[] = []

  if (url) lines.push(`${t("footer.tooltip.address")}: ${url}`)
  if (mode) lines.push(`${t("footer.tooltip.mode")}: ${t(mode === "scan" ? "footer.tooltip.modeScan" : "footer.tooltip.modeManual")}`)
  if (status === "connected" && pingLatencyMs != null) lines.push(`${t("footer.tooltip.latency")}: ${t("footer.ping", { ms: pingLatencyMs })}`)
  if (error) lines.push(`${t("footer.tooltip.error")}: ${error}`)
  if (status === "disconnected" && retrySeconds != null) lines.push(t("footer.tooltip.retryHint", { seconds: retrySeconds }))
  if (status === "auth-error") lines.push(t("footer.tooltip.noRetry"))
  lines.push(t("footer.tooltip.clickToOpen"))

  return (
    <div className="flex flex-col gap-0.5">
      {lines.map((line, i) => (
        <span key={i}>{line}</span>
      ))}
    </div>
  )
}
