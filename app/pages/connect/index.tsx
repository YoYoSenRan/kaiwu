import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useGateway } from "@/hooks/use-gateway"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PluginCard } from "./components/plugin-card"

type AuthMode = "token" | "password"

/** 连接管理页：
 *  - 上半部分：网关连接（状态 + 手动连接）
 *  - 下半部分：本地插件桥接（OpenClaw 插件诊断）
 */
export default function Connect() {
  const { t } = useTranslation()
  const gw = useGateway()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("connect.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("connect.description")}</p>
      </div>

      {/* 网关连接 */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">{t("connect.gateway.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("connect.gateway.description")}</p>
        </div>
        <StatusCard status={gw.status} mode={gw.mode} url={gw.url} error={gw.error} onDisconnect={gw.disconnect} onScan={() => gw.connect()} />
        <ManualConnectCard onConnect={gw.connect} disabled={gw.status === "connecting" || gw.status === "detecting"} />
      </section>

      {/* 本地插件 */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">{t("connect.plugin.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("connect.plugin.description")}</p>
        </div>
        <PluginCard />
      </section>
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

/** 当前网关连接状态。 */
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
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={statusVariant(status)} className="text-sm px-2.5 py-0.5">
            {t(`connect.status.${status}`)}
          </Badge>
          {url && <span className="font-mono text-sm text-muted-foreground break-all">{url}</span>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          {mode && (
            <div className="rounded-md bg-muted px-3 py-2">
              <div className="text-xs text-muted-foreground">{t("connect.label.mode")}</div>
              <div className="font-medium">{t(`connect.mode.${mode}`)}</div>
            </div>
          )}
          {url && (
            <div className="rounded-md bg-muted px-3 py-2">
              <div className="text-xs text-muted-foreground">{t("connect.label.url")}</div>
              <div className="font-medium font-mono text-xs truncate" title={url}>
                {url}
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 sm:col-span-2 lg:col-span-1">
              <div className="text-xs text-destructive/80">{t("connect.label.error")}</div>
              <div className="font-medium text-destructive text-xs">{error}</div>
            </div>
          )}
        </div>

        <div className="pt-1">
          {status === "connected" ? (
            <Button variant="outline" onClick={onDisconnect}>
              {t("connect.action.disconnect")}
            </Button>
          ) : (
            <Button onClick={onScan} disabled={busy}>
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

/** 手动连接网关表单。 */
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

        <Button onClick={submit} disabled={disabled || !url.trim()}>
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
