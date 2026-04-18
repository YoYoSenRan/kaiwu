import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useGateway } from "@/hooks/use-gateway"
import { useGatewayStore } from "@/stores/gateway"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PluginCard } from "./components/plugin"
import { gatewayDotClass } from "@/utils/gateway"
import type { GatewayStatus } from "@/stores/gateway"

type AuthMode = "token" | "password"

export default function Connect() {
  const gw = useGateway()
  const ping = useGatewayStore((s) => s.pingLatencyMs)

  return (
    <div className="space-y-5">
      <StatusBanner status={gw.status} url={gw.url} error={gw.error} ping={ping} onDisconnect={gw.disconnect} onScan={() => gw.connect()} />
      <div className="grid gap-5 lg:grid-cols-2">
        <ManualConnectCard onConnect={gw.connect} disabled={gw.status === "connecting" || gw.status === "detecting"} />
        <PluginCard />
      </div>
    </div>
  )
}

interface StatusBannerProps {
  status: string
  url: string | null
  error: string | null
  ping: number | null
  onDisconnect: () => Promise<void>
  onScan: () => Promise<void>
}

function StatusBanner({ status, url, error, ping, onDisconnect, onScan }: StatusBannerProps) {
  const { t } = useTranslation()
  const busy = status === "connecting" || status === "detecting"

  const bannerText =
    status === "connected" ? t("connect.banner.connected") : status === "error" || status === "auth-error" ? t("connect.banner.error") : t("connect.banner.disconnected")

  return (
    <Card className="flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className={`size-2 rounded-full ${gatewayDotClass(status as GatewayStatus)}`} />
          <span className="leading-none">{bannerText}</span>
        </div>
        <div className="text-muted-foreground font-mono text-xs">
          {url ? url : error ? error : "—"}
          {status === "connected" && ping != null && ` · ${ping}ms`}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {status === "connected" ? (
          <Button variant="outline" size="sm" onClick={onDisconnect}>
            {t("connect.action.disconnect")}
          </Button>
        ) : (
          <Button size="sm" onClick={onScan} disabled={busy}>
            {t("connect.action.scan")}
          </Button>
        )}
      </div>
    </Card>
  )
}

interface ManualFormProps {
  onConnect: (params: { url: string; token?: string; password?: string }) => Promise<void>
  disabled: boolean
}

function ManualConnectCard({ onConnect, disabled }: ManualFormProps) {
  const { t } = useTranslation()
  const [url, setUrl] = useState("")
  const [credential, setCredential] = useState("")
  const [authMode, setAuthMode] = useState<AuthMode>("token")

  const submit = useCallback(() => {
    if (!url.trim()) return
    const params = authMode === "token" ? { url: url.trim(), token: credential || undefined } : { url: url.trim(), password: credential || undefined }
    void onConnect(params)
  }, [url, credential, authMode, onConnect])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t("connect.section.manual")}</CardTitle>
        <CardDescription className="text-xs">{t("connect.section.manualDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="gw-url">{t("connect.label.url")}</Label>
          <Input id="gw-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="ws://127.0.0.1:18789/ws" className="font-mono text-xs" />
        </div>

        <div className="space-y-1.5">
          <Label>{t("connect.label.auth")}</Label>
          <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as AuthMode)}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="token">Token</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            type={authMode === "password" ? "password" : "text"}
            value={credential}
            onChange={(e) => setCredential(e.target.value)}
            placeholder={authMode === "token" ? "Bearer token" : "Password"}
            className="font-mono text-xs"
          />
        </div>

        <Button onClick={submit} disabled={disabled || !url.trim()}>
          {t("connect.action.connect")}
        </Button>
      </CardContent>
    </Card>
  )
}
