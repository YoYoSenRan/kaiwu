import { Copy } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AgentDetail } from "@contracts/agent"

interface Props {
  detail: AgentDetail
  defaultId?: string
}

export function OverviewTab({ detail, defaultId }: Props) {
  const { t } = useTranslation()
  const gateway = detail.gateway
  const identity = detail.identity
  const isDefault = defaultId && detail.agentId === defaultId

  const name = gateway?.name ?? identity?.name
  const workspace = gateway?.workspace
  const primary = gateway?.model?.primary
  const fallbacks = gateway?.model?.fallbacks ?? []
  const theme = gateway?.identity?.theme
  const emoji = gateway?.identity?.emoji ?? identity?.emoji
  const avatar = gateway?.identity?.avatar ?? identity?.avatar

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    toast.success(t("agent.overview.copied", { field: label }))
  }

  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{t("agent.overview.identity", "Identity")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Field label={t("agent.overview.name")}>
              <div className="flex items-center gap-2">
                <span className="text-sm">{name ?? "—"}</span>
                {isDefault && (
                  <Badge variant="secondary" className="font-normal">
                    {t("agent.detail.defaultBadge")}
                  </Badge>
                )}
              </div>
            </Field>

            <Field label={t("agent.overview.emoji")}>
              <span className="text-sm">{emoji ?? "—"}</span>
            </Field>

            <Field label={t("agent.overview.avatar")}>
              {avatar ? <code className="bg-muted rounded px-2 py-1 text-xs">{avatar}</code> : <span className="text-muted-foreground text-sm">—</span>}
            </Field>

            <Field label={t("agent.overview.theme")}>
              <span className="text-sm">{theme ?? "—"}</span>
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{t("agent.overview.configuration", "Configuration")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Field label={t("agent.overview.workspace")}>
              {workspace ? (
                <div className="flex items-center gap-2">
                  <code className="bg-muted rounded px-2 py-1 text-xs">{workspace}</code>
                  <div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copy(workspace, t("agent.overview.workspace"))}>
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">—</span>
              )}
            </Field>

            <Field label={t("agent.overview.primaryModel")}>
              {primary ? (
                <Badge variant="secondary" className="font-normal">
                  {primary}
                </Badge>
              ) : (
                <span className="text-muted-foreground text-sm">—</span>
              )}
            </Field>

            <Field label={t("agent.overview.fallbacks")}>
              {fallbacks.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {fallbacks.map((m) => (
                    <Badge key={m} variant="secondary" className="font-normal">
                      {m}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">—</span>
              )}
            </Field>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-start gap-4">
      <span className="text-muted-foreground pt-1 text-xs tracking-wide uppercase">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
