import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { useGateway } from "@/hooks/use-gateway"
import { gatewayStatusDot } from "@/lib/gateway-status"

type AuthMode = "token" | "password"

/** 连接管理页。展示连接状态 + 手动连接表单。 */
export default function Connect() {
  const { t } = useTranslation()
  const gw = useGateway()

  return (
    <div>
      <h1 className="text-[120px] leading-[0.85] font-extralight tracking-[-0.05em]">{t("connect.title")}</h1>
      <p className="mt-8 max-w-md text-sm text-muted-foreground">{t("connect.description")}</p>

      <div className="mt-16 grid grid-cols-12 gap-12">
        <div className="col-span-7">
          <StatusSection status={gw.status} mode={gw.mode} url={gw.url} error={gw.error} onDisconnect={gw.disconnect} onScan={() => gw.connect()} />
        </div>
        <div className="col-span-5">
          <ManualForm onConnect={gw.connect} disabled={gw.status === "connecting" || gw.status === "detecting"} />
        </div>
      </div>
    </div>
  )
}

/** 当前连接状态展示。 */
function StatusSection({ status, mode, url, error, onDisconnect, onScan }: { status: string; mode: string | null; url: string | null; error: string | null; onDisconnect: () => Promise<void>; onScan: () => Promise<void> }) {
  const { t } = useTranslation()

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">{t("connect.section.status")}</span>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className={`size-2 shrink-0 rounded-full ${gatewayStatusDot(status)}`} />
          <span className="text-sm">{t(`connect.status.${status}`)}</span>
        </div>

        {url && (
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{t("connect.label.url")}</span>
            <span className="text-xs font-mono">{url}</span>
          </div>
        )}

        {mode && (
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{t("connect.label.mode")}</span>
            <span className="text-xs font-mono">{t(`connect.mode.${mode}`)}</span>
          </div>
        )}

        {error && <p className="text-xs deck-accent font-mono">{error}</p>}

        <div className="flex gap-2 pt-2">
          {status === "connected" ? (
            <button onClick={onDisconnect} className="flex items-center gap-1.5 h-7 px-2.5 border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <span className="text-[10px] tracking-[0.15em] font-mono uppercase">{t("connect.action.disconnect")}</span>
            </button>
          ) : (
            <button onClick={onScan} disabled={status === "connecting" || status === "detecting"} className="flex items-center gap-1.5 h-7 px-2.5 border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40">
              <span className="text-[10px] tracking-[0.15em] font-mono uppercase">{t("connect.action.scan")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** 手动连接表单。 */
function ManualForm({ onConnect, disabled }: { onConnect: (params: { url: string; token?: string; password?: string }) => Promise<void>; disabled: boolean }) {
  const { t } = useTranslation()
  const [url, setUrl] = useState("")
  const [credential, setCredential] = useState("")
  const [authMode, setAuthMode] = useState<AuthMode>("token")

  const submit = useCallback(() => {
    if (!url.trim()) return
    const params = authMode === "token" ? { url: url.trim(), token: credential || undefined } : { url: url.trim(), password: credential || undefined }
    onConnect(params)
  }, [url, credential, authMode, onConnect])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">{t("connect.section.manual")}</span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{t("connect.label.url")}</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="ws://127.0.0.1:18789/ws" className="mt-1 w-full h-8 px-2.5 border border-border bg-background font-mono text-xs focus:outline-none focus:border-foreground/30 transition-colors" />
        </div>

        <div>
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => setAuthMode("token")} className={`text-[10px] tracking-[0.15em] font-mono uppercase ${authMode === "token" ? "text-foreground" : "text-muted-foreground"}`}>Token</button>
            <button onClick={() => setAuthMode("password")} className={`text-[10px] tracking-[0.15em] font-mono uppercase ${authMode === "password" ? "text-foreground" : "text-muted-foreground"}`}>Password</button>
          </div>
          <input value={credential} onChange={(e) => setCredential(e.target.value)} type={authMode === "password" ? "password" : "text"} placeholder={authMode === "token" ? "Bearer token" : "Password"} className="w-full h-8 px-2.5 border border-border bg-background font-mono text-xs focus:outline-none focus:border-foreground/30 transition-colors" />
        </div>

        <button onClick={submit} disabled={disabled || !url.trim()} className="flex items-center gap-1.5 h-7 px-2.5 border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40">
          <span className="text-[10px] tracking-[0.15em] font-mono uppercase">{t("connect.action.connect")}</span>
        </button>
      </div>
    </div>
  )
}
