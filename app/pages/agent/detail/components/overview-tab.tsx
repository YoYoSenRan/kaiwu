import { Copy } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
    <Card>
      <CardContent>
        <div className="space-y-4">
          <Field label={t("agent.overview.name")}>
            <div className="flex items-center gap-2">
              <span className="text-sm">{name ?? "—"}</span>
              {isDefault && <Badge variant="secondary">{t("agent.detail.defaultBadge")}</Badge>}
            </div>
          </Field>

          <Field label={t("agent.overview.workspace")}>
            {workspace ? (
              <div className="flex items-center gap-2">
                <code className="bg-muted rounded px-2 py-1 text-xs">{workspace}</code>
                <div>
                  <Button variant="ghost" size="sm" onClick={() => copy(workspace, t("agent.overview.workspace"))}>
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
          </Field>

          <Field label={t("agent.overview.primaryModel")}>
            {primary ? <Badge variant="secondary">{primary}</Badge> : <span className="text-muted-foreground text-sm">—</span>}
          </Field>

          <Field label={t("agent.overview.fallbacks")}>
            {fallbacks.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {fallbacks.map((m) => (
                  <Badge key={m} variant="secondary">
                    {m}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
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
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-start gap-4">
      <span className="text-muted-foreground pt-1 text-xs tracking-wide uppercase">{label}</span>
      <div>{children}</div>
    </div>
  )
}
