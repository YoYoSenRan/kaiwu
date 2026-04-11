import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useGateway } from "@/hooks/use-gateway"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type AuthMode = "token" | "password"

/** 连接管理页：左侧展示当前连接状态，右侧手动连接表单。 */
export default function Connect() {
  const { t } = useTranslation()
  const gw = useGateway()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("connect.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("connect.description")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StatusCard status={gw.status} mode={gw.mode} url={gw.url} error={gw.error} onDisconnect={gw.disconnect} onScan={() => gw.connect()} />
        <ManualConnectCard onConnect={gw.connect} disabled={gw.status === "connecting" || gw.status === "detecting"} />
      </div>
    </div>
  )
}

interface StatusCardProps {
  status: string
  mode: string | null
  url: string | null
  error: string | null
  onDisconnect: () => Promise<void>
  onScan: () => Promise<void>
}

/** 当前连接状态卡片。 */
function StatusCard({ status, mode, url, error, onDisconnect, onScan }: StatusCardProps) {
  const { t } = useTranslation()
  const busy = status === "connecting" || status === "detecting"

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("connect.section.status")}</CardTitle>
        <CardDescription>{t("connect.section.statusDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant(status)}>{t(`connect.status.${status}`)}</Badge>
        </div>

        {url && (
          <div className="grid grid-cols-[80px_1fr] items-baseline gap-2 text-sm">
            <span className="text-muted-foreground">{t("connect.label.url")}</span>
            <span className="font-mono text-xs break-all">{url}</span>
          </div>
        )}

        {mode && (
          <div className="grid grid-cols-[80px_1fr] items-baseline gap-2 text-sm">
            <span className="text-muted-foreground">{t("connect.label.mode")}</span>
            <span className="font-mono text-xs">{t(`connect.mode.${mode}`)}</span>
          </div>
        )}

        {error && <p className="text-xs text-destructive font-mono">{error}</p>}

        <div className="pt-2">
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
      </CardContent>
    </Card>
  )
}

interface ManualFormProps {
  onConnect: (params: { url: string; token?: string; password?: string }) => Promise<void>
  disabled: boolean
}

/** 手动连接表单卡片。 */
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
        <CardTitle>{t("connect.section.manual")}</CardTitle>
        <CardDescription>{t("connect.section.manualDescription")}</CardDescription>
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

        <Button size="sm" onClick={submit} disabled={disabled || !url.trim()}>
          {t("connect.action.connect")}
        </Button>
      </CardContent>
    </Card>
  )
}

/** gateway 状态到 shadcn Badge variant 的映射。 */
function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "connected") return "default"
  if (status === "auth-error" || status === "error") return "destructive"
  if (status === "connecting" || status === "detecting") return "secondary"
  return "outline"
}
