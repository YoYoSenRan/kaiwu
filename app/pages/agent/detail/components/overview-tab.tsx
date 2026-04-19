import { Copy, Cpu, FolderOpen, Image, Palette, RefreshCw, Smile, User } from "lucide-react"
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
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{t("agent.overview.title", "Overview")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <section>
            <h3 className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-wide">
              {t("agent.overview.identity", "Identity")}
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <FieldItem icon={<User className="text-muted-foreground size-4 mt-0.5" />} label={t("agent.overview.name")}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{name ?? <Empty />}</span>
                  {isDefault && (
                    <Badge variant="secondary" className="font-normal">
                      {t("agent.detail.defaultBadge")}
                    </Badge>
                  )}
                </div>
              </FieldItem>

              <FieldItem icon={<Smile className="text-muted-foreground size-4 mt-0.5" />} label={t("agent.overview.emoji")}>
                <span className="text-sm font-medium">{emoji ?? <Empty />}</span>
              </FieldItem>

              <FieldItem icon={<Palette className="text-muted-foreground size-4 mt-0.5" />} label={t("agent.overview.theme")}>
                <span className="text-sm font-medium">{theme ?? <Empty />}</span>
              </FieldItem>

              <FieldItem icon={<Image className="text-muted-foreground size-4 mt-0.5" />} label={t("agent.overview.avatar")}>
                {avatar ? (
                  avatar.startsWith("http") ? (
                    <img src={avatar} alt="avatar" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="text-sm font-medium">{avatar}</span>
                  )
                ) : (
                  <Empty />
                )}
              </FieldItem>

              <FieldItem icon={<FolderOpen className="text-muted-foreground size-4 mt-0.5" />} label={t("agent.overview.workspace")}>
                {workspace ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{workspace}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copy(workspace, t("agent.overview.workspace"))}
                    >
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Empty />
                )}
              </FieldItem>
            </div>
          </section>

          <section>
            <h3 className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-wide">
              {t("agent.overview.configuration", "Configuration")}
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <FieldItem icon={<Cpu className="text-muted-foreground size-4 mt-0.5" />} label={t("agent.overview.primaryModel")}>
                {primary ? (
                  <Badge variant="secondary" className="font-normal">
                    {primary}
                  </Badge>
                ) : (
                  <Empty />
                )}
              </FieldItem>

              <FieldItem icon={<RefreshCw className="text-muted-foreground size-4 mt-0.5" />} label={t("agent.overview.fallbacks")}>
                {fallbacks.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {fallbacks.map((m) => (
                      <Badge key={m} variant="secondary" className="font-normal">
                        {m}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <Empty />
                )}
              </FieldItem>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  )
}

function FieldItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      {icon}
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground text-xs uppercase tracking-wide">{label}</div>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  )
}

function Empty() {
  return <span className="text-muted-foreground/60 text-sm">—</span>
}
